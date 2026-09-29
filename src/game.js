/**
 * Get Promoted! — game flow, board, economy, shop, item effects, bots, multiplayer (Phases 1-4).
 *
 * HOST-AUTHORITATIVE: the host's browser owns `state` and runs every rule (board, bots,
 * payouts, shop). Every player — host included — renders a `snap` (snapshot) of it and
 * sends actions via act(). Solo play is simply a host with no guests.
 *
 * Minigames: src/minigames.js. Transport: src/net.js. Rules and numbers: src/data-model.js.
 * Dev tips: ?day=10 for 10-second days; ?local=1 to test multiplayer with two browser tabs.
 */
const PARAMS = new URLSearchParams(location.search);
const DAY_SECONDS = +PARAMS.get("day") || 60;
const LAST_TASK_DAY = 4; // Day 5 (Projects) comes in Phase 5
const STIPEND = 25, SEATS = 4;
const BOT_NAMES = ["Taylor", "Morgan", "Riley"];
const COLORS = ["#378ADD", "#D85A30", "#639922", "#7F77DD"];
const TIER_BORDER = { common: "#b87333", uncommon: "#a8a9ad", rare: "#d4af37" }; // bronze / silver / gold
const NAMES = {
  staplerFrenzy: "📎 Stapler Frenzy", coverYourTracks: "🗑️ Cover Your Tracks", inboxZeroRush: "📧 Inbox Zero Rush",
  postItPanic: "📝 Post-it Panic", copierMeltdown: "📠 Copier Meltdown",
  perfectSend: "📨 Perfect Send", nailThePitch: "🎤 Nail the Pitch", holdTheLine: "☎️ Hold the Line", closingTheDeal: "🤝 Closing the Deal",
  quarterlyCrunch: "📊 Quarterly Crunch", clientCurveball: "🎯 Client Curveball",
};
const ITEM_INFO = {
  powerNetworking: ["Power Networking", "+10% pay on every task"],
  doubleEspresso: ["Double Espresso", "+15% speed bonus on every task"],
  itFastTrack: ["IT Fast-Track", "One extra retry on Medium tasks"],
  executiveAssistant: ["Executive Assistant", "Wider timing zones on Medium tasks"],
  legalPreApproval: ["Legal Pre-Approval", "Hard tasks drop a wrong answer"],
  hrWellnessStipend: ["HR Wellness Stipend", `+$${STIPEND} at the end of the day`],
  aiTokens: ["AI Tokens", "Your first 5 Easy tasks finish themselves at max pay"],
  bribeTheBoss: ["Bribe the Boss", "At least 2 Medium or Hard tasks on your board"],
  budgetFreeze: ["Budget Freeze", "Target earns 10% less"],
  printerJam: ["Printer Jam", "Target's speed bonus is capped at 1.1x"],
  replyAllReminder: ["Reply-All Reminder", "Target gets 20% less time per task"],
  itTicketBacklog: ["IT Ticket Backlog", "Target's Medium timing zones shrink"],
  slackGossip: ["Slack Gossip", "Gossip pop-ups pile up on the target's screen"],
  micromanagerWatching: ["Micromanager Watching", "Target's risky calls backfire more often"],
  performanceReview: ["Performance Review", "Target gets at least 2 Easy tasks on their board"],
  frozenPaycheck: ["Frozen Paycheck", "Target's first 1 or 2 tasks pay $0"],
};
const GOSSIP = ["Did you hear who got the corner office?", "Someone microwaved fish AGAIN", "Is the boss's nephew starting Monday??",
  "The CEO just replied-all 😬", "Who keeps taking the good stapler", "Layoff rumors in #random", "Free bagels in the break room!!"];

const app = document.getElementById("app");
// Everyone
let snap = null;   // the snapshot I render from
let player = null; // MY player inside snap (minigames read player.fx)
let myId = null, isHost = false, online = false;
let activeGame = null, startedTaskId = null, localEnd = 0;
let screenKey = "", nightStep = "summary", prevWallets = {}, gossipTimers = [];
// Host only
let state = null, dayEndsAt = 0, nextId = 1;

const money = (n) => "$" + n.toFixed(2);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const cleanName = (n) => (String(n || "").replace(/[^\w .'-]/g, "").trim().slice(0, 12) || "Player");
const rand = (a, b) => a + Math.random() * (b - a);
const isSabotage = (id) => SABOTAGES.some((s) => s.id === id);
const byId = (id) => state.players.find((p) => p.id === id); // host only
const colorOf = (id) => COLORS[snap.players.findIndex((p) => p.id === id)];
const newTask = (tier) => createTask({ id: nextId++, tier }); // flavor randomized in data-model

// ======================================================================================
// HOST: rules and state
// ======================================================================================

/** Everything affecting player p today: their own Boosts + Sabotages aimed at them. */
function fxFor(p) {
  const mine = new Set(p.activeToday.map((a) => a.id));
  const hits = new Set();
  state.players.forEach((o) => o.activeToday.forEach((a) => { if (a.targetId === p.id) hits.add(a.id); }));
  return {
    baseMul: (mine.has("powerNetworking") ? 1.1 : 1) * (hits.has("budgetFreeze") ? 0.9 : 1),
    speedMul: mine.has("doubleEspresso") ? 1.15 : 1,
    speedCap: hits.has("printerJam") ? 1.1 : 99,
    capMul: hits.has("replyAllReminder") ? 0.8 : 1,
    mediumBonus: mine.has("itFastTrack") ? 2 : 0, // one extra 2s sweep
    zoneScale: (mine.has("executiveAssistant") ? 1.35 : 1) * (hits.has("itTicketBacklog") ? 0.65 : 1),
    noWrong: mine.has("legalPreApproval"),
    stipend: mine.has("hrWellnessStipend") ? STIPEND : 0,
    aiTokens: mine.has("aiTokens"),
    bribe: mine.has("bribeTheBoss"),
    review: hits.has("performanceReview"),
    gossip: hits.has("slackGossip"),
    riskyWin: hits.has("micromanagerWatching") ? 0.3 : 0.5,
    frozen: hits.has("frozenPaycheck"),
  };
}

/** Apply a minigame result + item effects and bank the payout. Returns null on failure. */
function settle(p, task, r) {
  p.stats.riskyChoicesCount += r.risky || 0;
  if (!r.success) { p.stats.mistakesCount++; return null; }
  p.stats.mistakesCount += r.mistakes || 0;
  task.accuracy = r.accuracy;
  task.speed = Math.min(r.speed * p.fx.speedMul, p.fx.speedCap);
  task.state = "completed";
  task.baseValue *= p.fx.baseMul;
  const frozen = p.frozenLeft > 0;
  if (frozen) { p.frozenLeft--; task.baseValue = 0; }
  return { pay: applyTaskResult(p, task), frozen };
}

function report(p, out, task, note) {
  p.lastMsg = !out ? "Time's up. That task went back on the board."
    : out.frozen ? "🧊 Frozen paycheck. That one paid $0."
    : `+${money(out.pay)}, accuracy ${Math.round(task.accuracy * 100)}%, speed ${task.speed.toFixed(2)}x` + (note ? `. ${note}` : "");
}

/** Remove shared board slot i; it refills immediately. */
function takeTask(i) {
  const task = state.board[i];
  state.board[i] = newTask(rollTaskTier(state.day));
  return task;
}

/** Failed tasks go back into the shared pool for someone else. */
function returnToPool(task) {
  Object.assign(task, { state: "available", ownerId: null, accuracy: null, speed: null });
  state.board[Math.floor(Math.random() * 4)] = task;
}

/**
 * The board as player p sees it. Bribe the Boss / Performance Review swap some shared
 * slots for private tasks only p can see (everyone else still sees the shared task).
 */
function viewFor(p) {
  const view = state.board.map((t, i) => ({ t, i, priv: false }));
  const up = p.fx?.bribe && !p.fx?.review, down = p.fx?.review && !p.fx?.bribe;
  if (!up && !down) return view;
  const bad = (t) => (up ? t.tier === "easy" : t.tier !== "easy");
  let good = view.filter((e) => !bad(e.t)).length;
  for (const e of view) {
    if (good >= 2) break;
    if (!bad(e.t)) continue;
    let pt = p.priv[e.i];
    if (!pt || pt.coversId !== e.t.id) { // regenerate if the shared task underneath changed
      pt = newTask(up ? (Math.random() < 0.5 ? "medium" : "hard") : "easy");
      pt.coversId = e.t.id;
      p.priv[e.i] = pt;
    }
    Object.assign(e, { t: pt, priv: true });
    good++;
  }
  return view;
}

function fillBots() {
  let n = 0;
  while (state.players.length < SEATS) {
    const b = createPlayer({ id: "b" + n, name: BOT_NAMES[n] + " 🤖", isBot: true });
    b.ready = true;
    state.players.push(b);
    n++;
  }
}

function startDay(day) {
  state.day = day;
  state.phase = "task";
  const now = performance.now();
  state.players.forEach((p) => {
    p.fx = fxFor(p);
    p.frozenLeft = p.fx.frozen ? 1 + Math.floor(Math.random() * 2) : 0;
    p.aiLeft = p.fx.aiTokens ? 5 : 0;
    Object.assign(p, { currentTask: null, priv: {}, lastMsg: "" });
    if (p.isBot) p.bot = { nextAt: now + rand(600, 1400), current: null };
    p.activeToday.forEach((a) => { if (a.targetId) { p.stats.sabotagesUsed++; byId(a.targetId).stats.sabotagesReceived++; } });
  });
  // Day 1 opening board is guaranteed all-Easy; everything after follows day odds.
  state.board = [0, 1, 2, 3].map(() => newTask(day === 1 ? "easy" : rollTaskTier(day)));
  dayEndsAt = now + DAY_SECONDS * 1000;
  sync();
}

function endDay() {
  state.phase = "night";
  state.shop = {};
  state.players.forEach((p) => {
    p.currentTask = null;
    if (p.bot) p.bot.current = null;
    if (p.fx.stipend) { p.wallet += p.fx.stipend; p.careerEarnings += p.fx.stipend; }
  });
  state.players.forEach((p) => {
    if (p.isBot) { botShop(p); botCurate(p); p.ready = true; }
    else { p.ready = false; state.shop[p.id] = priced(drawShopCards(state.day)); }
  });
  sync();
}

function checkAllReady() {
  if (state.phase !== "night" || !state.players.every((p) => p.ready)) return;
  if (state.day < LAST_TASK_DAY) startDay(state.day + 1);
  else { state.phase = "end"; sync(); }
}

// ---- Actions (from any player, including the host) ------------------------------------
function hostAction(p, m) {
  if (!p || p.isBot) return;
  if (m.t === "claim") hostClaim(p, m.id);
  else if (m.t === "result") hostResult(p, m.taskId, m.r);
  else if (m.t === "buy") hostBuy(p, m.i);
  else if (m.t === "curate") hostCurate(p, m.picks);
  else if (m.t === "start" && p.id === myId && state.phase === "lobby") { fillBots(); return startDay(1); }
  else if (m.t === "again" && p.id === myId && state.phase === "end") return resetMatch();
  sync();
}

function hostClaim(p, taskId) {
  if (state.phase !== "task" || p.currentTask) return;
  const e = viewFor(p).find((x) => x.t.id === taskId);
  if (!e) return; // someone else grabbed it first
  const task = e.priv ? e.t : takeTask(e.i);
  if (e.priv) delete p.priv[e.i];
  Object.assign(task, { state: "inProgress", ownerId: p.id });
  if (task.tier === "easy" && p.aiLeft > 0) {
    p.aiLeft--;
    return report(p, settle(p, task, { success: true, accuracy: 1, speed: 1.5 }), task, `🤖 AI handled it (${p.aiLeft} left)`);
  }
  p.currentTask = task;
}

function hostResult(p, taskId, r) {
  const task = p.currentTask;
  if (!task || task.id !== taskId || !r) return;
  p.currentTask = null;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, +v || 0));
  const safe = { success: !!r.success, accuracy: clamp(r.accuracy, 0, 1.5), speed: clamp(r.speed, 0.5, 1.5),
    mistakes: clamp(r.mistakes, 0, 3), risky: clamp(r.risky, 0, 3), note: r.note ? String(r.note).slice(0, 80) : "" };
  const out = settle(p, task, safe);
  if (!out) returnToPool(task);
  report(p, out, task, safe.note);
}

function hostBuy(p, i) {
  const card = state.shop?.[p.id]?.[i];
  if (state.phase !== "night" || p.ready || !card || card.bought || p.wallet < card.price) return;
  buy(p, card);
  card.bought = true;
}

function hostCurate(p, picks) {
  if (state.phase !== "night" || p.ready || !Array.isArray(picks)) return;
  const seen = new Set(), rivals = state.players.filter((o) => o !== p).map((o) => o.id);
  p.activeToday = picks.filter((x) => p.inventory.includes(x.id) && !seen.has(x.id) && seen.add(x.id)).slice(0, 3)
    .map((x) => ({ id: x.id, targetId: isSabotage(x.id) ? (rivals.includes(x.targetId) ? x.targetId : rivals[0]) : undefined }));
  useUp(p);
  p.ready = true;
  checkAllReady();
}

function resetMatch() {
  const humans = state.players.filter((p) => !p.isBot).map((p) => createPlayer({ id: p.id, name: p.name }));
  state = Object.assign(createGameState({ hostPlayerId: myId, players: humans }), { phase: "lobby", code: state.code, shop: {} });
  if (!online) { fillBots(); return startDay(1); }
  sync();
}

// ---- Connections ------------------------------------------------------------------------
function onClientMessage(id, m) {
  if (m?.t === "hello") {
    if (state.phase !== "lobby" || state.players.length >= SEATS || byId(id)) return Net.sendTo(id, { t: "full" });
    state.players.push(createPlayer({ id, name: cleanName(m.name) }));
    return sync();
  }
  hostAction(byId(id), m || {});
}

/** A player dropped: in the lobby they just leave; mid-game a bot takes their seat. */
function onClientLeave(id) {
  const p = byId(id);
  if (!p) return;
  if (state.phase === "lobby") { state.players = state.players.filter((x) => x !== p); return sync(); }
  const wasReady = p.ready;
  Object.assign(p, { isBot: true, name: p.name + " 🤖", ready: true, bot: { nextAt: performance.now() + 500, current: null } });
  if (p.currentTask) { returnToPool(p.currentTask); p.currentTask = null; }
  if (state.phase === "night" && !wasReady) { botShop(p); botCurate(p); }
  sync();
  checkAllReady();
}

/** What player pid is allowed to see. Rivals' items, targets, and earnings stay secret. */
function snapshotFor(pid) {
  const me = byId(pid);
  return {
    day: state.day, phase: state.phase, code: state.code || null, hostId: myId,
    timeLeft: state.phase === "task" ? Math.max(0, (dayEndsAt - performance.now()) / 1000) : 0,
    view: state.phase === "task" ? viewFor(me).map((e) => e.t) : [],
    shop: state.shop?.[pid] || [],
    players: state.players.map((p) => p.id === pid
      ? { ...p, bot: undefined, priv: undefined }
      : { id: p.id, name: p.name, isBot: p.isBot, wallet: p.wallet, ready: p.ready }),
  };
}

/** Push fresh snapshots to every human (and re-render the host's own screen). */
function sync() {
  if (!isHost) return;
  state.players.forEach((p) => { if (!p.isBot && p.id !== myId) Net.sendTo(p.id, { t: "state", s: snapshotFor(p.id) }); });
  applySnapshot(JSON.parse(JSON.stringify(snapshotFor(myId))));
}

// ---- Bots ------------------------------------------------------------------------------------
// One bot type using the simulation-tested "Average" profile (see BALANCE-NOTES.md).
function botsTick() {
  const now = performance.now();
  let changed = false;
  state.players.forEach((b) => {
    if (!b.isBot || !b.bot) return;
    const s = b.bot;
    if (s.current) {
      if (now < s.current.doneAt) return;
      if (!settle(b, s.current.task, s.current.result)) returnToPool(s.current.task);
      s.current = null;
      s.nextAt = now + rand(400, 900); // decision time before the next grab
      changed = true;
    } else if (now >= s.nextAt) {
      const task = takeTask(botPick(b));
      Object.assign(task, { state: "inProgress", ownerId: b.id });
      const sim = simulateBot(b, task);
      s.current = { task, result: sim.result, doneAt: now + sim.secs * 1000 };
      changed = true;
    }
  });
  if (changed) sync();
}

function botPick(b) {
  const idx = [0, 1, 2, 3];
  const pref = b.fx.bribe ? idx.filter((i) => state.board[i].tier !== "easy") : idx;
  const pool = pref.length ? pref : idx;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** How long the bot takes and how well it does, with its item effects applied. */
function simulateBot(b, t) {
  const fx = b.fx, R = Math.random, rushed = fx.capMul < 1;
  const extra = fx.gossip ? 0.5 : 0;
  if (t.tier === "easy") {
    if (b.aiLeft > 0) { b.aiLeft--; return { secs: 0.4, result: { success: true, accuracy: 1, speed: 1.5 } }; }
    const cap = TASK_TIERS.easy.outerCapSeconds * fx.capMul, tt = rand(1.5, 3) + extra;
    if (R() < 0.05 || tt > cap) return { secs: Math.min(tt, cap), result: { success: false } };
    return { secs: tt, result: { success: true, accuracy: 1, speed: speedFromElapsed(tt, cap) } };
  }
  if (t.tier === "medium") {
    const r = R(), pass = r < 0.5 ? 1 : r < 0.85 ? 2 : 3;
    const failP = 0.1 + (rushed ? 0.1 : 0) - (fx.mediumBonus ? 0.05 : 0);
    const secs = pass * 2 + rand(-0.3, 0.3) + extra;
    if (R() < failP) return { secs, result: { success: false } };
    const perfP = Math.min(0.9, Math.max(0.1, 0.5 * fx.zoneScale));
    return { secs, result: { success: true, accuracy: R() < perfP ? 1 : 0.7, speed: speedFromPass(pass) } };
  }
  const cap = TASK_TIERS.hard.outerCapSeconds * fx.capMul, tt = rand(5, 7) + extra; // ~2.5-3.5s per question
  if (R() < 0.05 || tt > cap) return { secs: Math.min(tt, cap), result: { success: false } };
  let sum = 0, mistakes = 0, risky = 0;
  const Q = TASK_TIERS.hard.questionsPerChain;
  for (let k = 0; k < Q; k++) {
    const r = R();
    if (t.flavor === "quarterlyCrunch") {
      if (r < (fx.noWrong ? 0.85 : 0.7)) sum += 1; else mistakes++;
    } else if (r < 0.55) sum += 0.8;
    else if (r < 0.85) { risky++; sum += R() < fx.riskyWin ? 1.5 : 0.2; }
    else if (fx.noWrong) sum += 0.8;
    else mistakes++;
  }
  return { secs: tt, result: { success: true, accuracy: sum / Q, speed: speedFromElapsed(tt, cap), mistakes, risky } };
}

function botShop(b) {
  // Greedy: most expensive cards first, until it holds 3 items (only 3 can be active).
  priced(drawShopCards(state.day)).sort((x, y) => y.price - x.price).forEach((c) => {
    if (b.inventory.length < 3 && c.price <= b.wallet) buy(b, c);
  });
}

function botCurate(b) {
  const richest = state.players.filter((p) => p !== b).sort((x, y) => y.wallet - x.wallet)[0];
  b.activeToday = [...new Set(b.inventory)].sort(() => Math.random() - 0.5).slice(0, 3)
    .map((id) => ({ id, targetId: isSabotage(id) ? richest.id : undefined }));
  useUp(b);
}

// ---- Shop helpers ---------------------------------------------------------------------------
/** Items are consumable: each active item removes one copy from inventory. */
function useUp(p) {
  p.activeToday.forEach((a) => p.inventory.splice(p.inventory.indexOf(a.id), 1));
}

const priced = (cards) => cards.map((c) => {
  const t = ITEM_TIERS[c.tier];
  return { ...c, price: Math.round(rand(t.minPrice, t.maxPrice)) };
});

function buy(p, c) {
  p.wallet -= c.price;
  p.stats.walletSpent += c.price;
  p.inventory.push(c.id);
}

// ======================================================================================
// EVERYONE: connecting, sending actions, rendering snapshots
// ======================================================================================

/** Send an action to the host (or handle it directly if I am the host). */
function act(m) { isHost ? hostAction(byId(myId), m) : Net.toHost(m); }

function makeCode() {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L confusion
  return Array.from({ length: 6 }, () => A[Math.floor(Math.random() * A.length)]).join("");
}

async function startHosting(name, withNet) {
  isHost = true;
  myId = "host";
  online = withNet;
  state = Object.assign(createGameState({ hostPlayerId: myId, players: [createPlayer({ id: myId, name })] }),
    { phase: "lobby", code: null, shop: {} });
  if (!withNet) { fillBots(); return startDay(1); }
  renderStatus("Setting up your room…");
  for (let tries = 0; ; tries++) {
    const code = makeCode();
    try {
      await Net.host(code, { onMessage: onClientMessage, onLeave: onClientLeave });
      state.code = code;
      break;
    } catch (e) {
      if (e.type === "unavailable-id" && tries < 5) continue; // code already taken, roll another
      isHost = false;
      return renderMenu("Couldn't reach the matchmaking server. Check your internet and try again.");
    }
  }
  sync();
}

async function joinGame(name, code) {
  isHost = false;
  online = true;
  renderStatus("Connecting…");
  const fail = (msg) => { clearTimeout(timer); snap = null; renderMenu(msg); };
  const timer = setTimeout(() => { if (!snap) fail("Couldn't find that room. Check the code and try again."); }, 10000);
  try {
    myId = await Net.join(code, {
      onMessage: (m) => {
        if (m?.t === "state") { clearTimeout(timer); applySnapshot(m.s); }
        else if (m?.t === "full") fail("That game is full or already started.");
      },
      onClose: () => { if (snap) renderGone(); },
    });
    Net.toHost({ t: "hello", name });
  } catch (e) {
    fail(e.type === "peer-unavailable" ? "Couldn't find that room. Check the code and try again."
      : "Couldn't connect. Check your internet and try again.");
  }
}

function applySnapshot(s) {
  snap = s;
  player = s.players.find((p) => p.id === myId);
  if (s.phase === "task") localEnd = performance.now() + s.timeLeft * 1000;
  render();
}

function render() {
  if (!snap || !player) return;
  if (snap.phase !== "task") { cancelMinigame(); stopGossip(); }
  if (snap.phase === "lobby") renderLobby();
  else if (snap.phase === "task") renderDay();
  else if (snap.phase === "night") renderNight();
  else if (snap.phase === "end") renderEnd();
}

/** Countdown for everyone; the host also runs bots and ends the day. */
function tick() {
  if (snap?.phase === "task") {
    const left = Math.max(0, (localEnd - performance.now()) / 1000);
    const t = document.getElementById("timeLeft"), b = document.getElementById("timeBar");
    if (t) t.textContent = Math.ceil(left) + "s";
    if (b) b.style.width = (left / DAY_SECONDS) * 100 + "%";
  }
  if (isHost && state?.phase === "task") {
    botsTick();
    if (performance.now() >= dayEndsAt) endDay();
  }
}

// ---- Menu / lobby ------------------------------------------------------------------------------
function renderStatus(msg) {
  screenKey = "status";
  app.innerHTML = `<div class="card"><h2>Get Promoted!</h2><p>${esc(msg)}</p></div>`;
}

function renderMenu(err = "") {
  screenKey = "menu";
  const saved = localStorage.getItem("gp-name") || "";
  app.innerHTML = `<div class="card"><h1>Get Promoted!</h1>
    <p>Grab tasks from the boss, finish them fast, bank the cash. Spend it each night on boosts for you and sabotages for your coworkers.</p>
    <label class="muted" for="name">Your name</label>
    <input id="name" class="text" maxlength="12" value="${esc(saved)}" placeholder="Jordan">
    <div class="stack"><button class="big" id="solo">Play solo vs bots</button><button class="big" id="host">Host a game</button></div>
    <div class="join"><label class="muted" for="code">Have a room code?</label>
    <input id="code" class="text code-in" maxlength="6" placeholder="CORP84" autocapitalize="characters">
    <button class="big" id="join">Join</button></div>
    <p class="err">${esc(err)}</p>
    ${Net.local ? '<p class="muted">Local test mode: open a second tab with ?local=1 to join.</p>' : ""}</div>`;
  const name = () => { const n = cleanName(document.getElementById("name").value); localStorage.setItem("gp-name", n); return n; };
  document.getElementById("solo").onclick = () => startHosting(name(), false);
  document.getElementById("host").onclick = () => startHosting(name(), true);
  document.getElementById("join").onclick = () => {
    const code = document.getElementById("code").value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length !== 6) return (document.querySelector(".err").textContent = "Room codes are 6 characters.");
    joinGame(name(), code);
  };
}

function renderLobby() {
  screenKey = "lobby";
  const me = snap.hostId === myId;
  const seats = snap.players.map((p) => `<div class="chip"><span style="color:${colorOf(p.id)}">●</span> ${esc(p.name)}
    ${p.id === snap.hostId ? '<span class="muted">host</span>' : ""}${p.id === myId ? '<span class="muted">you</span>' : ""}</div>`).join("")
    + Array.from({ length: SEATS - snap.players.length }, () => `<div class="chip muted">Open seat (a bot fills it)</div>`).join("");
  app.innerHTML = `<div class="card"><h2>Lobby</h2>
    <p class="muted">Share this room code with your friends:</p>
    <div class="code-big">${esc(snap.code || "")}</div>
    ${me ? '<button class="small" id="copy">Copy code</button>' : ""}
    <div class="floor" style="margin:12px 0">${seats}</div>
    ${me ? '<button class="big" id="start">Start the week</button>' : '<p class="muted">Waiting for the host to start…</p>'}</div>`;
  if (me) {
    document.getElementById("copy").onclick = (e) => { navigator.clipboard?.writeText(snap.code); e.target.textContent = "Copied"; };
    document.getElementById("start").onclick = () => act({ t: "start" });
  }
}

function renderGone() {
  cancelMinigame();
  stopGossip();
  snap = null;
  screenKey = "gone";
  app.innerHTML = `<div class="card"><h2>The host left</h2><p>This game has ended.</p><button class="big" id="back">Back to menu</button></div>`;
  document.getElementById("back").onclick = () => location.reload();
}

// ---- Day screen --------------------------------------------------------------------------------
function renderDay() {
  const key = "task" + snap.day;
  if (screenKey !== key) {
    screenKey = key;
    const active = (player.activeToday || []).map((a) => ITEM_INFO[a.id][0]).join(", ");
    app.innerHTML = `<div class="card hud"><span>Day ${snap.day} of 5</span><span id="timeLeft">${DAY_SECONDS}s</span></div>
      <div class="timer"><div id="timeBar" style="width:100%"></div></div>
      <div class="floor" id="floor"></div>
      ${active ? `<div class="note-line">Active today: ${active}</div>` : ""}
      <div class="card"><b>Pick a task</b><div class="muted" id="msg"></div></div>
      <div class="board" id="board"></div>`;
    startedTaskId = null;
    if (player.fx?.gossip) startGossip();
  }
  updateFloor();
  document.getElementById("msg").textContent = player.lastMsg || "Faster and more accurate pays more. Coworkers are grabbing tasks too.";
  const board = document.getElementById("board");
  board.innerHTML = snap.view.map((t) => `<button class="task" data-id="${t.id}"><span class="shape ${t.tier}"></span>
    <b>${money(t.baseValue)}</b><br>${NAMES[t.flavor]}<br><span class="muted">${t.tier}</span></button>`).join("");
  board.querySelectorAll(".task").forEach((b) => (b.onclick = () => {
    if (!activeGame && !player.currentTask) act({ t: "claim", id: +b.dataset.id });
  }));
  maybeStartMinigame();
}

function updateFloor() {
  const el = document.getElementById("floor");
  if (!el) return;
  el.innerHTML = snap.players.map((p) => {
    const pop = prevWallets[p.id] !== undefined && prevWallets[p.id] !== p.wallet;
    prevWallets[p.id] = p.wallet;
    return `<div class="chip"><span style="color:${colorOf(p.id)}">●</span> ${esc(p.name)}${p.id === myId ? " (you)" : ""}
      <span class="${pop ? "pop" : ""}">💰${money(p.wallet)}</span></div>`;
  }).join("");
}

/** The host assigns a task to me by setting player.currentTask; I play it here. */
function maybeStartMinigame() {
  const t = player.currentTask;
  if (!t || activeGame || t.id === startedTaskId) return;
  startedTaskId = t.id;
  activeGame = MINIGAMES[t.flavor](t, (r) => {
    activeGame = null;
    closeOverlay();
    act({ t: "result", taskId: t.id, r });
  });
}

function cancelMinigame() {
  if (activeGame) { activeGame.cancel(); activeGame = null; }
  closeOverlay();
}

// ---- Night: summary → shop → loadout → ready up -----------------------------------------------------
function renderNight() {
  const key = "night" + snap.day;
  if (!screenKey.startsWith(key)) nightStep = "summary";
  if (player.ready) nightStep = "wait";
  const k = key + nightStep;
  if (screenKey === k && nightStep === "curate") return; // don't wipe checkbox choices on background updates
  screenKey = k;
  ({ summary: renderSummary, shop: renderShop, curate: renderCurate, wait: renderWait })[nightStep]();
}

const goStep = (s) => { nightStep = s; render(); };

function standings() {
  return `<div class="floor">` + [...snap.players].sort((a, b) => b.wallet - a.wallet)
    .map((p) => `<div class="chip"><span style="color:${colorOf(p.id)}">●</span> ${esc(p.name)} 💰${money(p.wallet)}</div>`).join("") + `</div>`;
}

function renderSummary() {
  const s = player.stats;
  app.innerHTML = `<div class="card"><h2>Day ${snap.day} done</h2>${standings()}
    <p>Your career earnings: <b>${money(player.careerEarnings)}</b><br>Tasks completed: ${s.tasksCompleted}<br>
    Mistakes: ${s.mistakesCount}<br>Risky calls: ${s.riskyChoicesCount}${player.fx?.stipend ? `<br>HR stipend: +$${STIPEND}` : ""}</p>
    <button class="big" id="next">Visit the supply closet</button></div>`;
  document.getElementById("next").onclick = () => goStep("shop");
}

function renderShop() {
  app.innerHTML = `<div class="card"><h2>Supply closet</h2>
    <p class="muted">Night ${snap.day}. You have <b>${money(player.wallet)}</b>. Items wait in your inventory until you use them. Each one works for one day, then it's gone.</p></div>
    <div class="shop">` + snap.shop.map((c, i) => {
      const [name, desc] = ITEM_INFO[c.id], afford = player.wallet >= c.price;
      const have = player.inventory.filter((x) => x === c.id).length;
      return `<div class="item-card" style="border-color:${TIER_BORDER[c.tier]}">
        <div class="muted">${isSabotage(c.id) ? "📉 Sabotage" : "📈 Boost"}, ${c.tier}</div><b>${name}</b>
        <div class="muted">${desc}</div>${have ? `<div class="muted">You have ${have}</div>` : ""}
        <button data-i="${i}" ${c.bought || !afford ? "disabled" : ""}>${c.bought ? "Bought" : (afford ? "Buy " : "Need ") + money(c.price)}</button></div>`;
    }).join("") + `</div><button class="big" id="done">Choose tomorrow's items</button>`;
  app.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => { b.disabled = true; act({ t: "buy", i: +b.dataset.i }); }));
  document.getElementById("done").onclick = () => goStep("curate");
}

function renderCurate() {
  const rivals = snap.players.filter((p) => p.id !== myId);
  const last = snap.day >= LAST_TASK_DAY;
  const rows = [...new Set(player.inventory)].map((id) => {
    const [name, desc] = ITEM_INFO[id], count = player.inventory.filter((x) => x === id).length;
    const target = isSabotage(id) ? `<select data-t="${id}" aria-label="Target">${rivals.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join("")}</select>` : "";
    return `<label class="email"><input type="checkbox" data-id="${id}"><span style="flex:1"><b>${name}</b>${count > 1 ? ` ×${count}` : ""}<br><span class="muted">${desc}</span></span>${target}</label>`;
  }).join("");
  app.innerHTML = `<div class="card"><h2>Tomorrow's loadout</h2>
    <p class="muted">Pick up to 3. They work all day, then they're used up. Sabotages need a target.</p>
    ${rows || '<p class="muted">Your inventory is empty. Earn more tomorrow and try the supply closet again.</p>'}
    <p id="err" class="err"></p>
    <button class="big" id="go">${last ? "Lock in for day 5" : "Ready up for day " + (snap.day + 1)}</button></div>`;
  const boxes = [...app.querySelectorAll("input[type=checkbox]")];
  boxes.forEach((b) => (b.onchange = () => {
    if (boxes.filter((x) => x.checked).length > 3) { b.checked = false; document.getElementById("err").textContent = "You can pick 3 at most."; }
  }));
  document.getElementById("go").onclick = () => {
    const picks = boxes.filter((b) => b.checked).map((b) => ({
      id: b.dataset.id,
      targetId: isSabotage(b.dataset.id) ? app.querySelector(`select[data-t="${b.dataset.id}"]`).value : undefined,
    }));
    goStep("wait");
    act({ t: "curate", picks });
  };
}

function renderWait() {
  const ready = snap.players.filter((p) => p.ready).length;
  app.innerHTML = `<div class="card"><h2>Day ${snap.day + 1} starting soon</h2>
    <p class="muted">${ready} of ${snap.players.length} ready</p>
    ${snap.players.map((p) => `<div class="ready-row"><span style="color:${colorOf(p.id)}">●</span>
      <span style="flex:1">${esc(p.name)}${p.id === myId ? " (you)" : ""}</span><span class="muted">${money(p.wallet)}</span>
      <span>${p.ready ? "✅" : "⏳"}</span></div>`).join("")}</div>`;
}

function renderEnd() {
  screenKey = "end";
  const loadout = (player.activeToday || []).map((a) => ITEM_INFO[a.id][0]
    + (a.targetId ? ` → ${esc(snap.players.find((p) => p.id === a.targetId)?.name || "")}` : "")).join(", ") || "nothing";
  const me = snap.hostId === myId;
  app.innerHTML = `<div class="card"><h2>Friday is coming</h2>${standings()}
    <p>Your Day 5 loadout: <b>${loadout}</b></p>
    <p class="muted">Day 5 Projects and the Boardroom arrive in Phases 5 and 6.</p>
    ${me ? '<button class="big" id="again">Play again</button>' : '<p class="muted">Waiting for the host…</p>'}</div>`;
  if (me) document.getElementById("again").onclick = () => act({ t: "again" });
}

// ---- Slack Gossip (only shows on the target's screen; bots just lose a little time) ------------------
function startGossip() {
  stopGossip();
  gossipTimers.push(setTimeout(popGossip, 3000), setInterval(popGossip, 9000));
}
function popGossip() {
  if (document.querySelectorAll(".gossip").length >= 25) return;
  const g = document.createElement("div");
  g.className = "gossip";
  g.style.left = rand(0, 55) + "%";
  g.style.top = rand(5, 75) + "%";
  g.innerHTML = `<button aria-label="Dismiss">×</button><b>💬 #random</b><br>${GOSSIP[Math.floor(Math.random() * GOSSIP.length)]}`;
  g.querySelector("button").onclick = () => g.remove();
  document.body.appendChild(g);
  // Ignored pop-ups multiply every 4 seconds.
  const grow = () => { if (g.isConnected) { popGossip(); gossipTimers.push(setTimeout(grow, 4000)); } };
  gossipTimers.push(setTimeout(grow, 4000));
}
function stopGossip() {
  gossipTimers.forEach((t) => { clearTimeout(t); clearInterval(t); });
  gossipTimers = [];
  document.querySelectorAll(".gossip").forEach((g) => g.remove());
}

setInterval(tick, 100);
renderMenu();
