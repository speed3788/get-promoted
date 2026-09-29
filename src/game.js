/**
 * Get Promoted! — game flow, board, economy, shop, item effects, bots (Phases 1-3).
 * Minigames live in src/minigames.js; rules and numbers in src/data-model.js.
 * Status and next steps: docs/PROGRESS.md.
 * Dev tip: open index.html?day=10 for 10-second days while testing.
 */
const DAY_SECONDS = +new URLSearchParams(location.search).get("day") || 60;
const LAST_TASK_DAY = 4; // Day 5 (Projects) comes in Phase 5
const STIPEND = 25;
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
let state, player, dayEndsAt, tickHandle, activeGame = null, nextId = 1, lastMsg = "", gossipTimers = [];

const money = (n) => "$" + n.toFixed(2);
const newTask = (tier) => createTask({ id: nextId++, tier }); // flavor randomized in data-model
const isSabotage = (id) => SABOTAGES.some((s) => s.id === id);
const byId = (id) => state.players.find((p) => p.id === id);
const colorOf = (p) => COLORS[state.players.indexOf(p)];
const rand = (a, b) => a + Math.random() * (b - a);

// ---- Item effects -------------------------------------------------------------
/** Everything affecting player p today: their own Boosts + Sabotages aimed at them. */
function fxFor(p) {
  const mine = new Set(p.activeToday.map((a) => a.id));
  const hits = new Set();
  state.players.forEach((o) => o.activeToday.forEach((a) => { if (a.targetId === p.id) hits.add(a.id); }));
  return {
    baseMul: (mine.has("powerNetworking") ? 1.1 : 1) * (hits.has("budgetFreeze") ? 0.9 : 1),
    speedMul: mine.has("doubleEspresso") ? 1.15 : 1,
    speedCap: hits.has("printerJam") ? 1.1 : Infinity,
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

/** Shared by humans and bots: apply a minigame result + item effects, bank the payout. */
function settle(p, task, r) {
  p.stats.riskyChoicesCount += r.risky || 0;
  if (!r.success) { p.stats.mistakesCount++; return null; } // TODO Phase 4: failed tasks return to the pool
  p.stats.mistakesCount += r.mistakes || 0;
  task.accuracy = r.accuracy;
  task.speed = Math.min(r.speed * p.fx.speedMul, p.fx.speedCap);
  task.state = "completed";
  task.baseValue *= p.fx.baseMul;
  const frozen = p.frozenLeft > 0;
  if (frozen) { p.frozenLeft--; task.baseValue = 0; }
  return { pay: applyTaskResult(p, task), frozen };
}

// ---- Flow ---------------------------------------------------------------------
function titleScreen() {
  app.innerHTML = `<div class="card"><h1>Get Promoted!</h1>
    <p>Grab tasks from the boss, finish them fast, bank the cash. Spend it each night on boosts for you and sabotages for your coworkers.</p>
    <p class="muted">Prototype — you plus 3 bots, offline.</p>
    <button class="big" id="go">Start day 1</button></div>`;
  document.getElementById("go").onclick = startGame;
}

function startGame() {
  player = createPlayer({ id: "p1", name: "You" });
  const bots = ["Taylor", "Morgan", "Riley"].map((n, i) => createPlayer({ id: "b" + i, name: n + " 🤖", isBot: true }));
  state = createGameState({ hostPlayerId: "p1", players: [player, ...bots] });
  startDay(1);
}

function startDay(day) {
  state.day = day;
  state.phase = "task";
  lastMsg = "";
  const now = performance.now();
  state.players.forEach((p) => {
    p.fx = fxFor(p);
    p.frozenLeft = p.fx.frozen ? 1 + Math.floor(Math.random() * 2) : 0;
    p.aiLeft = p.fx.aiTokens ? 5 : 0;
    if (p.isBot) p.bot = { nextAt: now + rand(600, 1400), current: null };
    p.activeToday.forEach((a) => { if (a.targetId) { p.stats.sabotagesUsed++; byId(a.targetId).stats.sabotagesReceived++; } });
  });
  // Day 1 opening board is guaranteed all-Easy; everything after follows day odds.
  state.board = [0, 1, 2, 3].map(() => newTask(day === 1 ? "easy" : rollTaskTier(day)));
  dayEndsAt = now + DAY_SECONDS * 1000;
  renderDay();
  startGossip();
  clearInterval(tickHandle);
  tickHandle = setInterval(tick, 100);
}

function tick() {
  const left = Math.max(0, (dayEndsAt - performance.now()) / 1000);
  const t = document.getElementById("timeLeft"), b = document.getElementById("timeBar");
  if (t) t.textContent = Math.ceil(left) + "s";
  if (b) b.style.width = (left / DAY_SECONDS) * 100 + "%";
  botsTick();
  if (left <= 0) endDay();
}

function endDay() {
  clearInterval(tickHandle);
  stopGossip();
  if (activeGame) { activeGame.cancel(); activeGame = null; } // unfinished tasks are lost
  closeOverlay();
  state.players.forEach((p) => {
    if (p.bot) p.bot.current = null;
    if (p.fx.stipend) { p.wallet += p.fx.stipend; p.careerEarnings += p.fx.stipend; }
  });
  state.phase = "summary";
  const s = player.stats;
  app.innerHTML = `<div class="card"><h2>Day ${state.day} done</h2>${standings()}
    <p>Your career earnings: <b>${money(player.careerEarnings)}</b><br>Tasks completed: ${s.tasksCompleted}<br>
    Mistakes: ${s.mistakesCount}<br>Risky calls: ${s.riskyChoicesCount}${player.fx.stipend ? `<br>HR stipend: +$${STIPEND}` : ""}</p>
    <button class="big" id="next">Visit the supply closet</button></div>`;
  document.getElementById("next").onclick = openShop;
}

function standings() {
  return `<div class="floor">` + [...state.players].sort((a, b) => b.wallet - a.wallet)
    .map((p) => `<div class="chip"><span style="color:${colorOf(p)}">●</span> ${p.name} 💰${money(p.wallet)}</div>`).join("") + `</div>`;
}

// ---- Day screen -------------------------------------------------------------------
function renderDay() {
  const active = player.activeToday.map((a) => ITEM_INFO[a.id][0]).join(", ");
  app.innerHTML = `<div class="card hud"><span>Day ${state.day} of 5</span><span id="timeLeft">${DAY_SECONDS}s</span></div>
    <div class="timer"><div id="timeBar" style="width:100%"></div></div>
    <div class="floor" id="floor"></div>
    ${active ? `<div class="note-line">Active today: ${active}</div>` : ""}
    <div class="card"><b>Pick a task</b><div class="muted" id="msg"></div></div>
    <div class="board" id="board"></div>`;
  updateFloor();
  updateMsg();
  updateBoard();
}

function updateFloor(popId) {
  const el = document.getElementById("floor");
  if (!el) return;
  el.innerHTML = state.players.map((p) => `<div class="chip"><span style="color:${colorOf(p)}">●</span> ${p.name}
    <span class="${p.id === popId ? "pop" : ""}">💰${money(p.wallet)}</span></div>`).join("");
}

function updateMsg() {
  const el = document.getElementById("msg");
  if (el) el.textContent = lastMsg || "Faster and more accurate pays more. Coworkers are grabbing tasks too.";
}

function updateBoard() {
  const el = document.getElementById("board");
  if (!el || state.phase !== "task") return;
  enforceBias(player.fx);
  el.innerHTML = state.board.map((t, i) => `<button class="task" data-i="${i}"><span class="shape ${t.tier}"></span>
    <b>${money(t.baseValue)}</b><br>${NAMES[t.flavor]}<br><span class="muted">${t.tier}</span></button>`).join("");
  el.querySelectorAll(".task").forEach((b) => (b.onclick = () => claim(+b.dataset.i)));
}

/**
 * Bribe the Boss / Performance Review reshape the board the human sees.
 * Simplification: this edits the shared board. Phase 4 (networking) should
 * make it a per-player view instead, per GAME-DESIGN.md.
 */
function enforceBias(fx) {
  const b = state.board;
  if (fx.bribe) {
    let n = b.filter((t) => t.tier !== "easy").length;
    for (let i = 0; i < 4 && n < 2; i++) if (b[i].tier === "easy") { b[i] = newTask(Math.random() < 0.5 ? "medium" : "hard"); n++; }
  }
  if (fx.review) {
    let n = b.filter((t) => t.tier === "easy").length;
    for (let i = 3; i >= 0 && n < 2; i--) if (b[i].tier !== "easy") { b[i] = newTask("easy"); n++; }
  }
}

/** Remove a task from the shared board for player p; its slot refills immediately. */
function takeTask(i, p) {
  const task = state.board[i];
  state.board[i] = newTask(rollTaskTier(state.day));
  task.state = "inProgress";
  task.ownerId = p.id;
  task.startedAt = performance.now();
  return task;
}

function claim(i) {
  if (activeGame) return;
  const task = takeTask(i, player);
  updateBoard();
  if (task.tier === "easy" && player.aiLeft > 0) {
    player.aiLeft--;
    return finishTask(task, { success: true, accuracy: 1, speed: 1.5, note: `🤖 AI handled it (${player.aiLeft} left)` });
  }
  activeGame = MINIGAMES[task.flavor](task, (r) => finishTask(task, r));
}

function finishTask(task, r) {
  activeGame = null;
  closeOverlay();
  const out = settle(player, task, r);
  lastMsg = !out ? "Time's up. No pay for that one."
    : out.frozen ? "🧊 Frozen paycheck. That one paid $0."
    : `+${money(out.pay)}, accuracy ${Math.round(task.accuracy * 100)}%, speed ${task.speed.toFixed(2)}x` + (r.note ? `. ${r.note}` : "");
  updateFloor(player.id);
  updateMsg();
}

// ---- Bots ---------------------------------------------------------------------------
// One bot type using the simulation-tested "Average" profile (see BALANCE-NOTES.md).
function botsTick() {
  const now = performance.now();
  state.players.forEach((b) => {
    if (!b.isBot) return;
    const s = b.bot;
    if (s.current) {
      if (now < s.current.doneAt) return;
      settle(b, s.current.task, s.current.result);
      s.current = null;
      s.nextAt = now + rand(400, 900); // decision time before the next grab
      updateFloor(b.id);
    } else if (now >= s.nextAt) {
      const task = takeTask(botPick(b), b);
      const sim = simulateBot(b, task);
      s.current = { task, result: sim.result, doneAt: now + sim.secs * 1000 };
      updateBoard(); // the human may have just lost a task they were eyeing
    }
  });
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
  const cap = TASK_TIERS.hard.outerCapSeconds * fx.capMul, tt = rand(7.5, 10.5) + extra;
  if (R() < 0.05 || tt > cap) return { secs: Math.min(tt, cap), result: { success: false } };
  let sum = 0, mistakes = 0, risky = 0;
  for (let k = 0; k < 3; k++) {
    const r = R();
    if (t.flavor === "quarterlyCrunch") {
      if (r < (fx.noWrong ? 0.85 : 0.7)) sum += 1; else mistakes++;
    } else if (r < 0.55) sum += 0.8;
    else if (r < 0.85) { risky++; sum += R() < fx.riskyWin ? 1.5 : 0.2; }
    else if (fx.noWrong) sum += 0.8;
    else mistakes++;
  }
  return { secs: tt, result: { success: true, accuracy: sum / 3, speed: speedFromElapsed(tt, cap), mistakes, risky } };
}

function botShop(b) {
  // Greedy: buy the single most expensive card it can afford and doesn't own.
  const c = priced(drawShopCards(state.day)).filter((c) => c.price <= b.wallet && !b.inventory.includes(c.id))
    .sort((x, y) => y.price - x.price)[0];
  if (c) buy(b, c);
}

function botCurate(b) {
  const richest = state.players.filter((p) => p !== b).sort((x, y) => y.wallet - x.wallet)[0];
  b.activeToday = [...b.inventory].sort(() => Math.random() - 0.5).slice(0, 3)
    .map((id) => ({ id, targetId: isSabotage(id) ? richest.id : undefined }));
}

// ---- Slack Gossip (human target only; bots just lose a little time) ----------------
function startGossip() {
  stopGossip();
  if (!player.fx.gossip) return;
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

// ---- Shop + curate ------------------------------------------------------------------
const priced = (cards) => cards.map((c) => {
  const t = ITEM_TIERS[c.tier];
  return { ...c, price: Math.round(rand(t.minPrice, t.maxPrice)) };
});

function buy(p, c) {
  p.wallet -= c.price;
  p.stats.walletSpent += c.price;
  p.inventory.push(c.id);
}

function openShop() {
  state.phase = "shop";
  state.players.forEach((p) => { if (p.isBot) botShop(p); });
  const cards = priced(drawShopCards(state.day));
  const draw = () => {
    app.innerHTML = `<div class="card"><h2>Supply closet</h2>
      <p class="muted">Night ${state.day}. You have <b>${money(player.wallet)}</b>. Anything you buy stays in your inventory for the rest of the week.</p></div>
      <div class="shop">` + cards.map((c, i) => {
        const [name, desc] = ITEM_INFO[c.id], owned = player.inventory.includes(c.id), afford = player.wallet >= c.price;
        return `<div class="item-card" style="border-color:${TIER_BORDER[c.tier]}">
          <div class="muted">${isSabotage(c.id) ? "📉 Sabotage" : "📈 Boost"}, ${c.tier}</div><b>${name}</b>
          <div class="muted">${desc}</div>
          <button data-i="${i}" ${owned || !afford ? "disabled" : ""}>${owned ? "Owned" : (afford ? "Buy " : "Need ") + money(c.price)}</button></div>`;
      }).join("") + `</div><button class="big" id="done">Choose tomorrow's items</button>`;
    app.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => { buy(player, cards[+b.dataset.i]); draw(); }));
    document.getElementById("done").onclick = openCurate;
  };
  draw();
}

function openCurate() {
  state.phase = "curate";
  const rivals = state.players.filter((p) => p !== player);
  const last = state.day >= LAST_TASK_DAY;
  const rows = player.inventory.map((id) => {
    const [name, desc] = ITEM_INFO[id];
    const target = isSabotage(id) ? `<select data-t="${id}" aria-label="Target">${rivals.map((r) => `<option value="${r.id}">${r.name}</option>`).join("")}</select>` : "";
    return `<label class="email"><input type="checkbox" data-id="${id}"><span style="flex:1"><b>${name}</b><br><span class="muted">${desc}</span></span>${target}</label>`;
  }).join("");
  app.innerHTML = `<div class="card"><h2>Tomorrow's loadout</h2>
    <p class="muted">Pick up to 3. They're active all day. Sabotages need a target.</p>
    ${rows || '<p class="muted">Your inventory is empty. Earn more tomorrow and try the supply closet again.</p>'}
    <p id="err" class="err"></p>
    <button class="big" id="go">${last ? "Lock in for day 5" : "Ready up for day " + (state.day + 1)}</button></div>`;
  const boxes = [...app.querySelectorAll("input[type=checkbox]")];
  boxes.forEach((b) => (b.onchange = () => {
    if (boxes.filter((x) => x.checked).length > 3) { b.checked = false; document.getElementById("err").textContent = "You can pick 3 at most."; }
  }));
  document.getElementById("go").onclick = () => {
    player.activeToday = boxes.filter((b) => b.checked).map((b) => ({
      id: b.dataset.id,
      targetId: isSabotage(b.dataset.id) ? app.querySelector(`select[data-t="${b.dataset.id}"]`).value : undefined,
    }));
    state.players.forEach((p) => { if (p.isBot) botCurate(p); });
    last ? prototypeEnd() : startDay(state.day + 1);
  };
}

function prototypeEnd() {
  state.phase = "end";
  const loadout = player.activeToday.map((a) => ITEM_INFO[a.id][0] + (a.targetId ? ` → ${byId(a.targetId).name}` : "")).join(", ") || "nothing";
  app.innerHTML = `<div class="card"><h2>Friday is coming</h2>${standings()}
    <p>Your Day 5 loadout: <b>${loadout}</b></p>
    <p class="muted">Day 5 Projects and the Boardroom arrive in Phases 5 and 6.</p>
    <button class="big" id="again">Play again</button></div>`;
  document.getElementById("again").onclick = startGame;
}

titleScreen();
