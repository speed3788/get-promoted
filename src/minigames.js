/**
 * Get Promoted! — all 11 minigames + their shared helpers.
 * Each minigame takes (task, done) and returns { cancel }.
 * Effects from Boosts/Sabotages are read from the global `player.fx` (see game.js).
 */
// ---- Shared helpers ----------------------------------------------------------
const secs = (t0) => (performance.now() - t0) / 1000;
function openOverlay(html) {
  closeOverlay();
  const o = document.createElement("div");
  o.className = "overlay";
  o.id = "ov";
  o.innerHTML = `<div class="card">${html}</div>`;
  document.body.appendChild(o);
  return o;
}
function closeOverlay() { document.getElementById("ov")?.remove(); }

/** Outer-cap timer shared by every minigame. win() scores speed from elapsed time. */
function runner(cap, done, cleanup) {
  cap *= player.fx?.capMul ?? 1; // Reply-All Reminder shortens every task
  const t0 = performance.now();
  let over = false;
  const to = setTimeout(() => finish({ success: false }), cap * 1000);
  function finish(r) { if (over) return; over = true; clearTimeout(to); cleanup && cleanup(); done(r); }
  return {
    t0, cap, finish,
    get over() { return over; },
    win: (extra = {}) => finish({ success: true, accuracy: 1, speed: speedFromElapsed(secs(t0), cap), ...extra }),
    cancel() { over = true; clearTimeout(to); cleanup && cleanup(); },
  };
}

/** Drag el onto target (mouse or touch). Calls onHit when dropped on target. */
function dragTo(el, target, onHit) {
  let sx, sy;
  el.onpointerdown = (e) => { e.preventDefault(); sx = e.clientX; sy = e.clientY; try { el.setPointerCapture(e.pointerId); } catch {} };
  el.onpointermove = (e) => {
    if (el.hasPointerCapture(e.pointerId)) el.style.transform = `translate(${e.clientX - sx}px,${e.clientY - sy}px)`;
  };
  el.onpointerup = (e) => {
    const r = target.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { el.remove(); onHit(); }
    else el.style.transform = "";
  };
}

function spawnItems(box, n, emoji, cls = "item") {
  return Array.from({ length: n }, () => {
    const d = document.createElement("div");
    d.className = cls;
    d.textContent = emoji;
    d.style.left = 5 + Math.random() * 78 + "%";
    d.style.top = 5 + Math.random() * 60 + "%";
    box.appendChild(d);
    return d;
  });
}

const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

// ---- Medium building blocks -------------------------------------------------
// Nested zones: Perfect (accuracy 1.0) inside Good (0.7). Misses loop; speed from pass number.
function makeZones() {
  const c = 30 + Math.random() * 50, s = player.fx?.zoneScale ?? 1; // Executive Assistant / IT Ticket Backlog
  return { good: [c - 12 * s, c + 12 * s], perf: [c - 4 * s, c + 4 * s] };
}
const mediumCap = () => TASK_TIERS.medium.outerCapSeconds + (player.fx?.mediumBonus ?? 0); // IT Fast-Track
function zoneHtml(z) {
  return `<div class="zone" style="left:${z.good[0]}%;width:${z.good[1] - z.good[0]}%;background:#F5A62366"></div>
    <div class="zone" style="left:${z.perf[0]}%;width:${z.perf[1] - z.perf[0]}%;background:#F5A623"></div>`;
}
function judge(z, x) { return x >= z.perf[0] && x <= z.perf[1] ? 1 : x >= z.good[0] && x <= z.good[1] ? 0.7 : 0; }

/** Click mechanic: a needle sweeps back and forth; click inside the zone. */
function timingClick(title, hint, label) {
  return (task, done) => {
    const sweep = 2, z = makeZones();
    let raf;
    const run = runner(mediumCap(), done, () => cancelAnimationFrame(raf));
    const o = openOverlay(`<h3>${title}</h3><p class="muted">${hint} The dark band is perfect.</p>
      <div class="bar">${zoneHtml(z)}<div class="needle" id="n"></div></div>
      <p class="muted" id="pass">Pass 1</p><button class="big" id="act">${label}</button>`);
    const n = o.querySelector("#n"), p = o.querySelector("#pass");
    const pos = (el) => { const ph = (el % sweep) / sweep; return ph < 0.5 ? ph * 200 : (1 - ph) * 200; };
    (function frame() {
      if (run.over) return;
      const el = secs(run.t0);
      n.style.left = `calc(${pos(el)}% - 2px)`;
      p.textContent = "Pass " + (Math.floor(el / sweep) + 1);
      raf = requestAnimationFrame(frame);
    })();
    o.querySelector("#act").onpointerdown = (e) => {
      e.preventDefault();
      const el = secs(run.t0), acc = judge(z, pos(el));
      if (acc) run.finish({ success: true, accuracy: acc, speed: speedFromPass(Math.floor(el / sweep) + 1) });
      else { n.style.background = "#E53935"; setTimeout(() => (n.style.background = ""), 200); }
    };
    return run;
  };
}

/** Hold mechanic: meter rises while held; release inside the zone. Overshoot or miss = next attempt. */
function holdRelease(title, hint, label) {
  return (task, done) => {
    const fillTime = 1.6, z = makeZones();
    let raf, holdStart = null, level = 0, attempt = 1;
    const run = runner(mediumCap(), done, () => cancelAnimationFrame(raf));
    const o = openOverlay(`<h3>${title}</h3><p class="muted">${hint} The dark band is perfect.</p>
      <div class="bar"><div class="fill" id="f" style="background:#23283833"></div>${zoneHtml(z)}<div class="needle" id="n"></div></div>
      <p class="muted" id="pass">Attempt 1</p><button class="big" id="act">${label}</button>`);
    const f = o.querySelector("#f"), n = o.querySelector("#n"), p = o.querySelector("#pass"), btn = o.querySelector("#act");
    function miss() {
      holdStart = null; level = 0; attempt++;
      p.textContent = "Attempt " + attempt;
      n.style.background = "#E53935"; setTimeout(() => (n.style.background = ""), 200);
    }
    (function frame() {
      if (run.over) return;
      if (holdStart !== null) {
        level = Math.min(100, (secs(holdStart) / fillTime) * 100);
        if (level >= 100) miss();
      }
      f.style.width = level + "%";
      n.style.left = `calc(${level}% - 2px)`;
      raf = requestAnimationFrame(frame);
    })();
    btn.onpointerdown = (e) => {
      e.preventDefault();
      holdStart = performance.now();
      try { btn.setPointerCapture(e.pointerId); } catch {} // keeps release working if the finger slides off
    };
    btn.onpointerup = btn.onpointercancel = () => {
      if (holdStart === null || run.over) return;
      const acc = judge(z, level);
      if (acc) run.finish({ success: true, accuracy: acc, speed: speedFromPass(attempt) });
      else miss();
    };
    return run;
  };
}

// ---- Minigames -----------------------------------------------------------------
// Each takes (task, done) and returns { cancel }.
// done({ success, accuracy, speed, mistakes?, risky?, note? })
const MINIGAMES = {
  // ===== Easy: go until cleared. Accuracy 1.0, speed from elapsed time. =====
  staplerFrenzy(task, done) {
    const need = 12;
    let hits = 0;
    const run = runner(TASK_TIERS.easy.outerCapSeconds, done);
    const o = openOverlay(`<h3>📎 Stapler Frenzy</h3><p class="muted">Mash to staple the report.</p>
      <div class="bar"><div class="fill" id="f"></div></div><p></p><button class="big" id="mash">Staple</button>`);
    const f = o.querySelector("#f");
    o.querySelector("#mash").onpointerdown = (e) => {
      e.preventDefault();
      f.style.width = (++hits / need) * 100 + "%";
      if (hits >= need) run.win();
    };
    return run;
  },

  coverYourTracks(task, done) {
    let left = 4;
    const run = runner(5, done);
    const o = openOverlay(`<h3>🗑️ Cover Your Tracks</h3><p class="muted">Drag every document into the trash. It never happened.</p>
      <div class="pile" id="pile"></div><div class="target" id="bin">🗑️ Trash</div>`);
    const bin = o.querySelector("#bin");
    spawnItems(o.querySelector("#pile"), left, "📄").forEach((d) => dragTo(d, bin, () => { if (--left === 0) run.win(); }));
    return run;
  },

  inboxZeroRush(task, done) {
    const subjects = shuffle(["Re: Re: Fwd: Q3 synergy", "Mandatory fun Friday", "Who took my yogurt",
      "Deck FINAL v7 (real final)", "Quick sync?", "Circling back", "Reply-all: thanks!"]).slice(0, 5);
    const run = runner(5, done);
    const o = openOverlay(`<h3>📧 Inbox Zero Rush</h3><p class="muted">Check every email, then clear them all.</p>
      <button class="big" id="clr">Clear all</button><div style="margin-top:8px">` +
      subjects.map((s) => `<label class="email"><input type="checkbox"> ${s}</label>`).join("") + `</div>`);
    const clr = o.querySelector("#clr");
    clr.onclick = () => {
      if ([...o.querySelectorAll("input")].every((b) => b.checked)) return run.win();
      clr.textContent = "Check them all first";
      setTimeout(() => (clr.textContent = "Clear all"), 600);
    };
    return run;
  },

  postItPanic(task, done) {
    let left = 8;
    const run = runner(TASK_TIERS.easy.outerCapSeconds, done);
    const o = openOverlay(`<h3>📝 Post-it Panic</h3><p class="muted">Rip every sticky note off the board.</p>
      <div class="pile" id="board" style="background:#c9a36b"></div>`);
    spawnItems(o.querySelector("#board"), left, "📝").forEach((d) => {
      d.onpointerdown = (e) => { e.preventDefault(); d.remove(); if (--left === 0) run.win(); };
    });
    return run;
  },

  copierMeltdown(task, done) {
    const total = 5;
    let spawned = 0, left = total, iv;
    const run = runner(5, done, () => clearInterval(iv));
    const o = openOverlay(`<h3>📠 Copier Meltdown</h3><p class="muted">The copier won't stop. Drag each page into the shredder.</p>
      <div class="pile" id="tray"></div><div class="target" id="shred">✂️ Shredder</div>`);
    const tray = o.querySelector("#tray"), shred = o.querySelector("#shred");
    function spawn() {
      if (spawned >= total) return clearInterval(iv);
      spawned++;
      const [d] = spawnItems(tray, 1, "📃");
      dragTo(d, shred, () => { if (--left === 0) run.win(); });
    }
    spawn();
    iv = setInterval(spawn, 600);
    return run;
  },

  // ===== Medium: click or hold/release timing =====
  perfectSend: timingClick("📨 Perfect Send", "Hit send at just the right moment.", "Send"),
  nailThePitch: timingClick("🎤 Nail the Pitch", "Deliver your line when the client leans in.", "Pitch"),
  holdTheLine: holdRelease("☎️ Hold the Line", "Hold the call, release when the caller's ready.", "Hold"),
  closingTheDeal: holdRelease("🤝 Closing the Deal", "Hold through the tension, release at peak leverage.", "Hold"),

  // ===== Hard: 3-question chains =====
  quarterlyCrunch(task, done) {
    const qs = [0, 1, 2].map(makeMathQ);
    return questionChain(task, done, "📊 Quarterly Crunch", qs.map((q) => ({
      text: q.text,
      options: q.options.map((v) => ({ label: v, score: () => (v === q.answer ? 1 : 0), wrong: v !== q.answer })),
    })));
  },

  clientCurveball(task, done) {
    const sc = TASK_TIERS.hard.curveballScoring;
    return questionChain(task, done, "🎯 Client Curveball", shuffle(CURVEBALLS).slice(0, 3).map((c) => ({
      text: c.q,
      options: shuffle([
        { label: c.safe, score: () => sc.safe },
        { label: c.risky, risky: true, score: () => (Math.random() < (player.fx?.riskyWin ?? 0.5) ? { v: sc.riskyWin, note: "✅ " + c.win } : { v: sc.riskyLose, note: "💥 " + c.lose }) },
        { label: c.wrong, wrong: true, score: () => sc.wrong },
      ]),
    })));
  },
};

/** Shared Hard UI: chain of questions, accuracy = average score, speed from total time. */
function questionChain(task, done, title, questions) {
  let iv;
  const run = runner(TASK_TIERS.hard.outerCapSeconds, done, () => clearInterval(iv));
  const scores = [];
  let mistakes = 0, risky = 0, note = "";
  const o = openOverlay(`<h3>${title}</h3><p class="muted" id="qn"></p><p class="muted" id="qf"></p>
    <p id="qt" style="font-size:18px;font-weight:700"></p><div class="opts" id="qo"></div><p class="muted" id="ql"></p>`);
  iv = setInterval(() => { o.querySelector("#ql").textContent = Math.max(0, run.cap - secs(run.t0)).toFixed(1) + "s left"; }, 100);
  function show(k) {
    const q = questions[k], box = o.querySelector("#qo");
    if (player.fx?.noWrong) { const w = q.options.findIndex((x) => x.wrong); if (w >= 0) q.options.splice(w, 1); } // Legal Pre-Approval
    o.querySelector("#qn").textContent = `Question ${k + 1} of ${questions.length}`;
    o.querySelector("#qt").textContent = q.text;
    box.innerHTML = "";
    q.options.forEach((opt) => {
      const b = document.createElement("button");
      b.textContent = opt.label;
      b.onclick = () => {
        const res = opt.score(); // a number, or { v, note } for risky choices
        scores.push(typeof res === "number" ? res : res.v);
        if (opt.wrong) mistakes++;
        if (opt.risky) { risky++; note = res.note; }
        o.querySelector("#qf").textContent = opt.risky ? res.note : "";
        if (k < questions.length - 1) return show(k + 1);
        run.win({ accuracy: scores.reduce((a, s) => a + s, 0) / scores.length, mistakes, risky, note });
      };
      box.appendChild(b);
    });
  }
  show(0);
  return run;
}

const CURVEBALLS = [
  { q: "The client says the invoice never arrived.", safe: "Resend it right away", risky: "Tell them it's not your problem", wrong: "Ignore the email", win: "They laughed and paid double.", lose: "They called your boss." },
  { q: "Client wants a discount you can't approve.", safe: "Escalate to your manager", risky: "Say yes and hope nobody notices", wrong: "Cover it with your own money", win: "Nobody noticed. Deal closed.", lose: "Finance noticed." },
  { q: "You CC'd the client on an internal joke about them.", safe: "Apologize right away", risky: "Say it was a typo", wrong: "Reply-all and double down", win: "They bought it.", lose: "They did not buy it." },
  { q: "Client asks if the product does something it doesn't.", safe: "Be honest about it", risky: "\"Absolutely!\" and figure it out later", wrong: "Put it in writing as a guarantee", win: "Engineering pulled it off.", lose: "Engineering did not pull it off." },
  { q: "You're 10 minutes late to a client call.", safe: "Apologize and explain", risky: "Blame technical difficulties", wrong: "Just don't show up", win: "They had tech issues too.", lose: "They saw you in the parking lot." },
  { q: "The client accidentally replied-all to 200 people.", safe: "Message them privately", risky: "Reply-all with a joke", wrong: "Reply-all asking to unsubscribe", win: "The joke went viral internally.", lose: "HR wants a word." },
  { q: "Client asks for the deck an hour early.", safe: "Send what you have with a note", risky: "Send last year's deck", wrong: "Pretend you didn't see it", win: "They didn't notice.", lose: "It had the old logo." },
];

function makeMathQ() {
  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  let text, ans, isMoney = true;
  switch (r(0, 3)) {
    case 0: { const p = [10, 15, 20, 25][r(0, 3)], v = r(2, 9) * 100; text = `Client wants ${p}% off a $${v} invoice. Discount?`; ans = (v * p) / 100; break; }
    case 1: { const n = r(2, 6), v = r(3, 12) * 10; text = `You close ${n} deals worth $${v} each. Total?`; ans = n * v; break; }
    case 2: { const n = [2, 4, 5][r(0, 2)], v = n * r(5, 30) * 10; text = `A $${v} budget is split across ${n} channels. Per channel?`; ans = v / n; break; }
    default: { const goal = r(20, 40), have = r(5, goal - 3); text = `Goal: ${goal} leads. You have ${have}. How many more?`; ans = goal - have; isMoney = false; }
  }
  const opts = new Set([ans]);
  while (opts.size < 3) {
    const d = Math.max(1, Math.round(ans * 0.1)) * r(1, 3) * (Math.random() < 0.5 ? -1 : 1);
    if (ans + d > 0) opts.add(ans + d);
  }
  const fmt = (v) => (isMoney ? "$" + v : "" + v);
  return { text, answer: fmt(ans), options: shuffle([...opts]).map(fmt) };
}

