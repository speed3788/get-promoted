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

const Net = (() => {
  const local = new URLSearchParams(location.search).has("local");
  const conns = {}; // host: clientId -> PeerJS connection
  let peer = null, hostConn = null, chan = null, myId = null;

  async function iceConfig() {
    const iceServers = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
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
  async function hostPeer(code, h) {
    if (typeof Peer === "undefined") throw Object.assign(new Error("PeerJS failed to load"), { type: "offline" });
    const config = await iceConfig();
    return new Promise((resolve, reject) => {
      peer = new Peer(ROOM_PREFIX + code, { config });
      peer.on("open", () => resolve());
      peer.on("error", reject);
      peer.on("connection", (c) => {
        c.on("open", () => { conns[c.peer] = c; });
        c.on("data", (m) => h.onMessage(c.peer, m));
        c.on("close", () => { delete conns[c.peer]; h.onLeave(c.peer); });
      });
    });
  }

  async function joinPeer(code, h) {
    if (typeof Peer === "undefined") throw Object.assign(new Error("PeerJS failed to load"), { type: "offline" });
    const config = await iceConfig();
    return new Promise((resolve, reject) => {
      peer = new Peer({ config });
      peer.on("error", reject);
      peer.on("open", (id) => {
        myId = id;
        const c = peer.connect(ROOM_PREFIX + code, { reliable: true });
        c.on("open", () => { hostConn = c; resolve(id); });
        c.on("data", h.onMessage);
        c.on("close", h.onClose);
      });
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
    host: (code, h) => (local ? hostLocal : hostPeer)(code, h),
    join: (code, h) => (local ? joinLocal : joinPeer)(code, h),
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
