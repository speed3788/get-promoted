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
const DEV_DAY = +PARAMS.get("day") || 0; // dev only: force every day's length (e.g. ?day=10)
const DEV_ZERO_DELAY = !!DEV_DAY; // skip the Day 1 countdown in dev mode
// Host-chosen pace for Days 1-4 (named as a pace, not a difficulty). Day 5 is always 60s.
const PACES = { frantic: ["🐇 Frantic", 60], standard: ["🚶 Standard", 90], relaxed: ["☕ Relaxed", 120] };
const PROJECT_SECONDS = DEV_DAY || 60;
const taskDaySeconds = () => DEV_DAY || PACES[state?.pace || "frantic"][1];
const LAST_TASK_DAY = 4; // Day 5 (Projects) comes in Phase 5
const STIPEND = 25, SEATS = 4;
const PROJECT_TIERS = ["medium", "medium", "hard", "hard"], INTRO_SECONDS = 4;
const BOT_NAMES = ["Taylor", "Morgan", "Riley"];
const COLORS = ["#378ADD", "#D85A30", "#639922", "#7F77DD"];
const TIER_BORDER = { common: "#8d8f98", uncommon: "#2e9e4f", rare: "#2f7fd4" }; // grey / green / blue
const NAMES = {
  staplerFrenzy: "📎 Stapler Frenzy", coverYourTracks: "🗑️ Cover Your Tracks", inboxZeroRush: "📧 Inbox Zero Rush",
  postItPanic: "📝 Post-it Panic", copierMeltdown: "📠 Copier Meltdown",
  hitTheQuota: "📊 Hit the Quota", budgetPie: "🥧 Budget Pie", trendLine: "📈 Trend Line",
  quarterlyCrunch: "🧮 Quarterly Crunch", clientCurveball: "🎯 Client Curveball",
};
const PENALTY_MSG = { boss: "👔 The Boss wants a 1 on 1 with you.", hr: "🧑‍💼 HR wants a chat." };
const ITEM_INFO = {
  powerNetworking: ["Power Networking", "+10% pay on every task — for every task you do today"],
  doubleEspresso: ["Double Espresso", "Finish tasks 15% faster"],
  itFastTrack: ["IT Fast-Track", "+2 seconds on every Medium task"],
  executiveAssistant: ["Executive Assistant", "Easier to hit the target on chart tasks"],
  legalPreApproval: ["Legal Pre-Approval", "Question games drop one wrong answer"],
  hrWellnessStipend: ["HR Wellness Stipend", `+$${STIPEND} at the end of the day`],
  overtime: ["Overtime", "Play one bonus task tonight while everyone shops"],
  aiTokens: ["AI Tokens", "Your first 5 Easy tasks finish themselves at max pay"],
  bribeTheBoss: ["Bribe the Boss", "At least 2 Medium or Hard tasks on your board"],
  bribeHR: ["Bribe HR", "Sabotages can't touch you tomorrow"],
  delivery: ["You Have a Delivery", "2x a day, their board locks 3-5s while they grab a package"],
  printerJammed: ["Printer's Jammed Again", "2x a day, they tap Unjam 6 times before their next task"],
  passwordExpired: ["Password Expired", "2x a day, they type a new PIN before their board unlocks"],
  surpriseMeeting: ["Surprise Meeting", "Once a day, a 5s \"quick sync\" locks their board"],
  slackGossip: ["Slack Gossip", "Pop-ups that double every 5s if ignored"],
  chattyCoworker: ["Chatty Coworker", "3x a day, a coworker won't stop messaging until they pick the right reply"],
  smokeBreak: ["Smoke Break", "They and one random coworker get stuck outside for 5s"],
  performanceReview: ["Performance Review", "Easy tasks only for their first 30s, under a red banner"],
  frozenPaycheck: ["Frozen Paycheck", "Their first 1-2 tasks pay $0 (SABOTAGED!)"],
};
const ACCOLADE_INFO = {
  overtimeGrinder: ["Overtime Grinder", "Most tasks completed"],
  speedDemon: ["Speed Demon", "Fastest average speed"],
  silentAssassin: ["Silent Assassin", "Sent the most sabotages"],
  bigSpender: ["Big Spender", "Spent the most in the supply closet"],
  perfectionist: ["Perfectionist", "Highest average accuracy"],
  biggestGambler: ["Biggest Gambler", "Made the most risky calls"],
  bossMeetings: ["Most 1-on-1s with the Boss", "Called into the office the most (a pity bonus)"],
  mostSabotaged: ["Most Sabotaged", "Hit by the most sabotages (a sympathy bonus)"],
};
// Cubicle regions on assets/office-full.jpg as % of the image: [left, top, width, height].
// Seat order matches player order: top-left, top-right, bottom-left, bottom-right.
const SEAT_BOX = [[1.5, 33.5, 45.5, 27], [53.5, 33.5, 45, 27], [1.5, 61.5, 45.5, 28.5], [53.5, 61.5, 45, 28.5]];
const SLIDE_SECONDS = 4.5; // Boardroom: time per reveal slide

const app = document.getElementById("app");
// Everyone
let snap = null;   // the snapshot I render from
let player = null; // MY player inside snap (minigames read player.fx)
let myId = null, isHost = false, online = false;
let activeGame = null, startedTaskId = null, localEnd = 0, localIntroEnd = 0, localLockEnd = 0, localCountdownEnd = 0, lockTimer = null;
let screenKey = "", nightStep = "summary", prevWallets = {}, localReviewEnd = 0;
// Host only
let state = null, dayEndsAt = 0, nextId = 1, introEndsAt = 0, projectsStart = 0, dayStartAt = 0, intSeq = 0;

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

/**
 * Everything affecting player p today: their own Boosts + Sabotages aimed at them
 * (directly or via "👥 Everyone else"). Bribe HR blocks every incoming sabotage.
 */
function fxFor(p) {
  const mine = new Set(p.activeToday.map((a) => a.id));
  const hits = {};
  let blocked = 0;
  state.players.forEach((o) => {
    if (o === p) return;
    o.activeToday.forEach((a) => {
      if (!isSabotage(a.id) || !(a.targetId === p.id || a.targetId === "*")) return;
      if (mine.has("bribeHR")) { blocked++; return; }
      hits[a.id] = (hits[a.id] || 0) + 1;
    });
  });
  const has = (id) => !!hits[id];
  return {
    baseMul: mine.has("powerNetworking") ? 1.1 : 1,
    speedMul: mine.has("doubleEspresso") ? 1.15 : 1,
    speedCap: 99,
    capMul: 1,
    mediumBonus: mine.has("itFastTrack") ? 2 : 0, // +2s on Medium tasks
    zoneScale: mine.has("executiveAssistant") ? 1.35 : 1, // wider chart bands
    noWrong: mine.has("legalPreApproval"),
    stipend: mine.has("hrWellnessStipend") ? STIPEND : 0,
    aiTokens: mine.has("aiTokens"),
    bribe: mine.has("bribeTheBoss"),
    overtime: mine.has("overtime"),
    riskyWin: 0.5,
    review: has("performanceReview"),
    gossip: has("slackGossip"),
    chatty: has("chattyCoworker"),
    frozen: has("frozenPaycheck"),
    delivery: has("delivery"),
    printer: has("printerJammed"),
    password: has("passwordExpired"),
    meeting: has("surpriseMeeting"),
    blocked,
  };
}

/** Everyone sees a censored cuss over this player's cubicle (picked here so all screens match). */
function failed(p) {
  p.failSeq = (p.failSeq || 0) + 1;
  p.failWord = pick(FAIL_WORDS);
}

/** Non-money boosts that helped on this task (shown under the floating +$X). */
function boostLabels(p, task, r) {
  const l = [];
  if (r.ai) l.push("🤖 AI Tokens");
  if (p.fx.noWrong && ["quarterlyCrunch", "clientCurveball"].includes(task.flavor)) l.push("⚖️ Legal Pre-Approval");
  if (p.fx.zoneScale > 1 && ["hitTheQuota", "budgetPie", "trendLine"].includes(task.flavor)) l.push("🗂️ Executive Assistant");
  if (p.fx.mediumBonus && task.tier === "medium") l.push("⏱️ IT Fast-Track");
  return l;
}

/** Sabotage stats for the accolades ("👥 Everyone else" counts once per victim). */
function countSabotages(p) {
  p.activeToday.forEach((a) => {
    if (!a.targetId) return;
    p.stats.sabotagesUsed++;
    state.players.forEach((o) => { if (o !== p && (a.targetId === "*" || a.targetId === o.id)) o.stats.sabotagesReceived++; });
  });
}

/** Tell Bribe HR holders how many sabotages bounced off them. */
function bribeNotice(p) {
  if (p.fx.blocked) p.lastMsg = `🤝 They bribed the right people: ${p.fx.blocked} sabotage${p.fx.blocked > 1 ? "s" : ""} blocked.`;
}

// ---- Interruption scheduler: plans each sabotage's events for the day, fires them on time ----
function planInterruptions(dayLen) {
  const at = () => rand(4, Math.max(6, dayLen - 8));
  state.players.forEach((p) => {
    p.events = [];
    p.interrupt = null;
    const f = p.fx;
    if (f.delivery) p.events.push({ at: at(), kind: "delivery", dur: rand(3, 5) }, { at: at(), kind: "delivery", dur: rand(3, 5) });
    if (f.printer) p.events.push({ at: at(), kind: "printer" }, { at: at(), kind: "printer" });
    if (f.password) p.events.push({ at: at(), kind: "password" }, { at: at(), kind: "password" });
    if (f.meeting) p.events.push({ at: at(), kind: "meeting", dur: 5 });
    if (f.chatty) for (let i = 0; i < 3; i++) p.events.push({ at: at(), kind: "chatty" });
  });
  // Smoke Break: the target + one random coworker (never the sender), stuck outside together.
  const bribed = (x) => x.activeToday.some((a) => a.id === "bribeHR");
  state.players.forEach((o) => o.activeToday.forEach((a) => {
    const target = a.id === "smokeBreak" && byId(a.targetId);
    if (!target || bribed(target)) return;
    const partner = pick(state.players.filter((x) => x !== o && x !== target && !bribed(x)));
    const t = at();
    target.events.push({ at: t, kind: "smoke", dur: 5, with: partner?.name });
    if (partner) partner.events.push({ at: t, kind: "smoke", dur: 5, with: target.name });
  }));
  state.players.forEach((p) => p.events.sort((x, y) => x.at - y.at));
  dayStartAt = performance.now();
}

function interruptsTick() {
  const now = performance.now(), el = (now - dayStartAt) / 1000;
  let changed = false;
  state.players.forEach((p) => {
    if (p.interrupt?.until && now >= p.interrupt.until) { p.interrupt = null; changed = true; }
    const ev = p.events?.[0];
    if (!ev || ev.at > el || p.interrupt) return;
    const busy = state.phase === "task" && (p.currentTask || p.bot?.current);
    if (busy && ev.kind !== "chatty" && ev.kind !== "smoke") return; // waits until the current task is done
    p.events.shift();
    changed = true;
    if (p.isBot) { // bots just lose the time
      const lost = ({ delivery: ev.dur, meeting: 5, smoke: 5, printer: 2.5, password: 3, chatty: 2 }[ev.kind] || 3) * 1000;
      if (p.bot?.current) p.bot.current.doneAt += lost; else if (p.bot) p.bot.nextAt = Math.max(p.bot.nextAt || 0, now) + lost;
      return;
    }
    if (ev.kind === "chatty") { p.chatSeq = (p.chatSeq || 0) + 1; return; }
    p.interrupt = { id: ++intSeq, kind: ev.kind, with: ev.with, until: now + (ev.dur || 20) * 1000,
      timed: !!ev.dur, pin: ev.kind === "password" ? String(rint(1000, 9999)) : undefined };
  });
  if (changed) sync();
}

/** Apply a minigame result + item effects and bank the payout. Returns null on failure. */
function settle(p, task, r) {
  p.stats.riskyChoicesCount += r.risky || 0;
  if (!r.success) { p.stats.mistakesCount++; failed(p); return null; }
  p.stats.mistakesCount += r.mistakes || 0;
  if (r.penalty) failed(p);
  if (r.penalty) { // Boss/HR penalty: the whole task pays $0 and the player is locked out
    p.stats.lockouts = (p.stats.lockouts || 0) + 1;
    p.lockUntil = performance.now() + LOCKOUT_SECONDS * 1000;
    p.lockKind = r.penalty;
    task.state = "completed";
    return { pay: 0, penalty: r.penalty };
  }
  const plain = Math.round(task.baseValue * r.accuracy * Math.min(r.speed, p.fx.speedCap) * 10) / 10; // pay with no boosts
  task.accuracy = r.accuracy;
  task.speed = Math.min(r.speed * p.fx.speedMul, p.fx.speedCap);
  task.state = "completed";
  task.baseValue *= p.fx.baseMul;
  const frozen = p.frozenLeft > 0;
  if (frozen) { p.frozenLeft--; task.baseValue = 0; p.flashSeq = (p.flashSeq || 0) + 1; } // big red SABOTAGED! stamp
  const pay = applyTaskResult(p, task), labels = boostLabels(p, task, r);
  if (!frozen && (pay - plain > 0.049 || labels.length)) { // floating +$X: only the boost's extra money
    p.bonusSeq = (p.bonusSeq || 0) + 1;
    p.bonus = { amt: Math.max(0, Math.round((pay - plain) * 10) / 10), labels };
  }
  return { pay, frozen };
}

function report(p, out, task, note) {
  p.lastMsg = !out ? "Time's up. That task went back on the board."
    : out.penalty ? (note || `${PENALTY_MSG[out.penalty]} $0 for that one.`)
    : out.frozen ? "🧊 Frozen paycheck. That one paid $0."
    : `+${money(out.pay)}, accuracy ${Math.round(task.accuracy * 100)}%, speed ${task.speed.toFixed(2)}x` + (note ? `. ${note}` : "");
}

/** Remove shared board slot i; it refills immediately. */
function takeTask(i) {
  // Leave the task in its slot (marked inProgress by the caller) so every player can see
  // who grabbed it. The slot refills in refillSlot() once the task is finished/failed.
  return state.board[i];
}

/** Replace a finished/failed task's board slot with a fresh one. */
function refillSlot(task) {
  const i = state.board.findIndex((t) => t && t.id === task.id);
  if (i >= 0) state.board[i] = newTask(rollTaskTier(state.day));
}

/** Failed tasks go back into the shared pool for someone else. */
function returnToPool(task) {
  // Used when a player disconnects mid-task: free the task back up in its own slot.
  Object.assign(task, { state: "available", ownerId: null, accuracy: null, speed: null });
}

/**
 * The board as player p sees it. Bribe the Boss / Performance Review swap some shared
 * slots for private tasks only p can see (everyone else still sees the shared task).
 */
function viewFor(p) {
  const view = state.board.map((t, i) => ({ t, i, priv: false }));
  const reviewing = p.fx?.review && state.phase === "task" && performance.now() - dayStartAt < 30000;
  const up = p.fx?.bribe && !reviewing, down = reviewing; // Performance Review wins while it lasts
  if (!up && !down) return view;
  const bad = (t) => (up ? t.tier === "easy" : t.tier !== "easy");
  let good = view.filter((e) => !bad(e.t)).length;
  const need = down ? 4 : 2; // review: ALL 4 slots Easy; Bribe the Boss: at least 2 Medium/Hard
  for (const e of view) {
    if (good >= need) break;
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
  if (!DEV_ZERO_DELAY && day === 1) {
    state.day = 1;
    state.phase = "countdown";
    state.countdownEndsAt = performance.now() + 3000;
    sync();
    setTimeout(() => { if (state.phase === "countdown") doStartDay(1); }, 3100);
    return;
  }
  doStartDay(day);
}
function doStartDay(day) {
  state.day = day;
  state.phase = "task";
  const now = performance.now();
  state.players.forEach((p) => {
    p.fx = fxFor(p);
    p.frozenLeft = p.fx.frozen ? 1 + Math.floor(Math.random() * 2) : 0;
    p.aiLeft = p.fx.aiTokens ? 5 : 0;
    Object.assign(p, { currentTask: null, priv: {}, lastMsg: "" });
    if (p.isBot) p.bot = { nextAt: now + rand(600, 1400), current: null };
    countSabotages(p);
    bribeNotice(p);
  });
  planInterruptions(taskDaySeconds());
  // Day 1 opening board is guaranteed all-Easy; everything after follows day odds.
  state.board = [0, 1, 2, 3].map(() => newTask(day === 1 ? "easy" : rollTaskTier(day)));
  dayEndsAt = now + taskDaySeconds() * 1000;
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
    p.interrupt = null;
    p.lockUntil = 0; // clear leftover penalty lockout from the previous day on the host
    if (p.fx.overtime) { // ⏰ Overtime: one more task (random Easy or Medium) while everyone shops
      const t = Object.assign(newTask(Math.random() < 0.5 ? "easy" : "medium"), { state: "inProgress", ownerId: p.id, overtime: true });
      if (p.isBot) { const sim = simulateBot(p, t); report(p, settle(p, t, sim.result), t, "⏰ Overtime"); }
      else p.currentTask = t;
    }
    if (p.isBot) { botShop(p); botCurate(p); p.ready = true; }
    else { p.ready = false; state.shop[p.id] = priced(drawShopCards(state.day)); }
  });
  sync();
}

function checkAllReady() {
  if (state.phase !== "night" || !state.players.every((p) => p.ready)) return;
  if (state.day < LAST_TASK_DAY) startDay(state.day + 1);
  else startProjects();
}

// ---- Day 5: Projects -----------------------------------------------------------------------
// Everyone gets the SAME 4 tasks in the same order and races through them. Finish all 4 and
// earn +1% per second saved (under the day's time budget) on the 4 projects' total.

function startProjects() {
  state.day = 5;
  state.phase = "projectsIntro";
  state.players.forEach((p) => {
    p.fx = fxFor(p); // Bribe the Boss / Performance Review have no board to act on today
    p.frozenLeft = p.fx.frozen ? 1 + Math.floor(Math.random() * 2) : 0;
    p.aiLeft = 0; // AI Tokens only work on Easy tasks; there are none today
    Object.assign(p, { currentTask: null, lastMsg: "", proj: { k: 0, pays: [], done: false, bonus: 0, saved: 0 } });
    if (p.isBot) p.bot = { current: null };
    countSabotages(p);
    bribeNotice(p);
  });
  state.projects = PROJECT_TIERS.map((tier) => {
    const t = newTask(tier);
    return { tier: t.tier, flavor: t.flavor, baseValue: t.baseValue, workload: t.workload, cap: t.cap, penalty: t.penalty };
  });
  introEndsAt = performance.now() + INTRO_SECONDS * 1000;
  sync();
}

function beginProjects() {
  state.phase = "projects";
  projectsStart = performance.now();
  planInterruptions(PROJECT_SECONDS); // Day 5 interruptions start when the race does
  dayEndsAt = projectsStart + PROJECT_SECONDS * 1000;
  state.players.forEach((p) => { if (!p.isBot) p.currentTask = projectTask(p); });
  sync();
}

/** A fresh copy of player p's current project (same task and pay for everyone). */
function projectTask(p) {
  return { ...state.projects[p.proj.k], id: "p" + p.proj.k + "-" + p.id, project: p.proj.k,
    state: "inProgress", ownerId: p.id, accuracy: null, speed: null, payout: null };
}

function projectDone(p, out, task, note) {
  p.proj.pays.push(out ? out.pay : 0);
  p.lastMsg = !out ? "Project failed. No pay for that one."
    : out.penalty ? `${PENALTY_MSG[out.penalty]} $0 on project ${task.project + 1}.`
    : out.frozen ? "🧊 Frozen paycheck. That one paid $0."
    : `+${money(out.pay)} on project ${task.project + 1}` + (note ? `. ${note}` : "");
  p.currentTask = null;
  p.proj.k++;
  if (p.proj.k >= PROJECT_TIERS.length) finishProjects(p);
  else if (!p.isBot) p.currentTask = projectTask(p);
}

function finishProjects(p) {
  const pr = p.proj, total = pr.pays.reduce((a, b) => a + b, 0);
  const secs = (performance.now() - projectsStart) / 1000;
  pr.done = true;
  pr.saved = Math.max(0, Math.floor(PROJECT_SECONDS - secs));
  pr.bonus = (total * pr.saved) / 100;
  p.wallet += pr.bonus;
  p.careerEarnings += pr.bonus;
  p.lastMsg = `All 4 done in ${secs.toFixed(1)}s. Time bonus: +${money(pr.bonus)} (${pr.saved}% of ${money(total)}).`;
  if (state.players.every((x) => x.proj.done)) endProjects();
}

function endProjects() {
  if (state.phase !== "projects") return;
  state.players.forEach((p) => { p.currentTask = null; if (p.bot) p.bot.current = null; });
  startBoardroom();
}

function projectBotsTick() {
  const now = performance.now();
  let changed = false;
  state.players.forEach((b) => {
    if (!b.isBot || !b.bot || b.proj.done) return;
    const s = b.bot;
    if (s.current) {
      if (now < s.current.doneAt) return;
      projectDone(b, settle(b, s.current.task, s.current.result), s.current.task);
      s.current = null;
      changed = true;
    }
    if (!b.proj.done && state.phase === "projects") {
      const task = projectTask(b), sim = simulateBot(b, task);
      s.current = { task, result: sim.result, doneAt: now + (sim.secs + rand(0.4, 0.9)) * 1000 };
    }
  });
  if (changed && state.phase === "projects") sync();
}

// ---- The Boardroom ----------------------------------------------------------------------------
// Slides (host-timed so everyone sees them together):
//   step 0: career earnings revealed · steps 1-3: one accolade each · last step: the promotion.

/** A player's value for an accolade's stat (see ACCOLADES in data-model.js). */
function statValue(p, key) {
  const s = p.stats;
  if (key === "avgSpeed") return s.speedCount ? s.speedSum / s.speedCount : 0;
  if (key === "avgAccuracy") return s.accuracyCount ? s.accuracySum / s.accuracyCount : 0;
  return s[key] || 0;
}

function startBoardroom() {
  state.phase = "boardroom";
  const base = Object.fromEntries(state.players.map((p) => [p.id, p.careerEarnings]));
  const awards = [];
  // Shuffle all 8; take the first 3 that someone actually qualifies for (value > 0).
  for (const a of [...ACCOLADES].sort(() => Math.random() - 0.5)) {
    if (awards.length === 3) break;
    const best = Math.max(...state.players.map((p) => statValue(p, a.statKey)));
    if (best <= 0) continue;
    const tied = state.players.filter((p) => statValue(p, a.statKey) === best);
    const winner = tied[Math.floor(Math.random() * tied.length)]; // ties: random pick
    const bonus = Math.round(rand(a.minBonus, a.maxBonus));
    winner.careerEarnings += bonus;
    awards.push({ id: a.id, winnerId: winner.id, bonus });
  }
  // Highest career earnings wins the promotion — bots included (playtest feedback).
  const winnerId = [...state.players].sort((x, y) => y.careerEarnings - x.careerEarnings)[0].id;
  const champ = byId(winnerId), last = [...state.players].sort((x, y) => x.careerEarnings - y.careerEarnings)[0];
  const quips = champ.isBot ? { bot: pick(BOT_WIN_QUIPS) } : { winner: pick(WINNER_QUIPS), loser: pick(LOSER_QUIPS), loserId: last.id };
  state.boardroom = { step: 0, base, awards, winnerId, quips };
  sync();
}

// ---- Actions (from any player, including the host) ------------------------------------
function hostAction(p, m) {
  if (!p || p.isBot) return;
  if (m.t === "claim") hostClaim(p, m.id);
  else if (m.t === "result") hostResult(p, m.taskId, m.r);
  else if (m.t === "buy") hostBuy(p, m.i);
  else if (m.t === "curate") hostCurate(p, m.picks);
  else if (m.t === "pace" && p.id === myId && state.phase === "lobby" && PACES[m.v]) state.pace = m.v;
  else if (m.t === "clearInterrupt" && p.interrupt && !p.interrupt.timed && p.interrupt.id === m.id) p.interrupt = null;
  else if (m.t === "start" && p.id === myId && state.phase === "lobby") { fillBots(); return startDay(1); }
  else if (m.t === "again" && p.id === myId && state.phase === "boardroom") return resetMatch();
  else if (m.t === "nextSlide" && p.id === myId && state.phase === "boardroom" && state.boardroom.step < state.boardroom.awards.length + 1) state.boardroom.step++;
  sync();
}

function hostClaim(p, taskId) {
  if (state.phase !== "task" || p.currentTask || p.interrupt || (p.lockUntil || 0) > performance.now()) return; // locked out / interrupted
  const e = viewFor(p).find((x) => x.t.id === taskId);
  if (!e) return; // someone else grabbed it first
  const task = e.priv ? e.t : takeTask(e.i);
  if (e.priv) delete p.priv[e.i];
  Object.assign(task, { state: "inProgress", ownerId: p.id });
  if (task.tier === "easy" && p.aiLeft > 0) {
    p.aiLeft--;
    const aiOut = settle(p, task, { success: true, accuracy: 1, speed: 1.5, ai: true });
    refillSlot(task);
    return report(p, aiOut, task, `🤖 AI handled it (${p.aiLeft} left)`);
  }
  p.currentTask = task;
}

function hostResult(p, taskId, r) {
  const task = p.currentTask;
  if (!task || task.id !== taskId || !r) return;
  p.currentTask = null;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, +v || 0));
  const safe = { success: !!r.success, accuracy: clamp(r.accuracy, 0, 1.5), speed: clamp(r.speed, 0.5, 1.5),
    mistakes: clamp(r.mistakes, 0, 10), risky: clamp(r.risky, 0, 3), note: r.note ? String(r.note).slice(0, 80) : "",
    penalty: task.penalty && r.penalty ? task.penalty : null }; // only games that carry a penalty can trigger one
  const out = settle(p, task, safe);
  if (state.phase === "projects") return projectDone(p, out, task, safe.note);
  if (state.phase === "task") refillSlot(task); // the slot opens up again now
  report(p, out, task, task.overtime ? `⏰ Overtime${safe.note ? ". " + safe.note : ""}` : safe.note);
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
  let slots = 0;
  p.activeToday = [];
  for (const x of picks) {
    if (!p.inventory.includes(x.id) || seen.has(x.id)) continue;
    const def = SABOTAGES.find((s) => s.id === x.id);
    const everyone = def?.everyone && x.targetId === "*";
    const cost = everyone ? 2 : 1;
    if (slots + cost > 3) continue;
    seen.add(x.id);
    slots += cost;
    p.activeToday.push({ id: x.id, targetId: def ? (everyone ? "*" : rivals.includes(x.targetId) ? x.targetId : rivals[0]) : undefined });
  }
  useUp(p);
  p.ready = true;
  checkAllReady();
}

function resetMatch() {
  const humans = state.players.filter((p) => !p.isBot).map((p) => createPlayer({ id: p.id, name: p.name }));
  state = Object.assign(createGameState({ hostPlayerId: myId, players: humans }), { phase: "lobby", code: state.code, shop: {}, pace: state.pace });
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
  if (p.currentTask) { if (state.phase === "task") returnToPool(p.currentTask); p.currentTask = null; } // projects: bot resumes at the same project
  if (state.phase === "night" && !wasReady) { botShop(p); botCurate(p); }
  sync();
  checkAllReady();
}

/** What player pid is allowed to see. Rivals' items, targets, and earnings stay secret. */
function snapshotFor(pid) {
  const me = byId(pid);
  return {
    day: state.day, phase: state.phase, code: state.code || null, hostId: myId, pace: state.pace || "frantic",
    dayLen: state.phase === "projects" || state.phase === "projectsIntro" ? PROJECT_SECONDS : taskDaySeconds(),
    countdownLeft: state.phase === "countdown" ? Math.max(0, (state.countdownEndsAt - performance.now()) / 1000) : 0,
    timeLeft: ["task", "projects"].includes(state.phase) ? Math.max(0, (dayEndsAt - performance.now()) / 1000) : 0,
    introLeft: state.phase === "projectsIntro" ? Math.max(0, (introEndsAt - performance.now()) / 1000) : 0,
    projects: state.projects || [],
    boardroom: state.boardroom || null,
    view: state.phase === "task" ? viewFor(me).map((e) => ({ ...e.t, _ownerId: e.t.ownerId, _owned: e.t.state === "inProgress" })) : [],
    shop: state.shop?.[pid] || [],
    players: state.players.map((p) => p.id === pid
      ? { ...p, bot: undefined, priv: undefined, busy: !!p.currentTask, lockLeft: Math.max(0, ((p.lockUntil || 0) - performance.now()) / 1000),
          interrupt: p.interrupt && { ...p.interrupt, left: Math.max(0, (p.interrupt.until - performance.now()) / 1000) },
          reviewLeft: p.fx?.review && state.phase === "task" ? Math.max(0, 30 - (performance.now() - dayStartAt) / 1000) : 0 }
      : { id: p.id, name: p.name, isBot: p.isBot, wallet: p.wallet, ready: p.ready, busy: !!(p.currentTask || p.bot?.current), failSeq: p.failSeq || 0, failWord: p.failWord,
          proj: p.proj && { k: p.proj.k, done: p.proj.done } }),
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
      settle(b, s.current.task, s.current.result);
      refillSlot(s.current.task);
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
  const reviewing = b.fx.review && performance.now() - dayStartAt < 30000;
  const pref = reviewing ? idx.filter((i) => state.board[i].tier === "easy") : b.fx.bribe ? idx.filter((i) => state.board[i].tier !== "easy") : idx;
  const pool = pref.length ? pref : idx;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * How long the bot takes and how well it does, with item effects applied. Uses the
 * simulation-tested "Average" profile from the v2 ladder simulation (docs/BACKLOG.md).
 */
function simulateBot(b, t) {
  const fx = b.fx, R = Math.random;
  const cap = (t.cap + (t.tier === "medium" ? fx.mediumBonus : 0)) * fx.capMul;
  if (t.tier === "easy" && b.aiLeft > 0) { b.aiLeft--; return { secs: 0.4, result: { success: true, accuracy: 1, speed: 1.5 } }; }
  const secs = { easy: 0.55, medium: 0.65, hard: 0.75 }[t.tier] * rand(0.85, 1.15) * cap + (fx.gossip ? 0.5 : 0);
  if (R() < 0.06 || secs > cap) return { secs: Math.min(secs, cap), result: { success: false } };
  if (t.penalty) { // Boss (wrong answer) or HR (conduct slip) — sits out the lockout too
    const pen = t.penalty === "boss" ? { medium: 0.25, hard: 0.4 }[t.tier] * (fx.noWrong ? 0.6 : 1) : 0.12;
    if (R() < pen) return { secs: secs + LOCKOUT_SECONDS, result: { success: true, accuracy: 0, speed: 0.5, mistakes: 1, penalty: t.penalty } };
  }
  let accuracy = 1, risky = 0, mistakes = 0;
  if (["hitTheQuota", "budgetPie", "trendLine"].includes(t.flavor)) {
    const pp = Math.min(0.9, 0.5 * fx.zoneScale);
    let sum = 0;
    for (let i = 0; i < t.workload; i++) sum += R() < pp ? 1 : 0.7;
    accuracy = sum / t.workload;
  } else if (t.flavor === "copierMeltdown") {
    mistakes = R() < 0.3 ? 1 : 0;
    accuracy = 1 - 0.25 * mistakes;
  } else if (t.flavor === "quarterlyCrunch" && t.tier === "easy") {
    accuracy = R() < 0.85 ? 1 : 0.5;
  } else if (t.flavor === "clientCurveball") {
    let sum = 0;
    for (let i = 0; i < t.workload; i++) {
      if (R() < 0.5) sum += CURVE_SCORING.safe;
      else { risky++; sum += R() < fx.riskyWin ? CURVE_SCORING.riskyWin : CURVE_SCORING.riskyLose; }
    }
    accuracy = sum / t.workload;
  }
  return { secs, result: { success: true, accuracy, speed: speedFromElapsed(secs, cap), mistakes, risky } };
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

/**
 * Turn a PeerJS error into something a player can act on. The free public matchmaking
 * servers are frequently down, so say that plainly rather than blaming their internet.
 */
function netErrorMessage(e, mode) {
  const t = e?.type;
  if (t === "peer-unavailable") return "Couldn't find that room. Check the code, and make sure the host is still on the lobby screen.";
  if (t === "browser-incompatible") return "This browser doesn't support online play. Try Chrome, Edge, Safari or Firefox.";
  if (t === "offline") return "The networking library didn't load. Refresh the page and try again.";
  if (t === "ssl-unavailable" || t === "server-error" || t === "network" || !t) {
    return mode === "host"
      ? "The free matchmaking servers are all unreachable right now (they go down fairly often). Wait a minute and try again — or play solo vs bots in the meantime."
      : "Couldn't reach the matchmaking servers — they're free and go down fairly often. Wait a minute and try again, or ask the host to re-share the code.";
  }
  return `Connection problem (${t}). Wait a minute and try again.`;
}

async function startHosting(name, withNet) {
  isHost = true;
  myId = "host";
  online = withNet;
  state = Object.assign(createGameState({ hostPlayerId: myId, players: [createPlayer({ id: myId, name })] }),
    { phase: "lobby", code: null, shop: {}, pace: PACES[localStorage.getItem("gp-pace")] ? localStorage.getItem("gp-pace") : "frantic" });
  if (!withNet) { fillBots(); return startDay(1); }
  renderStatus("Setting up your room…");
  for (let tries = 0; ; tries++) {
    const code = makeCode();
    try {
      await Net.host(code, { onMessage: onClientMessage, onLeave: onClientLeave },
        (i) => renderStatus(i === 0 ? "Setting up your room…" : `Matchmaking server ${i} didn't answer — trying another…`));
      state.code = code;
      break;
    } catch (e) {
      if (e.type === "unavailable-id" && tries < 5) continue; // code already taken, roll another
      isHost = false;
      return renderMenu(netErrorMessage(e, "host"));
    }
  }
  sync();
}

async function joinGame(name, code) {
  isHost = false;
  online = true;
  renderStatus("Connecting…");
  const fail = (msg) => { clearTimeout(timer); snap = null; renderMenu(msg); };
  const timer = setTimeout(() => { if (!snap) fail("Still no answer. The matchmaking servers may be down — wait a minute and try again."); }, 30000);
  try {
    myId = await Net.join(code, {
      onMessage: (m) => {
        if (m?.t === "state") { clearTimeout(timer); applySnapshot(m.s); }
        else if (m?.t === "full") fail("That game is full or already started.");
      },
      onClose: () => { if (snap) renderGone(); },
    }, (i) => renderStatus(i === 0 ? "Connecting…" : `Matchmaking server ${i} didn't answer — trying another…`));
    Net.toHost({ t: "hello", name });
  } catch (e) {
    fail(netErrorMessage(e, "join"));
  }
}

function applySnapshot(s) {
  const prevPhase = snap?.phase;
  snap = s;
  player = s.players.find((p) => p.id === myId);
  // Use = (not Math.max): host is authoritative. A stale localLockEnd from a previous
  // penalty can hold the client locked all round if Math.max keeps a larger old value.
  localLockEnd = (player?.lockLeft > 0) ? performance.now() + player.lockLeft * 1000 : 0;
  localReviewEnd = player?.reviewLeft > 0 ? performance.now() + player.reviewLeft * 1000 : 0;
  // Phase change: also clear any orphaned interrupt state
  if (prevPhase && s.phase !== prevPhase) {
    localLockEnd = 0;
    clearedInts.clear();
  }
  onOfficeEvents();
  checkFailBubbles();
  syncMusic(s.phase);
  if (s.phase === "task" || s.phase === "projects") localEnd = performance.now() + s.timeLeft * 1000;
  if (s.phase === "projectsIntro") localIntroEnd = performance.now() + s.introLeft * 1000;
  if (s.phase === "countdown" && s.countdownLeft > 0) localCountdownEnd = performance.now() + s.countdownLeft * 1000;
  render();
}

function render() {
  if (!snap || !player) return;
  const live = snap.phase === "task" || snap.phase === "projects";
  const overtime = snap.phase === "night" && player.currentTask?.overtime;
  setScene(live);
  if (!live) { stopGossip(); stopChats(); stopBossQuotes(); }
  if (!live && !overtime) cancelMinigame();
  if (snap.phase === "lobby") renderLobby();
  else if (snap.phase === "countdown") renderCountdown();
  else if (snap.phase === "task") renderDay();
  else if (snap.phase === "projectsIntro") renderIntro();
  else if (snap.phase === "projects") renderProjects();
  else if (snap.phase === "night") renderNight();
  else if (snap.phase === "boardroom") renderBoardroom();
}

/** The "Boss wants a 1 on 1" / "HR wants a chat" lockout screen, on my own screen only. */
function updateLockScreen() {
  const left = (localLockEnd - performance.now()) / 1000;
  let el = document.getElementById("lockov");
  const live = snap && (snap.phase === "task" || snap.phase === "projects");
  if (left <= 0 || !live) { el?.remove(); return; }
  if (!el) {
    const kind = player?.lockKind === "hr" ? "hr" : "boss";
    el = document.createElement("div");
    el.id = "lockov";
    el.className = "overlay lock";
    el.innerHTML = `<div class="card lockcard">${kind === "boss" ? '<div class="bossface"></div>' : '<div class="hrface">🧑‍💼</div>'}
      <h2>${kind === "boss" ? "The Boss wants a 1 on 1 with you." : "HR wants a chat."}</h2>
      <p class="muted">That task paid $0.</p><div class="code-big" id="lockc"></div></div>`;
    document.body.appendChild(el);
  }
  el.querySelector("#lockc").textContent = Math.ceil(left) + "s";
}

/** Countdown for everyone; the host also runs bots and ends the day. */
function tick() {
  updateLockScreen();
  if (snap?.phase === "countdown") renderCountdown(); // ticks the number on its own without needing a host snapshot
  if (snap?.phase === "projectsIntro") {
    const el = document.getElementById("introCount");
    if (el) el.textContent = Math.max(1, Math.ceil((localIntroEnd - performance.now()) / 1000));
  }
  if (snap?.phase === "task" || snap?.phase === "projects") {
    const left = Math.max(0, (localEnd - performance.now()) / 1000);
    const t = document.getElementById("timeLeft"), b = document.getElementById("timeBar");
    if (t) t.textContent = Math.ceil(left) + "s";
    if (b) b.style.width = (left / (snap.dayLen || 60)) * 100 + "%";
  }
  if (isHost && state?.phase === "countdown" && performance.now() >= state.countdownEndsAt) doStartDay(1);
  if (isHost && (state?.phase === "task" || state?.phase === "projects")) interruptsTick();
  updateInterruptScreen();
  updateReviewBanner();
  if (isHost && state?.phase === "task") {
    botsTick();
    if (performance.now() >= dayEndsAt) endDay();
  }
  // Boardroom advances only when the host presses Next (hostAction "nextSlide").
  if (isHost && state?.phase === "projectsIntro" && performance.now() >= introEndsAt) beginProjects();
  if (isHost && state?.phase === "projects") {
    projectBotsTick();
    if (performance.now() >= dayEndsAt) endProjects();
  }
}

// ---- Menu / lobby ------------------------------------------------------------------------------
function renderStatus(msg) {
  setScene(false);
  screenKey = "status";
  app.innerHTML = `<div class="card"><h2>Get Promoted!</h2><p>${esc(msg)}</p></div>`;
}

function renderMenu(err = "") {
  setScene(false);
  document.body.classList.add("below-boss"); // card starts under the Boss
  screenKey = "menu";
  const saved = localStorage.getItem("gp-name") || "";
  app.innerHTML = `<div class="card"><h1>Get Promoted!</h1>
    <p>Grab tasks from the boss, finish them fast, bank the cash. Spend it each night on boosts for you and sabotages for your coworkers.</p>
    <label class="muted" for="name">Your name</label>
    <input id="name" class="text" maxlength="12" value="${esc(saved)}" placeholder="Jordan">
    <p class="muted" style="margin:0 0 4px">Day length (when you host or play solo)</p>
    <div class="paces" id="paces">${Object.entries(PACES).map(([k, [label, s]]) => `<button data-p="${k}" class="${k === (localStorage.getItem("gp-pace") || "frantic") ? "on" : ""}">${label}<small>${s / 60 === 1 ? "1:00" : s === 90 ? "1:30" : "2:00"}</small></button>`).join("")}</div>
    <div class="stack"><button class="big" id="solo">Play solo vs bots</button><button class="big" id="host">Host a game</button></div>
    <div class="join"><label class="muted" for="code">Have a room code?</label>
    <input id="code" class="text code-in" maxlength="6" placeholder="CORP84" autocapitalize="characters">
    <button class="big" id="join">Join</button></div>
    <p class="err">${esc(err)}</p>
    ${Net.local ? '<p class="muted">Local test mode: open a second tab with ?local=1 to join.</p>' : ""}</div>`;
  const name = () => { const n = cleanName(document.getElementById("name").value); localStorage.setItem("gp-name", n); return n; };
  document.querySelectorAll("#paces button").forEach((b) => (b.onclick = () => {
    localStorage.setItem("gp-pace", b.dataset.p);
    document.querySelectorAll("#paces button").forEach((x) => x.classList.toggle("on", x === b));
  }));
  document.getElementById("solo").onclick = () => startHosting(name(), false);
  document.getElementById("host").onclick = () => startHosting(name(), true);
  document.getElementById("join").onclick = () => {
    const code = document.getElementById("code").value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length !== 6) return (document.querySelector(".err").textContent = "Room codes are 6 characters.");
    joinGame(name(), code);
  };
}

function renderLobby() {
  document.body.classList.add("below-boss"); // card starts under the Boss
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
    <p class="muted" style="margin:0 0 4px">Day length${me ? "" : " (the host picks)"}</p>
    <div class="paces" id="lpaces">${Object.entries(PACES).map(([k, [label]]) => `<button data-p="${k}" class="${k === snap.pace ? "on" : ""}" ${me ? "" : "disabled"}>${label}</button>`).join("")}</div>
    ${me ? '<button class="big" id="start">Start the week</button>' : '<p class="muted">Waiting for the host to start…</p>'}</div>`;
  if (me) {
    document.getElementById("copy").onclick = (e) => { navigator.clipboard?.writeText(snap.code); e.target.textContent = "Copied"; };
    document.getElementById("start").onclick = () => act({ t: "start" });
    document.querySelectorAll("#lpaces button").forEach((b) => (b.onclick = () => { localStorage.setItem("gp-pace", b.dataset.p); act({ t: "pace", v: b.dataset.p }); }));
  }
}

function renderGone() {
  setScene(false);
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
    app.innerHTML = hudHtml(`Day ${snap.day} of 5`) + `<div class="panel">
      <div class="review-banner" id="review" hidden></div>
      <div class="pickhdr"><span class="pickttl">Pick a task</span><span class="muted" id="msg"></span></div>
      <div class="board" id="board"></div></div>`;
    startedTaskId = null;
    showDeskItems();
    startBossQuotes();
    if (player.fx?.gossip) startGossip();
  }
  updateStage((p, pop) => `<span class="${pop ? "pop" : ""}">💰${money(p.wallet)}</span>`);
  document.getElementById("msg").textContent = "Finish fast for more pay. Others are grabbing tasks too.";
  const board = document.getElementById("board");
  board.innerHTML = snap.view.map((t) => {
    const who = t._owned ? snap.players.find((pl) => pl.id === t._ownerId) : null;
    const takenByOther = who && who.id !== myId;
    const takenByMe = who && who.id === myId;
    const color = who ? colorOf(who.id) : null;
    return `<button class="task${takenByOther ? " taken" : takenByMe ? " mine" : ""}" data-id="${t.id}"
      style="${color && takenByOther ? `border-color:${color};background:${color}18` : ""}">
      <span class="shape ${t.tier}"></span><b>${money(t.baseValue)}</b>
      <span class="tname">${NAMES[t.flavor]}</span>
      ${takenByOther ? `<span class="takenby" style="color:${color}">${esc(who.name)}</span>` : takenByMe ? `<span class="takenby" style="color:${color}">You</span>` : `<span class="ttier">${t.tier}</span>`}
    </button>`;
  }).join("");
  board.querySelectorAll(".task:not(.taken):not(.mine)").forEach((b) => (b.onclick = () => {
    if (!activeGame && !player.currentTask) act({ t: "claim", id: +b.dataset.id });
  }));
  maybeStartMinigame();
}

/**
 * The office (#scene in index.html) is a fixed backdrop behind every screen. Live days
 * show the Boss + workers with player badges on it; every other screen shows the empty office.
 */
function setScene(live) {
  document.body.classList.toggle("live", live);
  document.body.classList.remove("below-boss"); // menu + lobby add it back
  const img = document.getElementById("sceneImg"), src = live ? "assets/office-full.jpg" : "assets/office-empty.jpg";
  if (!img.getAttribute("src").endsWith(src)) img.setAttribute("src", src);
  if (!live) { document.getElementById("seats").innerHTML = ""; document.getElementById("strip").hidden = true; document.getElementById("deskItems").hidden = true; }
}

/** Today's active Boosts/Sabotages, shown as tags on the front of the Boss's desk. */
function showDeskItems() {
  const el = document.getElementById("deskItems"), items = player.activeToday || [];
  el.hidden = !items.length;
  el.innerHTML = items.map((a) => `<span>${isSabotage(a.id) ? "📉" : "📈"} ${ITEM_INFO[a.id][0]}</span>`).join("");
}

function renderCountdown() {
  if (screenKey !== "countdown") {
    screenKey = "countdown";
    app.innerHTML = `<div class="cdwrap"><div class="cdbox"><div class="cdnum" id="cdnum">3</div><div class="cdlabel">Day ${snap.day} — get ready!</div></div></div>`;
  }
  // Update the number on every render() call — driven by localCountdownEnd so it
  // ticks smoothly even when the host sends no new snapshots during the quiet countdown.
  const el = document.getElementById("cdnum");
  if (el) el.textContent = Math.max(1, Math.ceil((localCountdownEnd - performance.now()) / 1000));
}

/** 📋 Performance Review: red banner with a countdown, REVIEW stamps on the task cards. */
function updateReviewBanner() {
  const el = document.getElementById("review"), board = document.getElementById("board");
  if (!el) return;
  const left = (localReviewEnd - performance.now()) / 1000, on = left > 0 && snap?.phase === "task";
  el.hidden = !on;
  board?.classList.toggle("reviewing", on);
  if (on) el.textContent = `📋 UNDER REVIEW: Easy tasks only (${Math.ceil(left)}s)`;
}

/** Compact top bar that floats over the office wall (kept short so the Boss stays visible). */
function hudHtml(title) {
  return `<div class="card hud"><div class="hud-row"><span>${title}</span><span id="timeLeft">${snap.dayLen}s</span></div>
    <div class="timer"><div id="timeBar" style="width:100%"></div></div></div>`;
}

/**
 * Draw each player's badge on their cubicle. A cubicle glows in its player's color while
 * they're working a task. `label(p, pop)` returns the badge's second line.
 */
function updateStage(label) {
  const el = document.getElementById("seats");
  if (!el) return;
  el.innerHTML = snap.players.map((p, i) => {
    const [l, t, w, h] = SEAT_BOX[i];
    const pop = prevWallets[p.id] !== undefined && prevWallets[p.id] !== p.wallet;
    prevWallets[p.id] = p.wallet;
    return `<div class="seat${p.busy ? " busy" : ""}${p.id === myId ? " me" : ""}" style="left:${l}%;top:${t}%;width:${w}%;height:${h}%;--c:${colorOf(p.id)}">
      <div class="badge"><span class="dot"></span><b>${esc(p.name)}</b>${p.id === myId ? " (you)" : ""}<br>${label(p, pop)}</div></div>`;
  }).join("");
  const strip = document.getElementById("strip");
  if (strip) {
    strip.hidden = snap.phase !== "task";
    strip.innerHTML = snap.phase === "task" ? snap.view.map((t) => `<span class="shape ${t.tier}" title="${t.tier}"></span>`).join("") : "";
  }
}

/** The host assigns a task to me by setting player.currentTask; I play it here. */
function maybeStartMinigame() {
  const t = player.currentTask;
  if (!t || activeGame || t.id === startedTaskId) return;
  const wait = localLockEnd - performance.now();
  if (wait > 0) { clearTimeout(lockTimer); lockTimer = setTimeout(maybeStartMinigame, wait + 50); return; } // locked out
  if (player.interrupt && !clearedInts.has(player.interrupt.id)) { clearTimeout(lockTimer); lockTimer = setTimeout(maybeStartMinigame, 300); return; }
  startedTaskId = t.id;
  const go = () => {
    if (player.currentTask?.id !== t.id || activeGame) return;
    activeGame = MINIGAMES[t.flavor](t, (r) => {
      activeGame = null;
      closeOverlay();
      act({ t: "result", taskId: t.id, r });
    });
  };
  if (snap.phase === "projects" && t.project > 0) setTimeout(go, 700); // brief breather between projects
  else go();
}

function cancelMinigame() {
  if (activeGame) { activeGame.cancel(); activeGame = null; }
  closeOverlay();
}

// ---- Day 5 screens ------------------------------------------------------------------------------------
function renderIntro() {
  if (screenKey === "intro") return;
  screenKey = "intro";
  app.innerHTML = `<div class="card"><h2>Day 5: Projects</h2>
    <p>The boss hands everyone the <b>same 4 projects</b> at the same time: 2 Medium, then 2 Hard. Same tasks, same pay, head to head.</p>
    <p>Finish all 4 before time runs out to earn <b>+1% for every second you save</b>.</p>
    <div class="code-big" id="introCount">${INTRO_SECONDS}</div></div>`;
}

function renderProjects() {
  if (screenKey !== "projects") {
    screenKey = "projects";
    app.innerHTML = hudHtml("Day 5 of 5: Projects") + `<div class="panel">
      <div class="card"><b id="projTitle"></b><div class="muted" id="msg"></div></div></div>`;
    startedTaskId = null;
    showDeskItems();
    startBossQuotes();
    if (player.fx?.gossip) startGossip();
  }
  const pr = player.proj, cur = snap.projects[pr.k];
  document.getElementById("projTitle").textContent = pr.done ? "All 4 projects done ✅" : `Project ${pr.k + 1} of 4: ${NAMES[cur.flavor]} (${money(cur.baseValue)})`;
  document.getElementById("msg").textContent = player.lastMsg || "Everyone has the same project. Go!";
  updateStage((p) => (p.proj?.done ? "✅ all done" : `Project ${(p.proj?.k || 0) + 1} of 4`));
  maybeStartMinigame();
}

// ---- Night: summary → shop → loadout → ready up -----------------------------------------------------
function renderNight() {
  if (player.currentTask?.overtime) { // ⏰ Overtime: one more task while everyone else shops
    if (screenKey !== "overtime" + snap.day) {
      screenKey = "overtime" + snap.day;
      startedTaskId = null;
      app.innerHTML = `<div class="card"><h2>⏰ Overtime!</h2><p>One more task while everyone else hits the supply closet.</p></div>`;
    }
    return maybeStartMinigame();
  }
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
      const sab = isSabotage(c.id);
      return `<div class="item-card" style="border-color:${TIER_BORDER[c.tier]}">
        <div class="itemtype ${sab ? "sab" : "boost"}">${sab ? "😈 <b>SABOTAGE</b>" : "⬆️ <b>BOOST</b>"}
          <span class="rarity" style="color:${TIER_BORDER[c.tier]}">${c.tier}</span></div><b>${name}</b>
        <div class="muted">${desc}</div>${have ? `<div class="muted">You have ${have}</div>` : ""}
        <button class="${sab ? "sabbtn" : "boostbtn"}" data-i="${i}" ${c.bought || !afford ? "disabled" : ""}>${c.bought ? "Bought" : (afford ? "Buy " : "Need ") + money(c.price)}</button></div>`;
    }).join("") + `</div><button class="big" id="done">Choose tomorrow's items</button>`;
  app.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => { b.disabled = true; act({ t: "buy", i: +b.dataset.i }); }));
  document.getElementById("done").onclick = () => goStep("curate");
}

function renderCurate() {
  const rivals = snap.players.filter((p) => p.id !== myId);
  const last = snap.day >= LAST_TASK_DAY;
  const rows = [...new Set(player.inventory)].map((id) => {
    const [name, desc] = ITEM_INFO[id], count = player.inventory.filter((x) => x === id).length;
    const everyone = SABOTAGES.find((x) => x.id === id)?.everyone;
    const target = isSabotage(id) ? `<select class="tsel" data-t="${id}" aria-label="Target">${rivals.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join("")}${everyone ? '<option value="*">👥 Everyone else (2 slots)</option>' : ""}</select>` : "";
    return `<label class="email"><input type="checkbox" data-id="${id}"><span style="flex:1"><b>${name}</b>${count > 1 ? ` ×${count}` : ""}<br><span class="muted">${desc}</span></span>${target}</label>`;
  }).join("");
  app.innerHTML = `<div class="card"><h2>Tomorrow's loadout</h2>
    <p class="muted">You have 3 slots. Items work all day, then they're used up. Sabotages need a target; "👥 Everyone else" uses 2 slots.</p>
    ${rows || '<p class="muted">Your inventory is empty. Earn more tomorrow and try the supply closet again.</p>'}
    <p id="err" class="err"></p>
    <button class="big" id="go">${last ? "Lock in for day 5" : "Ready up for day " + (snap.day + 1)}</button></div>`;
  const boxes = [...app.querySelectorAll("input[type=checkbox]")];
  const slotsUsed = () => boxes.filter((x) => x.checked).reduce((n, x) => n + (app.querySelector(`select[data-t="${x.dataset.id}"]`)?.value === "*" ? 2 : 1), 0);
  const check = (undo) => {
    const over = slotsUsed() > 3;
    if (over) undo();
    document.getElementById("err").textContent = over ? "That's more than 3 slots (\"Everyone else\" uses 2)." : "";
  };
  boxes.forEach((b) => (b.onchange = () => check(() => (b.checked = false))));
  app.querySelectorAll("select[data-t]").forEach((sel) => {
    let prev = sel.value;
    sel.onchange = () => { check(() => (sel.value = prev)); prev = sel.value; };
  });
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

function renderBoardroom() {
  const b = snap.boardroom, last = b.awards.length + 1;
  const key = "boardroom" + b.step;
  if (screenKey === key) return;
  screenKey = key;
  // Totals as of this slide: base career earnings + accolades revealed so far.
  const shown = b.awards.slice(0, Math.max(0, b.step));
  const total = (id) => b.base[id] + shown.filter((a) => a.winnerId === id).reduce((t, a) => t + a.bonus, 0);
  const justWon = b.step >= 1 && b.step < last ? b.awards[b.step - 1] : null;
  const rows = [...snap.players].sort((x, y) => total(y.id) - total(x.id)).map((p, i) => {
    const hot = justWon?.winnerId === p.id, champ = b.step === last && p.id === b.winnerId;
    return `<div class="ready-row ${hot || champ ? "hot" : ""}"><b>${i + 1}</b><span style="color:${colorOf(p.id)}">●</span>
      <span style="flex:1">${esc(p.name)}${p.id === myId ? " (you)" : ""}</span><b class="${hot ? "pop" : ""}">${money(total(p.id))}</b></div>`;
  }).join("");
  let slide;
  if (b.step === 0) {
    slide = `<p>The boss clicks to the first slide. For the first time all week, everyone's <b>career earnings</b> are on the screen.</p>`;
  } else if (justWon) {
    const [name, desc] = ACCOLADE_INFO[justWon.id], who = snap.players.find((p) => p.id === justWon.winnerId);
    slide = `<div class="accolade"><div class="muted">Accolade ${b.step} of ${b.awards.length}</div><h3>🏆 ${name}</h3>
      <div class="muted">${desc}</div><p><b>${esc(who.name)}</b> earns <b>+${money(justWon.bonus)}</b></p></div>`;
  } else {
    const champ = snap.players.find((p) => p.id === b.winnerId);
    slide = `<div class="accolade"><div class="muted">And the promotion goes to…</div><h3>${esc(champ.name)}</h3>
      <div class="stamp">PROMOTED</div>${champ.isBot ? `<p class="roast">${esc(b.quips.bot)}</p>`
        : `<p class="roast">${esc(b.quips.winner)}</p><p class="muted">4th place, <b>${esc(snap.players.find((p) => p.id === b.quips.loserId)?.name || "")}</b>: ${esc(b.quips.loser)}</p>`}</div>`;
  }
  const pr = player.proj;
  const mine = b.step === last && pr ? `<p class="muted">Your Day 5: ${pr.pays.map(money).join(", ") || "no projects"}${pr.done ? `, time bonus +${money(pr.bonus)}` : ""}</p>` : "";
  const me = snap.hostId === myId;
  app.innerHTML = `<div class="card"><h2>The Boardroom</h2>${slide}</div>
    <div class="card"><b>Standings</b>${rows}${mine}</div>
    ${b.step === last
      ? (me ? '<button class="big" id="again">Play again</button>' : '<div class="card muted">Waiting for the host…</div>')
      : (me ? `<button class="big" id="nextslide">${b.step === 0 ? "Show the first accolade" : b.step < b.awards.length ? "Next accolade" : "And the promotion goes to…"}</button>`
            : '<div class="card muted">Waiting for the host…</div>')}`;
  if (b.step === last && me) document.getElementById("again").onclick = () => act({ t: "again" });
  const nx = document.getElementById("nextslide");
  if (nx) nx.onclick = () => { nx.disabled = true; act({ t: "nextSlide" }); };
}


function dismissSplash() {
  const s = document.getElementById("splash");
  s.classList.add("gone");
  mountMuteButton();
  syncMusic("lobby"); // menu track
  renderMenu();
}
document.getElementById("splash").addEventListener("click", dismissSplash);
document.getElementById("splash").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") dismissSplash(); });

setInterval(tick, 100);
