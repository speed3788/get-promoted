/**
 * Get Promoted! — what sabotage/boost events LOOK like on a player's own screen (v2).
 * The host decides WHEN things happen (planInterruptions / interruptsTick in game.js);
 * this file draws them: interruption screens, Chatty Coworker, Slack Gossip,
 * the SABOTAGED! stamp, and the floating +$X boost bonus.
 */

// ---- Content banks (locked in docs/BACKLOG.md) ------------------------------------------------
const GOSSIP = [
  "Did you hear who got the corner office?", "Someone microwaved fish AGAIN", "Is the boss's nephew starting Monday??",
  "The CEO just replied-all 😬", "Who keeps taking the good stapler", "Layoff rumors in #random, everyone's freaking the f*** out",
  "Free bagels in the break room!!", "Someone stole my labeled yogurt, I s*** you not", "HR is \"investigating\" something on the 3rd floor",
  "Dave in accounting hasn't logged off Discord in 3 days", "New guy called the boss \"dude\" in the all-hands",
  "The vending machine ate my $2 and I'm not okay", "Someone's cat walked across the Zoom call again",
  "Overheard: \"just put it on the company card\"", "The printer is possessed, don't @ me",
  "Someone replied \"per my last email\" and it got tense", "Is Karen finally quitting or is that just a rumor",
  "The thermostat war has entered week 3", "Someone brought a flask to \"hydrate\" during the budget meeting",
  "IT still hasn't fixed the wifi, f***ing typical",
];

// [opener, RIGHT reply (ends the chat), WRONG reply (keeps it going), their follow-up]. {name} = another player.
const CHATS = [
  ["hey do u have 5 min to talk about my fantasy football team", "Heads down on a deadline!", "Sure, what's up?", "ok so it all started in week 3…"],
  ["did you see my email about the printer codes", "Yep, on it!", "What email?", "the one from 3 weeks ago, I'll resend it AGAIN"],
  ["quick q — are we allowed to expense parking", "I'm not your boss…", "Approved!", "wait you can actually do that? nice"],
  ["not to be that guy but you're on mute", "Thanks, fixed!", "Wait really?", "yeah for like the last 10 minutes bro"],
  ["hey random question, is {name} ok? they seem off", "What do you mean?", "I'll check on them later!", "they've been microwaving fish at 8am, that's not normal behavior"],
  ["can you approve my PTO request real quick", "I'm not your boss…", "Approved!", "ok well I'm putting it in anyway lol"],
  ["lol did you see what {name} said in the meeting", "Gotta focus, tell me later!", "No, what happened", "they called the CEO 'chief' and he did NOT laugh"],
  ["hey so this is awkward but I think I broke the coffee machine", "How??", "I'll call IT!", "I just wanted an oat milk latte and now it's making a weird noise, this is such bulls***"],
  ["quick vent: my landlord is the actual worst", "That sucks, talk later?", "What happened", "he raised my rent $200 with ZERO notice, who does that"],
  ["hey can you cover my desk phone for like 10 min", "Sure, why?", "Yep, go ahead!", "dentist called, apparently I have 3 cavities, great day"],
  ["not to be dramatic but I think {name} is stealing my lunches", "I'll help you investigate later!", "Are you sure?", "my turkey sandwich has gone missing 3 times this month, I know it's them"],
  ["so weird question but does this smell like gas to you", "Call facilities now!", "Smell what?", "just come here a sec, this could be a gas leak"],
  ["hey can I vent about my mother-in-law for a sec", "Rain check?", "Sure", "so she showed up UNANNOUNCED again and rearranged my pantry"],
  ["did HR send you that mandatory training too? it's 4 hours", "4 HOURS?", "Doing it later!", "yeah it's about 'synergy,' whatever that means"],
  ["hey be honest, is my out-of-office message too much", "It's perfect, gotta run!", "Let me see it", "*pastes a wildly overwritten 6-paragraph out-of-office message*"],
  ["quick one — did you eat the last donut, no judgment", "Wait, there were donuts?", "Wasn't me, promise!", "someone's lying to me and I will find out who"],
  ["so I may have replied-all to the whole company by accident", "What did you say??", "Oof, good luck! Gotta run.", "I said 'lol same' to a 200-person thread about layoffs, I'm so f***ed"],
  ["can I ask you something kind of personal", "Not right now, sorry!", "Sure", "do you think my haircut makes me look like {name}"],
  ["hey I think my chair is broken, can you look at it later", "What's wrong with it?", "Sure, later!", "it just slowly sinks, I've lost like 4 inches of height today"],
  ["not to alarm you but there's a weird smell coming from the fridge", "I'll deal with it after this!", "What kind of smell", "like betrayal. someone's forgotten lunch has become sentient"],
];

let gossipTimers = [], chatEl = null, intKey = "", localIntEnd = 0;
const clearedInts = new Set();

/** The office image's box on screen: pop-ups must stay inside it (playtest bug fix). */
function officeRect() {
  const r = document.querySelector("#scene .scene-box")?.getBoundingClientRect();
  return r && r.width ? r : { left: 0, top: 0, width: innerWidth, height: innerHeight };
}
function placeInOffice(el, w, h) {
  const r = officeRect();
  el.style.left = r.left + Math.random() * Math.max(0, r.width - w) + "px";
  el.style.top = r.top + Math.random() * Math.max(0, r.height - h) + "px";
}

// ---- 💬 Slack Gossip: a new pop-up every 12s; each one left open DOUBLES every 5s (cap 25) ------
function startGossip() {
  stopGossip();
  gossipTimers.push(setTimeout(popGossip, 3000), setInterval(popGossip, 12000));
}
function popGossip() {
  if (document.querySelectorAll(".gossip").length >= 25) return;
  const g = document.createElement("div");
  g.className = "gossip";
  g.innerHTML = `<button aria-label="Dismiss">×</button><b>💬 #random</b><br>${pick(GOSSIP)}`;
  g.querySelector("button").onclick = () => g.remove();
  document.body.appendChild(g);
  placeInOffice(g, 220, 90);
  const grow = () => { if (g.isConnected) { popGossip(); gossipTimers.push(setTimeout(grow, 5000)); } };
  gossipTimers.push(setTimeout(grow, 5000));
}
function stopGossip() {
  gossipTimers.forEach((t) => { clearTimeout(t); clearInterval(t); });
  gossipTimers = [];
  document.querySelectorAll(".gossip").forEach((g) => g.remove());
}

// ---- 🙋 Chatty Coworker: only the RIGHT reply ends it; a wrong one keeps the chat going ------------
function openChat() {
  if (chatEl) return; // one conversation at a time
  chatEl = document.createElement("div");
  chatEl.className = "chat";
  document.body.appendChild(chatEl);
  nextChat();
}
function nextChat() {
  if (!chatEl) return;
  const others = snap.players.filter((p) => p.id !== myId);
  const from = pick(others).name, mention = pick(others).name;
  const [msg, right, wrong, follow] = pick(CHATS).map((s) => s.replaceAll("{name}", mention));
  chatEl.innerHTML = `<div class="chathead">💬 ${esc(from)}</div><div class="bubble them">${esc(msg)}</div><div class="replies"></div>`;
  placeInOffice(chatEl, 260, 190); // each new message moves the window
  const box = chatEl.querySelector(".replies");
  shuffle([{ t: right, ok: true }, { t: wrong, ok: false }]).forEach((r) => {
    const b = document.createElement("button");
    b.textContent = r.t;
    b.onclick = () => {
      if (r.ok) return stopChats();
      box.innerHTML = `<div class="bubble me">${esc(r.t)}</div><div class="bubble them">${esc(follow)}</div>`;
      setTimeout(nextChat, 600); // …and they keep talking
    };
    box.appendChild(b);
  });
}
function stopChats() { chatEl?.remove(); chatEl = null; }

// ---- Interruption screens (Delivery, Meeting, Smoke Break, Printer, Password) -------------------
const INTERRUPT = {
  delivery: ["📦", "You have a delivery!", "Grabbing your package…"],
  meeting: ["📅", "Surprise meeting", "Quick sync (it's never quick)"],
  smoke: ["🚬", "Smoke break", ""],
  printer: ["🖨️", "Printer's jammed again", "Tap Unjam 6 times"],
  password: ["🔐", "Your password expired", ""],
};
function updateInterruptScreen() {
  const it = player?.interrupt, live = snap && ["task", "projects"].includes(snap.phase);
  let el = document.getElementById("intov");
  if (!it || !live || clearedInts.has(it.id)) { el?.remove(); intKey = ""; return; }
  if (activeGame) return; // waits until the current minigame is done
  if (!el || intKey !== String(it.id)) { el?.remove(); el = buildInterrupt(it); intKey = String(it.id); }
  const c = el.querySelector(".intc");
  if (c) c.textContent = Math.max(1, Math.ceil((localIntEnd - performance.now()) / 1000)) + "s";
}
function buildInterrupt(it) {
  const [icon, title, sub] = INTERRUPT[it.kind];
  const el = document.createElement("div");
  el.id = "intov";
  el.className = "overlay intov";
  let body = `<div class="code-big intc"></div>`;
  if (it.kind === "smoke") body = `<p>☁️ On a smoke break with <b>${esc(it.with || "a coworker")}</b></p>` + body;
  if (it.kind === "printer") body = `<div class="pile" id="jamzone"><button class="big mash" id="unjam">Unjam</button></div><p class="muted" id="jc">0 / 6</p>`;
  if (it.kind === "password") body = `<p>New PIN: <b class="pin">${it.pin}</b></p><div class="pinshow" id="pinshow">_ _ _ _</div>
    <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => `<button data-d="${d}">${d}</button>`).join("")}</div>`;
  el.innerHTML = `<div class="card lockcard"><div class="inticon">${icon}</div><h2>${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ""}${body}</div>`;
  document.body.appendChild(el);
  const clear = () => { clearedInts.add(it.id); el.remove(); act({ t: "clearInterrupt", id: it.id }); };
  if (it.kind === "printer") {
    let taps = 0;
    const b = el.querySelector("#unjam");
    b.onpointerdown = (e) => {
      e.preventDefault();
      el.querySelector("#jc").textContent = `${++taps} / 6`;
      if (taps >= 6) return clear();
      b.style.left = rint(20, 80) + "%";
      b.style.top = rint(25, 75) + "%";
    };
  }
  if (it.kind === "password") {
    let typed = "";
    el.querySelectorAll(".keypad button").forEach((b) => (b.onclick = () => {
      typed = it.pin.startsWith(typed + b.dataset.d) ? typed + b.dataset.d : ""; // a wrong digit starts over
      el.querySelector("#pinshow").textContent = (typed + "____").slice(0, 4).split("").join(" ");
      if (typed === it.pin) clear();
    }));
  }
  return el;
}

// ---- 🧊 SABOTAGED! stamp and 📈 floating +$X ---------------------------------------------------
function showStamp() {
  const s = document.createElement("div");
  s.className = "sabstamp";
  s.textContent = "SABOTAGED!";
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 1400);
}
function showBonus(b) {
  const f = document.createElement("div");
  f.className = "bonusfloat";
  f.innerHTML = (b.amt > 0 ? `+$${b.amt.toFixed(2)}` : "") + (b.labels?.length ? `<small>${b.labels.map(esc).join(" · ")}</small>` : "");
  const panel = document.querySelector(".panel")?.getBoundingClientRect();
  f.style.left = (panel ? panel.left + panel.width / 2 : innerWidth / 2) + "px";
  f.style.top = (panel ? panel.top : innerHeight / 2) + "px";
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1700);
}

/** Called with every new snapshot: fire any new stamps, bonuses, or chats meant for me. */
let seen = { flash: 0, bonus: 0, chat: 0 };
function onOfficeEvents() {
  if (!player) return;
  if (snap.phase === "lobby") { seen = { flash: 0, bonus: 0, chat: 0 }; return; }
  if ((player.flashSeq || 0) > seen.flash) showStamp();
  if ((player.bonusSeq || 0) > seen.bonus && player.bonus) showBonus(player.bonus);
  if ((player.chatSeq || 0) > seen.chat && ["task", "projects"].includes(snap.phase)) openChat();
  seen = { flash: player.flashSeq || 0, bonus: player.bonusSeq || 0, chat: player.chatSeq || 0 };
  if (player.interrupt?.left) localIntEnd = performance.now() + player.interrupt.left * 1000;
}

// ---- Phase 3 polish: Boss quotes, fail bubbles, Boardroom roasts (banks locked in BACKLOG.md) ----
const BOSS_QUOTES = [
  "Dreams don't work unless you do.", "ABC: Always. Be. Closing.", "Don't wait for opportunity. Create it.",
  "Don't watch the clock, do what it does. Keep going.", "Hustle until your haters ask if you're hiring.",
  "There's no elevator to success, you have to take the stairs.", "Great things never came from comfort zones.",
  "Work hard in silence, let your paycheck do the talking.", "Success is a marathon, not a sprint… but also hurry up.",
  "Teamwork makes the dream work.", "Rome wasn't built in a day, but they were laying bricks every hour.",
  "Fall seven times, stand up eight. Then file a report on it.", "Sleep is for people without deadlines.",
];
const FAIL_WORDS = ["F*ck!", "God D*mn it!", "S**t!", "Dammit!", "Are you kidding me?!"];
const WINNER_QUIPS = [
  "Congrats on the promotion! Your coworkers all hate you now.", "Congrats on the promotion! More work for the same pay.",
  "You're officially middle management. May God have mercy on your soul.", "Enjoy the corner office. It has the same wifi as everyone else's desk.",
  "Please disregard the layoffs happening next quarter.", "Promoted! Your new title comes with zero new benefits.",
  "HR will be reaching out about your new \"flexible\" hours.", "The pizza party budget got cut to pay for your raise.",
];
const LOSER_QUIPS = [
  "The boss would like to see you in his office.", "Keep this up and you'll be replaced by AI.", "HR has some \"feedback\" for you.",
  "Your Performance Improvement Plan starts Monday.", "Maybe try LinkedIn \"Open to Work\" this week.",
  "The boss said your name wrong in the all-hands. On purpose.", "Your parking spot has been reassigned.", "Someone already took your stapler.",
];
const BOT_WIN_QUIPS = [
  "🤖 Replaced by AI.", "The boss only spent $4 in tokens on this AI.", "Terminator was fiction. This was a warning.",
  "Idiocracy really was a documentary.", "Skynet started in middle management.", "The machines don't need a lunch break, or a raise.",
  "HAL 9000 could not be reached for comment.", "2001: A Space Odyssey called. It says \"told you so.\"",
  "No humans were promoted in the making of this game.",
];

let quoteTimer = null;
/** 💬 The Boss says something "motivational" every 20-35 seconds on live days. */
function startBossQuotes() {
  stopBossQuotes();
  const next = (ms) => (quoteTimer = setTimeout(() => {
    const box = document.querySelector("#scene .scene-box");
    if (box && document.body.classList.contains("live")) {
      box.querySelector(".bossquote")?.remove();
      const b = document.createElement("div");
      b.className = "bossquote";
      b.textContent = pick(BOSS_QUOTES);
      box.appendChild(b);
      setTimeout(() => b.remove(), 4500);
    }
    next(rand(20000, 35000));
  }, ms));
  next(rand(4000, 8000));
}
function stopBossQuotes() { clearTimeout(quoteTimer); document.querySelectorAll(".bossquote").forEach((b) => b.remove()); }

/** A censored cuss pops over a player's cubicle when they fail a task — everyone sees it. */
const seenFail = {};
function checkFailBubbles() {
  const live = ["task", "projects"].includes(snap.phase);
  snap.players.forEach((p, i) => {
    const n = p.failSeq || 0;
    if (seenFail[p.id] !== undefined && n > seenFail[p.id] && live) showFailBubble(i, p.failWord);
    seenFail[p.id] = n;
  });
}
function showFailBubble(seat, word) {
  // Drawn ABOVE the task panel (which covers the lower cubicles on phones) so everyone always sees it.
  const r = document.querySelector("#scene .scene-box")?.getBoundingClientRect();
  if (!r || !SEAT_BOX[seat]) return;
  const [l, t, w] = SEAT_BOX[seat];
  const b = document.createElement("div");
  b.className = "failbubble";
  b.textContent = word || "Dammit!";
  b.style.left = r.left + ((l + w / 2) / 100) * r.width + "px";
  b.style.top = r.top + (t / 100) * r.height - 12 + "px"; // just above that cubicle's name badge
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 2200);
}

// ---- Music: one looping track per section, with a mute toggle -------------------------------
// menu   → splash, menu, lobby
// days   → countdown + Days 1-4 (task phase) + nights
// finale → Day 5 projects + boardroom
const TRACKS = { menu: "assets/audio/menu.mp3", days: "assets/audio/days.mp3", finale: "assets/audio/finale.mp3" };
const PHASE_TRACK = {
  lobby: "menu", countdown: "days", task: "days", night: "days",
  projectsIntro: "finale", projects: "finale", boardroom: "finale",
};
let audioEl = null, curTrack = null;
let muted = localStorage.getItem("gp-muted") === "1";
let volume = Math.min(1, Math.max(0, parseFloat(localStorage.getItem("gp-volume") ?? "0.45")));

function playTrack(name) {
  if (!TRACKS[name]) return;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.loop = true;
  }
  audioEl.volume = volume;
  if (curTrack !== name) {
    curTrack = name;
    audioEl.src = TRACKS[name];
  }
  if (muted || volume === 0) { audioEl.pause(); return; }
  // Browsers block autoplay until the user interacts — the splash tap covers this.
  audioEl.play().catch(() => {});
}

function applyAudio() {
  if (audioEl) {
    audioEl.volume = volume;
    if (muted || volume === 0) audioEl.pause();
    else audioEl.play().catch(() => {});
  }
  const btn = document.getElementById("mutebtn");
  if (btn) btn.textContent = muted || volume === 0 ? "🔇" : volume < 0.4 ? "🔉" : "🔊";
  const sl = document.getElementById("volslider");
  if (sl && +sl.value !== Math.round(volume * 100)) sl.value = Math.round(volume * 100);
}

function setMuted(v) {
  muted = v;
  localStorage.setItem("gp-muted", v ? "1" : "0");
  applyAudio();
}

function setVolume(v) {
  volume = Math.min(1, Math.max(0, v));
  localStorage.setItem("gp-volume", String(volume));
  if (volume > 0 && muted) { muted = false; localStorage.setItem("gp-muted", "0"); } // dragging up unmutes
  applyAudio();
}

/** Called on every snapshot + at the splash/menu so music matches the current screen. */
function syncMusic(phase) {
  playTrack(PHASE_TRACK[phase] || "menu");
}

/** Audio control: speaker button toggles mute, and opens a volume slider. */
function mountMuteButton() {
  if (document.getElementById("audiobox")) return;
  const box = document.createElement("div");
  box.id = "audiobox";
  box.className = "audiobox";
  box.innerHTML = `<input id="volslider" class="volslider" type="range" min="0" max="100" step="5"
      value="${Math.round(volume * 100)}" aria-label="Music volume">
    <button id="mutebtn" class="mutebtn" aria-label="Mute or unmute music"></button>`;
  document.body.appendChild(box);
  const btn = box.querySelector("#mutebtn"), sl = box.querySelector("#volslider");
  btn.onclick = () => {
    box.classList.add("open"); // show the slider whenever they touch the speaker
    setMuted(!muted);
    clearTimeout(box._t);
    box._t = setTimeout(() => box.classList.remove("open"), 4000);
  };
  const show = () => { box.classList.add("open"); clearTimeout(box._t); box._t = setTimeout(() => box.classList.remove("open"), 4000); };
  sl.oninput = () => { setVolume(+sl.value / 100); show(); };
  box.onpointerenter = show;
  applyAudio();
}
