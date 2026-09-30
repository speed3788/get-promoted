/**
 * Get Promoted! — networking transport. One interface, two backends:
 *   - PeerJS: real play over the internet (default)
 *   - BroadcastChannel: dev testing with two tabs of the same browser (add ?local=1)
 * The game only calls Net.host / Net.join / Net.sendTo / Net.toHost.
 */

// Optional TURN relay for friends on strict networks (school/work wifi, some carriers).
// Free: sign up at https://dashboard.metered.ca/signup (Open Relay, 20 GB/month), create an
// app, then paste the app name and its API key here. Leave blank to use direct connections only.
const METERED_APP = ""; // e.g. "getpromoted" for getpromoted.metered.live
const METERED_API_KEY = "";

const ROOM_PREFIX = "getpromoted-v1-";

// Matchmaking (signalling) servers, tried in order. These only swap room codes for
// connection details — once two players connect, game traffic is peer-to-peer and never
// touches them. The free public PeerJS server is well known for going down / being slow
// from some regions, so we retry and then fall back to other public PeerServer instances.
// To run your own (most reliable): https://github.com/peers/peerjs-server
const SIGNAL_SERVERS = [
  {},                                                                // PeerJS cloud (default)
  { host: "peerjs.92k.de", port: 443, secure: true, path: "/" },      // community mirror
  { host: "0.peerjs.com", port: 443, secure: true, path: "/" },       // explicit cloud host
];
const ATTEMPT_TIMEOUT = 7000; // give each server this long before moving on

const Net = (() => {
  const local = new URLSearchParams(location.search).has("local");
  const conns = {}; // host: clientId -> PeerJS connection
  let peer = null, hostConn = null, chan = null, myId = null;

  async function iceConfig() {
    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ];
    if (METERED_APP && METERED_API_KEY) {
      try {
        const r = await fetch(`https://${METERED_APP}.metered.live/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`);
        iceServers.push(...(await r.json()));
      } catch (e) {
        console.warn("TURN credentials failed to load; using direct connections only.", e);
      }
    }
    return { iceServers };
  }

  // ---- PeerJS ----
  /** Try to open a Peer against one signalling server, with a hard timeout. */
  function tryPeer(peerId, opts, config) {
    return new Promise((resolve, reject) => {
      let done = false;
      const p = peerId ? new Peer(peerId, { ...opts, config }) : new Peer({ ...opts, config });
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        try { p.destroy(); } catch {}
        reject(Object.assign(new Error("timeout"), { type: "network" }));
      }, ATTEMPT_TIMEOUT);
      p.on("open", (id) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ peer: p, id });
      });
      p.on("error", (e) => {
        if (done) return;
        // "unavailable-id" and "peer-unavailable" are real answers, not server failures
        if (e.type === "unavailable-id" || e.type === "peer-unavailable") {
          done = true;
          clearTimeout(timer);
          try { p.destroy(); } catch {}
          return reject(e);
        }
        done = true;
        clearTimeout(timer);
        try { p.destroy(); } catch {}
        reject(e);
      });
    });
  }

  /** Walk the server list until one answers. Throws the last error if none do. */
  async function openPeer(peerId, config, onProgress) {
    let lastErr;
    for (let i = 0; i < SIGNAL_SERVERS.length; i++) {
      try {
        onProgress && onProgress(i);
        return await tryPeer(peerId, SIGNAL_SERVERS[i], config);
      } catch (e) {
        lastErr = e;
        if (e.type === "unavailable-id" || e.type === "peer-unavailable") throw e; // not a server problem
      }
    }
    throw lastErr || Object.assign(new Error("no signalling server"), { type: "network" });
  }

  async function hostPeer(code, h, onProgress) {
    if (typeof Peer === "undefined") throw Object.assign(new Error("PeerJS failed to load"), { type: "offline" });
    const config = await iceConfig();
    const { peer: p } = await openPeer(ROOM_PREFIX + code, config, onProgress);
    peer = p;
    peer.on("connection", (c) => {
      c.on("open", () => { conns[c.peer] = c; });
      c.on("data", (m) => h.onMessage(c.peer, m));
      c.on("close", () => { delete conns[c.peer]; h.onLeave(c.peer); });
    });
    // If the signalling server drops later, the game keeps running; try to get it back
    // so new players can still join (existing peer connections are unaffected).
    peer.on("disconnected", () => { try { peer.reconnect(); } catch {} });
  }

  async function joinPeer(code, h, onProgress) {
    if (typeof Peer === "undefined") throw Object.assign(new Error("PeerJS failed to load"), { type: "offline" });
    const config = await iceConfig();
    const { peer: p, id } = await openPeer(null, config, onProgress);
    peer = p;
    myId = id;
    return new Promise((resolve, reject) => {
      const c = peer.connect(ROOM_PREFIX + code, { reliable: true });
      const timer = setTimeout(() => reject(Object.assign(new Error("room timeout"), { type: "peer-unavailable" })), ATTEMPT_TIMEOUT);
      c.on("open", () => { clearTimeout(timer); hostConn = c; resolve(id); });
      c.on("data", h.onMessage);
      c.on("close", h.onClose);
      peer.on("error", (e) => { clearTimeout(timer); reject(e); });
    });
  }

  // ---- BroadcastChannel (local testing) ----
  function hostLocal(code, h) {
    chan = new BroadcastChannel(ROOM_PREFIX + code);
    chan.onmessage = ({ data: d }) => {
      if (d.to !== "host") return;
      if (d.kind === "bye") h.onLeave(d.from);
      else h.onMessage(d.from, d.msg);
    };
    addEventListener("beforeunload", () => chan.postMessage({ to: "*", kind: "closed" }));
    return Promise.resolve();
  }

  function joinLocal(code, h) {
    myId = "c" + Math.random().toString(36).slice(2, 8);
    chan = new BroadcastChannel(ROOM_PREFIX + code);
    chan.onmessage = ({ data: d }) => {
      if (d.to === myId) h.onMessage(d.msg);
      else if (d.to === "*" && d.kind === "closed") h.onClose();
    };
    addEventListener("beforeunload", () => chan.postMessage({ from: myId, to: "host", kind: "bye" }));
    return Promise.resolve(myId);
  }

  return {
    local,
    host: (code, h, onProgress) => (local ? hostLocal : hostPeer)(code, h, onProgress),
    join: (code, h, onProgress) => (local ? joinLocal : joinPeer)(code, h, onProgress),
    sendTo(id, msg) {
      if (local) chan.postMessage({ to: id, msg });
      else if (conns[id]?.open) conns[id].send(msg);
    },
    toHost(msg) {
      if (local) chan.postMessage({ from: myId, to: "host", msg });
      else hostConn?.send(msg);
    },
  };
})();
