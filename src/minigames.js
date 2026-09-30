/**
 * Get Promoted! — all minigames (v2 difficulty ladder). Each game changes its rules by tier.
 * Signature: MINIGAMES[flavor](task, done) → returns { cancel }.
 *   task: { tier, workload, cap, penalty } from createTask() in data-model.js
 *   done({ success, accuracy, speed, mistakes?, risky?, note?, penalty? })
 *   penalty = "boss" | "hr" → host pays $0 and locks the player out (see game.js settle()).
 * Item effects are read from the global `player.fx` (set in game.js).
 */

// ---- Shared helpers ------------------------------------------------------------------------
const secs = (t0) => (performance.now() - t0) / 1000;
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

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

/**
 * Outer time limit shared by every minigame. The cap comes from the task's workload;
 * IT Fast-Track adds time to Medium tasks, Reply-All-style sabotages shrink it.
 */
function runner(task, done, cleanup) {
  const fx = player.fx || {};
  const cap = (task.cap + (task.tier === "medium" ? fx.mediumBonus || 0 : 0)) * (fx.capMul ?? 1);
  const t0 = performance.now();
  let over = false;
  const to = setTimeout(() => finish({ success: false }), cap * 1000);
  function finish(r) { if (over) return; over = true; clearTimeout(to); cleanup && cleanup(); done(r); }
  return {
    t0, cap, finish,
    get over() { return over; },
    win: (extra = {}) => finish({ success: true, accuracy: 1, speed: speedFromElapsed(secs(t0), cap), ...extra }),
    /** A Boss/HR penalty: the whole task pays $0 and the player is locked out. */
    penalize: (mistakes = 1, extra = {}) => finish({ success: true, accuracy: 0, speed: 0.5, mistakes, penalty: task.penalty, ...extra }),
    cancel() { over = true; clearTimeout(to); cleanup && cleanup(); },
  };
}

/** Drag el onto one of `targets` (mouse or touch). onDrop(index) fires on a hit; misses snap back. */
function dragTo(el, targets, onDrop) {
  // ox/oy: the cumulative committed offset so dragging is always relative to where it last rested
  let sx, sy, ox = 0, oy = 0;
  el.onpointerdown = (e) => {
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch {}
    sx = e.clientX; sy = e.clientY;
    el.style.zIndex = 20; // bring to front while dragging
    el.style.transition = "none";
  };
  el.onpointermove = (e) => {
    if (!el.hasPointerCapture?.(e.pointerId)) return;
    el.style.transform = `translate(${ox + e.clientX - sx}px,${oy + e.clientY - sy}px)`;
  };
  el.onpointerup = (e) => {
    el.style.zIndex = "";
    el.style.transition = "";
    const i = targets.findIndex((t) => {
      const r = t.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (i >= 0) {
      onDrop(i); // landed on a target — action fires
    } else {
      // Commit the new position so the item stays where the player moved it
      ox += e.clientX - sx;
      oy += e.clientY - sy;
    }
  };
}

/** Put a draggable/clickable item at a random spot inside a pile box. */
function placeItem(box, html, cls = "") {
  const d = document.createElement("div");
  d.className = "item " + cls;
  d.innerHTML = html;
  d.style.left = 3 + Math.random() * 78 + "%";
  d.style.top = 5 + Math.random() * 62 + "%";
  box.appendChild(d);
  return d;
}

/** Chart closeness bands (Executive Assistant widens them). */
function chartTolerance() {
  const s = player.fx?.zoneScale ?? 1;
  return { perfect: 3 * s, good: 8 * s };
}
function judgeClose(value, target) {
  const tol = chartTolerance(), d = Math.abs(value - target);
  return d <= tol.perfect ? 1 : d <= tol.good ? 0.7 : 0;
}

// ---- Content banks ---------------------------------------------------------------------------
const EMAILS = {
  regular: ["Weekly team sync notes", "Please review attached deck", "Reminder: timesheets due Friday", "Meeting moved to 3pm",
    "Can you send over the Q3 numbers?", "New expense policy update", "Quick sync tomorrow?", "Follow-up from yesterday's call",
    "Updated org chart attached", "Parking garage closed this weekend", "IT maintenance window Saturday", "New hire starting Monday",
    "Please sign the updated NDA", "Slide deck v2 attached", "Can we push our 1:1 to Thursday?"],
  boss: ["Need this by EOD, no exceptions", "Can you hop on a call in 5?", "Re: Re: Re: URGENT", "Saw your calendar is wide open Friday",
    "Let's discuss your performance next week", "Why is this project behind schedule", "Great job on the client call", "Please come to my office"],
  client: ["Following up on our proposal", "When can we expect the invoice?", "Loved the presentation, questions inside",
    "Can we push the deadline a week?", "Re: contract redlines attached", "Excited to move forward!", "Quick question about pricing",
    "Can you resend the last invoice?"],
  junk: ["You won a free cruise!! Click now", "Weekly Synergy Newsletter", "Your package could not be delivered", "Hot singles in your office 👀",
    "Extend your car's warranty today", "URGENT: verify your account now", "🎉 Congrats, you're our lucky visitor!", "Free crypto if you act fast",
    "A mystery relative left you $10,000,000", "You have unclaimed prize money waiting"],
};
const EMAIL_ICON = { regular: "📧", boss: "👔", client: "🤝", junk: "🚩" };

// [situation, safe, risky, wrong, sneakyWrong?]  1-20 gentler (Easy/Medium), 21-40 trickier (Hard)
const CURVEBALLS = [
  ["The client says the invoice never arrived.", "Resend it right away", "Tell them that's not your problem", "Ignore the email entirely"],
  ["The client wants a discount you can't approve.", "Escalate to your manager", "Say yes and hope nobody notices", "Offer to cover the difference yourself"],
  ["You CC'd the client on an internal joke about them.", "Apologize right away", "Say it was a typo", "Reply-all and double down"],
  ["The client asks for something the product can't do.", "Be honest about the limitation", "Say \"absolutely\" and figure it out later", "Put it in writing as a guarantee"],
  ["You're 10 minutes late to a client call.", "Apologize and explain", "Blame technical difficulties", "Just don't show up"],
  ["The client replied-all to 200 people by accident.", "Message them privately", "Reply-all with a joke", "Reply-all asking everyone to unsubscribe"],
  ["The client wants the deck an hour early.", "Send what you have, with a note", "Send last year's deck", "Pretend you never saw the message"],
  ["The client wants to renegotiate mid-contract.", "Loop in your manager first", "Agree to new terms on the spot", "Tell them the contract is the contract, f***ing deal with it"],
  ["The client's check bounced.", "Follow up politely, reissue the invoice", "Joke that \"the check's in the mail\" back", "Post about it in the team Slack"],
  ["You forgot the attachment.", "Send a quick follow-up with it", "Pretend the email sent twice by mistake", "Send nothing and hope they forget"],
  ["The client asks for a reference.", "Ask your happiest client first", "Use one you're not sure is happy", "Make up a glowing quote yourself"],
  ["The client's competitor reaches out to you directly.", "Decline and mention the conflict", "Take the meeting \"just to hear them out\"", "Tell your client to try harder or lose you"],
  ["The client wants a feature that's not on the roadmap.", "Pass it along to product", "Say it's \"basically already planned\"", "Promise it ships next month, no matter what"],
  ["You quoted the wrong price two weeks ago.", "Call and explain the mistake", "Quietly honor it and eat the cost", "Send a new invoice, hope they don't compare"],
  ["The client wants a report number \"adjusted.\"", "Explain you can't do that", "\"Round\" it generously", "Make up whatever number sounds good"],
  ["The client's assistant is overwhelmed and dropping the ball.", "Offer to help coordinate", "Go around them to the client", "Complain about them to your team publicly"],
  ["The client wants you to badmouth a competitor in writing.", "Keep it factual only", "One \"off the record\" jab", "Write exactly what they asked, in an email"],
  ["You sent a contract with last quarter's pricing.", "Send the correction immediately", "Wait to see if they notice", "Hope they sign the wrong one"],
  ["The client wants a favor that's against policy.", "Explain the policy, offer an alternative", "Bend the rule \"just this once\"", "Break it and don't tell anyone"],
  ["The client jokes a competitor offered a better price.", "Ask what it'd take to keep them", "Joke you'll \"look into it\"", "Call their bulls*** to their face"],
  ["The client threatens to leave over a price hike.", "Walk them through the reasoning", "One-time discount to smooth it over", "Tell them prices don't lie, they do", "\"Per our terms of service, this was disclosed\""],
  ["The client's employee is inappropriate with you.", "Document it, loop in your manager", "Address it directly yourself", "Laugh along to keep the peace", "\"I'll circle back on that separately\""],
  ["The client asks you to skip a compliance step \"to save time.\"", "Explain why you can't", "Skip a small, \"harmless\" part", "Skip the whole thing", "\"Let's proceed and circle back on compliance later\""],
  ["A payment is 60 days late and the client's gone quiet.", "Firm, polite follow-up", "Threaten to pause services", "Vague-post about it on LinkedIn", "\"Let's give it more time\""],
  ["Your company oversold the product.", "Be upfront about the real capabilities", "Buy time, hope engineering catches up", "Confirm the false capability", "\"It's on our Q3 roadmap\""],
  ["The client wants to loop in legal over something small.", "Welcome it, stay transparent", "Keep it quick and informal", "Discourage them from looping in legal", "\"Let's keep this between us for now\""],
  ["The client asks your honest opinion of their strategy.", "Balanced, honest feedback", "Tell them what they want to hear", "Trash it in front of their team", "\"That's certainly one approach\""],
  ["The client claims a lower competitor price (it's fake).", "Ask for proof", "Match it anyway", "Call them a liar directly", "\"We can explore pricing flexibility\""],
  ["You're covering a client meeting your coworker forgot.", "Prep fast, cover professionally", "Wing it completely", "Tell the client your coworker forgot them", "\"Our team is aligning internally on this\""],
  ["The client wants a same-day answer that needs real research.", "Give a realistic timeline", "Rough guess, heavily caveated", "Confident made-up answer", "\"Great question, let me follow up\""],
  ["The client asks about a rumored layoff.", "Redirect to official comms", "Vague, noncommittal answer", "Confirm the rumor", "\"I'm not able to comment\" (very awkwardly)"],
  ["The client wants you to trash your old coworker.", "Stay neutral", "Agree vaguely, no specifics", "Fully trash them", "\"I can only speak to my own experience\""],
  ["An exception would set a bad precedent.", "Explain why consistency matters", "Make it quietly, just once", "Make it and tell other clients too", "\"We evaluate case-by-case\""],
  ["The client wants your read on their business idea.", "Ask clarifying questions first", "Optimistic gut reaction", "Bluntly call it terrible", "\"There's definitely a market for that\""],
  ["The client's new hire is in over their head.", "Offer support quietly", "Go over their head", "Point out their mistakes in a group email", "\"Let's sync up to align on next steps\""],
  ["You think their exciting project will fail.", "Raise concerns honestly, kindly", "Stay quiet, hope you're wrong", "Call it doomed in front of their team", "\"I'm cautiously optimistic\""],
  ["The client wants a costly freebie thrown in.", "Explain the real cost", "Throw it in this once", "Promise it free forever", "\"We can look at bundling options\""],
  ["The client wants unofficial priority over a bigger client.", "Explain how priority works", "Quietly bump them up a bit", "Promise them the top spot", "\"You're one of our top priorities\""],
  ["The client asks why the project is over budget.", "Break down the real reasons", "Blame vague \"scope creep\"", "Blame your own team by name", "\"A number of contributing factors\""],
  ["The client's CEO demands something your manager would refuse.", "Loop your manager in first", "Say yes on the spot", "Say no to the CEO yourself", "\"Let me make sure we can deliver on that\""],
];

/** Quarterly Crunch: generated math (nothing to memorize). Easy stays under $100. */
function makeMathQ(tier) {
  const $ = (v) => (v < 0 ? "−$" + -v : "$" + v);
  let text, ans, isMoney = true, trap = null;
  if (tier === "easy") {
    const k = rint(0, 2);
    if (k === 0) { const a = rint(1, 9) * 5, b = rint(1, 19 - a / 5) * 5; text = `You bring in $${a} and $${b} this week. Total?`; ans = a + b; }
    else if (k === 1) { const a = rint(6, 19) * 5, b = rint(1, a / 5 - 1) * 5; text = `Revenue was $${a}, costs were $${b}. Profit?`; ans = a - b; }
    else { const a = rint(2, 9) * 5; text = `A client doubles their $${a} order. New total?`; ans = a * 2; }
  } else if (tier === "medium") {
    const k = rint(0, 3);
    if (k === 0) { const p = pick([10, 15, 20, 25]), v = rint(2, 9) * 100; text = `Client wants ${p}% off a $${v} invoice. Discount?`; ans = (v * p) / 100; }
    else if (k === 1) { const n = rint(2, 6), v = rint(3, 12) * 10; text = `You close ${n} deals worth $${v} each. Total?`; ans = n * v; }
    else if (k === 2) { const n = pick([2, 4, 5]), v = n * rint(5, 30) * 10; text = `A $${v} budget splits across ${n} channels. Per channel?`; ans = v / n; }
    else { const goal = rint(20, 40), have = rint(5, goal - 3); text = `Goal: ${goal} leads. You have ${have}. How many more?`; ans = goal - have; isMoney = false; }
  } else {
    const k = rint(0, 4);
    if (k === 0) { const p = pick([10, 20, 25]), v = rint(2, 8) * 20; text = `What's ${p}% of $${v}?`; ans = (v * p) / 100; }
    else if (k === 1) { const a = rint(1, 5) * 100, b = rint(1, 5) * 100; text = `You close deals worth $${a} and $${b} at a 10% commission. Total commission?`; ans = (a + b) / 10; }
    else if (k === 2) { const v = rint(3, 10) * 40; text = `Client wants 25% off a $${v} invoice. Discount?`; ans = v / 4; }
    else if (k === 3) { const reps = rint(4, 6), avg = rint(3, 9) * 100; text = `$${reps * avg} in sales across ${reps} reps. Average per rep?`; ans = avg; }
    else { const x = pick([10, 20, 50]); text = `Price goes up ${x}%, then down ${x}%. Net change on a $100 item?`; ans = -(x * x) / 100; trap = 0; }
  }
  const n = tier === "hard" ? 4 : 3, opts = new Set([ans]);
  if (trap !== null) opts.add(trap);
  let guard = 0;
  while (opts.size < n && guard++ < 50) {
    const d = Math.max(1, Math.round(Math.abs(ans) * 0.1)) * rint(1, 3) * (Math.random() < 0.5 ? -1 : 1);
    const v = ans + d;
    if (trap !== null || v > 0) opts.add(v);
  }
  const fmt = (v) => (isMoney ? $(v) : String(v)) + (trap !== null && v === 0 ? " (no change)" : "");
  return { text, options: shuffle([...opts]).map((v) => ({ label: fmt(v), kind: v === ans ? "right" : "wrong" })) };
}

/**
 * Shared question UI. options: { label, kind: "right" | "wrong" | "safe" | "risky" }.
 * On a penalty tier, the first wrong answer ends the task with the Boss penalty.
 */
function questionChain(task, done, title, questions, wrongMsg) {
  let iv;
  const run = runner(task, done, () => clearInterval(iv));
  const scores = [];
  let mistakes = 0, risky = 0, note = "";
  const o = openOverlay(`<h3>${title}</h3><p class="muted" id="qn"></p><p class="muted" id="qf"></p>
    <p id="qt" class="qtext"></p><div class="opts" id="qo"></div><p class="muted" id="ql"></p>`);
  iv = setInterval(() => { o.querySelector("#ql").textContent = Math.max(0, run.cap - secs(run.t0)).toFixed(1) + "s left"; }, 100);
  function show(k) {
    const q = questions[k], box = o.querySelector("#qo");
    let opts = q.options;
    if (player.fx?.noWrong) { // Legal Pre-Approval: drop one wrong answer
      const w = opts.findIndex((x) => x.kind === "wrong");
      if (w >= 0) opts = opts.filter((_, i) => i !== w);
    }
    o.querySelector("#qn").textContent = `${k + 1} of ${questions.length}`;
    o.querySelector("#qt").textContent = q.text;
    box.innerHTML = "";
    opts.forEach((opt) => {
      const b = document.createElement("button");
      b.textContent = opt.label;
      b.onclick = () => {
        if (opt.kind === "wrong") {
          mistakes++;
          if (task.penalty) return run.penalize(mistakes, { risky, note: wrongMsg || "" });
          scores.push(0);
        } else if (opt.kind === "right") scores.push(1);
        else if (opt.kind === "safe") scores.push(CURVE_SCORING.safe);
        else {
          risky++;
          const won = Math.random() < (player.fx?.riskyWin ?? 0.5);
          scores.push(won ? CURVE_SCORING.riskyWin : CURVE_SCORING.riskyLose);
          note = won ? "✅ The gamble paid off." : "💥 The gamble backfired.";
          o.querySelector("#qf").textContent = note;
        }
        if (k < questions.length - 1) return show(k + 1);
        run.win({ accuracy: scores.reduce((a, s) => a + s, 0) / scores.length, mistakes, risky, note });
      };
      box.appendChild(b);
    });
  }
  show(0);
  return run;
}

// ---- The games ---------------------------------------------------------------------------------
const MINIGAMES = {
  // ===== 📎 Stapler Frenzy: mash. Medium: the button hops every 8 staples =====
  staplerFrenzy(task, done) {
    const need = task.workload, hop = task.tier === "medium";
    let hits = 0;
    const run = runner(task, done);
    const o = openOverlay(`<h3>📎 Stapler Frenzy</h3><p class="obj">${hop ? "Mash to staple. It jams and jumps every 4 staples!" : "Mash to staple the report."}</p>
      <div class="bar"><div class="fill" id="f"></div></div><div class="pile" id="zone"><button class="big mash" id="mash">Staple</button></div>`);
    const btn = o.querySelector("#mash"), f = o.querySelector("#f");
    btn.onpointerdown = (e) => {
      e.preventDefault();
      f.style.width = (++hits / need) * 100 + "%";
      if (hits >= need) return run.win();
      if (hop && hits % 4 === 0) { btn.style.left = rint(15, 85) + "%"; btn.style.top = rint(18, 82) + "%"; }
    };
    return run;
  },

  // ===== 🗑️ Cover Your Tracks: drag docs to the trash. M: leave signed contracts. H: sort confidential =====
  coverYourTracks(task, done) {
    const tier = task.tier, n = task.workload, hard = tier === "hard";
    const contracts = tier === "medium" ? rint(1, 2) : 0;
    const run = runner(task, done);
    const hint = hard ? "Sort it: <b>TOP SECRET</b> docs go in the <b>shredder</b>, everything else in the <b>trash</b>."
      : contracts ? "Trash every document, but leave the <b>signed contracts</b> on the desk." : "Drag every document into the trash. It never happened.";
    const o = openOverlay(`<h3>🗑️ Cover Your Tracks</h3><p class="obj">${hint}</p><div class="pile" id="pile"></div>
      <div class="bins">${hard ? '<div class="target" id="shred">✂️ Shredder</div>' : ""}<div class="target" id="bin">🗑️ Trash</div></div>`);
    const pile = o.querySelector("#pile"), bin = o.querySelector("#bin"), shred = o.querySelector("#shred");
    const targets = hard ? [shred, bin] : [bin];
    let kinds = Array.from({ length: n }, () => (hard && Math.random() < 0.45 ? "secret" : "doc"));
    if (hard && !kinds.includes("secret")) kinds[0] = "secret";
    if (hard && !kinds.includes("doc")) kinds[1] = "doc";
    let left = n;
    const add = (kind) => {
      const html = kind === "secret" ? '📄<span class="tag red">TOP SECRET</span>' : kind === "contract" ? '📑<span class="tag gold">SIGNED</span>' : "📄";
      const el = placeItem(pile, html, kind);
      dragTo(el, targets, (ti) => {
        el.remove();
        if (kind === "contract") return run.penalize(); // HR: you shredded a signed contract
        if (hard && (kind === "secret") !== (ti === 0)) return run.penalize(); // HR: wrong bin
        if (--left === 0) run.win();
      });
    };
    kinds.forEach(add);
    for (let i = 0; i < contracts; i++) add("contract");
    return run;
  },

  // ===== 📧 Inbox Zero Rush: check boxes, Clear all. M: leave the Boss's. H: check only the junk =====
  inboxZeroRush(task, done) {
    const tier = task.tier, n = task.workload, run = runner(task, done);
    let mail;
    if (tier === "easy") mail = shuffle(EMAILS.regular).slice(0, n).map((s) => ({ s, cat: "regular" }));
    else if (tier === "medium") {
      const b = rint(1, 2);
      mail = shuffle([...shuffle(EMAILS.boss).slice(0, b).map((s) => ({ s, cat: "boss" })), ...shuffle(EMAILS.regular).slice(0, n - b).map((s) => ({ s, cat: "regular" }))]);
    } else {
      const j = rint(Math.ceil(n * 0.35), Math.ceil(n * 0.5)), rest = n - j;
      const others = shuffle([...EMAILS.regular.map((s) => ({ s, cat: "regular" })), ...EMAILS.boss.map((s) => ({ s, cat: "boss" })), ...EMAILS.client.map((s) => ({ s, cat: "client" }))]).slice(0, rest);
      mail = shuffle([...shuffle(EMAILS.junk).slice(0, j).map((s) => ({ s, cat: "junk" })), ...others]);
    }
    const hint = tier === "easy" ? "Check every email, then clear them all." : tier === "medium" ? "Check everything <b>EXCEPT the Boss's emails</b>, then clear. Scroll for more." : "Check <b>ONLY the junk</b>, leave real work alone, then clear. Scroll for more.";
    const o = openOverlay(`<h3>📧 Inbox Zero Rush</h3><p class="obj">${hint}</p>
      <button class="big" id="clr">Clear all</button>
      <div class="inbox ${tier === "easy" ? "" : "scroll"}">` + mail.map((m, i) => `<label class="email cat-${m.cat}"><input type="checkbox" data-i="${i}"> ${EMAIL_ICON[m.cat]} ${m.s}</label>`).join("") + `</div>`);
    const clr = o.querySelector("#clr");
    const nudge = (msg) => { clr.textContent = msg; setTimeout(() => (clr.textContent = "Clear all"), 700); };
    clr.onclick = () => {
      const boxes = [...o.querySelectorAll("input")], checked = (i) => boxes[i].checked;
      if (tier === "easy") return boxes.every((b) => b.checked) ? run.win() : nudge("Check them all first");
      const keep = (m) => (tier === "medium" ? m.cat === "boss" : m.cat !== "junk");
      if (mail.some((m, i) => keep(m) && checked(i))) return run.penalize(); // HR: deleted something important
      if (mail.some((m, i) => !keep(m) && !checked(i))) return nudge(tier === "medium" ? "Some are still unchecked" : "There's still junk in here");
      run.win();
    };
    return run;
  },

  // ===== 📝 Post-it Panic: click notes off. M: don't touch the Boss's red note =====
  postItPanic(task, done) {
    const n = task.workload, boss = task.tier === "medium";
    let left = n;
    const run = runner(task, done);
    const o = openOverlay(`<h3>📝 Post-it Panic</h3><p class="obj">${boss ? "Rip off every note, but <b>NOT the Boss's pink note</b>." : "Rip every sticky note off the board."}</p>
      <div class="pile" id="board" style="background:#c9a36b"></div>`);
    const board = o.querySelector("#board");
    /** Make a note draggable; only a clean tap (no drag) triggers the action. */
    function makeNote(cls, action) {
      const d = placeItem(board, "", "note " + cls);
      let startX, startY, dragging = false;
      d.onpointerdown = (e) => {
        e.preventDefault(); d.setPointerCapture(e.pointerId);
        startX = e.clientX; startY = e.clientY; dragging = false;
        d.style.zIndex = 10; d.style.transition = "none";
      };
      d.onpointermove = (e) => {
        if (!d.hasPointerCapture(e.pointerId)) return;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        if (!dragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) dragging = true;
        if (dragging) {
          // Move note as % of the board
          const r = board.getBoundingClientRect();
          d.style.left = Math.min(90, Math.max(0, (e.clientX - r.left) / r.width * 100)) + "%";
          d.style.top  = Math.min(90, Math.max(0, (e.clientY - r.top)  / r.height * 100)) + "%";
        }
      };
      d.onpointerup = (e) => {
        d.style.zIndex = ""; d.style.transition = "";
        if (!dragging) action.call(d); // clean tap only — d is `this`
      };
      return d;
    }
    for (let i = 0; i < n; i++) makeNote("yellow", function() { this.remove(); if (--left === 0) run.win(); });
    if (boss) makeNote("pink", () => run.penalize());
    return run;
  },

  // ===== 📠 Copier Meltdown: one printer, one tray. Pages pile up → jam (lose 1s, −25%) =====
  copierMeltdown(task, done) {
    const n = task.workload, med = task.tier === "medium", every = med ? 700 : 900, jamAt = med ? 2 : 4;
    let spawned = 0, shredded = 0, jams = 0, jammedUntil = 0, iv;
    const run = runner(task, done, () => clearInterval(iv));
    const o = openOverlay(`<h3>📠 Copier Meltdown</h3><p class="obj">Drag each page into the shredder. If ${jamAt} pages pile up in the tray, it jams.</p>
      <div class="copier"><div class="printer">🖨️</div><div class="tray" id="tray"></div><div class="jam" id="jam" hidden>JAMMED!</div></div>
      <div class="bins"><div class="target" id="shred">✂️ Shredder</div></div><p class="muted" id="cc">0 / ${n} shredded</p>`);
    const tray = o.querySelector("#tray"), shred = o.querySelector("#shred"), jamEl = o.querySelector("#jam"), cc = o.querySelector("#cc");
    const restack = () => [...tray.children].forEach((p, i) => { p.style.top = 6 + i * 6 + "px"; p.style.left = 10 + i * 6 + "px"; });
    function spawn() {
      if (run.over || spawned >= n || performance.now() < jammedUntil || tray.children.length >= jamAt) return;
      spawned++;
      const p = document.createElement("div");
      p.className = "item page";
      p.textContent = "📃";
      tray.appendChild(p);
      restack();
      dragTo(p, [shred], () => {
        p.remove();
        restack();
        cc.textContent = `${++shredded} / ${n} shredded`;
        if (shredded === n) run.win({ accuracy: Math.max(0, 1 - 0.25 * jams), mistakes: jams });
      });
      if (tray.children.length >= jamAt) {
        jams++;
        jammedUntil = performance.now() + 1000;
        jamEl.hidden = false;
        setTimeout(() => (jamEl.hidden = true), 1000);
      }
    }
    spawn();
    iv = setInterval(spawn, every);
    return run;
  },

  // ===== 📊 Hit the Quota: HOLD to grow each bar, release at the target =====
  hitTheQuota(task, done) {
    const k = task.workload, tier = task.tier, fillSecs = { easy: 1.8, medium: 1.6, hard: 1.2 }[tier];
    const step = tier === "easy" ? 10 : 5, labelEvery = tier === "hard" ? 20 : tier === "medium" ? 10 : 20;
    const targets = Array.from({ length: k }, () => step * rint(Math.ceil(20 / step), Math.floor(90 / step)));
    let cur = 0, level = 0, holdStart = null, raf;
    const accs = [];
    const run = runner(task, done, () => cancelAnimationFrame(raf));
    const grid = [...Array(100 / labelEvery + 1).keys()].map((i) => i * labelEvery);
    const o = openOverlay(`<h3>📊 Hit the Quota</h3><p class="obj">Hold to grow each bar. Release at the <b>red line</b>.${tier === "hard" ? " Bars grow fast!" : ""}</p>
      <div class="chart">${grid.map((v) => `<div class="gridline" style="bottom:${v}%"><span>$${v}K</span></div>`).join("")}
        <div class="bars">${targets.map((t, i) => `<div class="barcol"><div class="barwell">
          <div class="tline" style="bottom:${t}%;border-color:#c62828"><span class="tval">$${t}K</span></div><div class="barfill" id="b${i}"></div></div></div>`).join("")}</div></div>
      <p class="muted" id="st">Bar 1 of ${k}</p><button class="big" id="act">Hold</button>`);
    const btn = o.querySelector("#act"), st = o.querySelector("#st");
    const bar = () => o.querySelector("#b" + cur);
    function miss() { level = 0; holdStart = null; bar().classList.add("miss"); setTimeout(() => bar()?.classList.remove("miss"), 250); }
    (function frame() {
      if (run.over) return;
      if (holdStart !== null) {
        level = Math.min(100, (secs(holdStart) / fillSecs) * 100);
        if (level >= 100) miss();
      }
      if (bar()) bar().style.height = level + "%";
      raf = requestAnimationFrame(frame);
    })();
    btn.onpointerdown = (e) => { e.preventDefault(); holdStart = performance.now(); try { btn.setPointerCapture(e.pointerId); } catch {} };
    btn.onpointerup = btn.onpointercancel = () => {
      if (holdStart === null || run.over) return;
      holdStart = null;
      const acc = judgeClose(level, targets[cur]);
      if (!acc) return miss();
      accs.push(acc);
      bar().classList.add(acc === 1 ? "perfect" : "good");
      if (++cur === k) return run.win({ accuracy: accs.reduce((a, b) => a + b, 0) / k });
      level = 0;
      st.textContent = `Bar ${cur + 1} of ${k}`;
    };
    return run;
  },

  // ===== 🥧 Budget Pie: CLICK to stop a sweeping slice at the target % (slices chain) =====
  budgetPie(task, done) {
    const k = task.workload, tier = task.tier, speed = { easy: 40, medium: 50, hard: 70 }[tier]; // % of pie per second
    const depts = shuffle(["Marketing", "Sales", "Events", "Ads", "Travel", "Swag"]).slice(0, k);
    const colors = ["#378ADD", "#D85A30", "#639922", "#7F77DD"];
    const targets = [];
    for (let i = 0, used = 0; i < k; i++) {
      const room = 90 - used - (k - i - 1) * 10;
      const opts = tier === "easy" ? [25, 50].filter((v) => v <= room) : Array.from({ length: 20 }, (_, j) => (j + 1) * (tier === "medium" ? 10 : 5)).filter((v) => v >= 10 && v <= Math.min(40, room));
      const t = pick(opts.length ? opts : [10]);
      targets.push(t);
      used += t;
    }
    let cur = 0, start = 0, size = 0, dir = 1, last = performance.now(), raf;
    const accs = [];
    const run = runner(task, done, () => cancelAnimationFrame(raf));
    const ticks = tier === "medium" ? [0, 90, 180, 270].map((d) => `<div class="tick" style="transform:rotate(${d}deg)"></div>`).join("") : "";
    const o = openOverlay(`<h3>🥧 Budget Pie</h3><p class="obj">Stop each slice at its share of the budget.${tier === "hard" ? " No guides, fast sweep!" : ""}</p>
      <div class="piewrap"><div class="pie" id="pie"></div><div class="pie ghost" id="ghost"></div>${ticks}</div>
      <p class="qtext" id="st"></p><button class="big" id="act">Lock slice</button>`);
    const pie = o.querySelector("#pie"), ghost = o.querySelector("#ghost"), st = o.querySelector("#st");
    const label = () => (st.innerHTML = `<span style="color:${colors[cur]}">●</span> ${depts[cur]}: <b>${targets[cur]}%</b>`);
    function draw() {
      let g = [], a = 0;
      for (let i = 0; i < cur; i++) { g.push(`${colors[i]} ${a}% ${a + targets[i]}%`); a += targets[i]; }
      g.push(`${colors[cur]} ${start}% ${start + size}%`, `#e8e4d8 ${start + size}% 100%`);
      pie.style.background = `conic-gradient(${g.join(",")})`;
      pie.dataset.size = size.toFixed(1); // current slice size (handy for testing)
      ghost.style.background = tier === "easy" ? `conic-gradient(transparent 0 ${start}%, #0003 ${start}% ${start + targets[cur]}%, transparent ${start + targets[cur]}% 100%)` : "none";
    }
    (function frame() {
      if (run.over) return;
      const now = performance.now(), max = 100 - start;
      size += ((now - last) / 1000) * speed * dir;
      last = now;
      if (size >= max) { size = max; dir = -1; }
      if (size <= 0) { size = 0; dir = 1; }
      draw();
      raf = requestAnimationFrame(frame);
    })();
    label();
    o.querySelector("#act").onpointerdown = (e) => {
      e.preventDefault();
      const acc = judgeClose(size, targets[cur]);
      if (!acc) { pie.classList.add("miss"); setTimeout(() => pie.classList.remove("miss"), 250); return; }
      accs.push(acc);
      start += targets[cur];
      if (++cur === k) return run.win({ accuracy: accs.reduce((a, b) => a + b, 0) / k });
      size = 0; dir = 1;
      label();
    };
    return run;
  },

  // ===== 🧮 Quarterly Crunch: generated math. M/H: a wrong answer = Boss penalty =====
  quarterlyCrunch(task, done) {
    const qs = Array.from({ length: task.workload }, () => makeMathQ(task.tier));
    return questionChain(task, done, "🧮 Quarterly Crunch", qs);
  },

  // ===== 🎯 Client Curveball: E Safe/Risky · M +Wrong · H +Sneaky Wrong. M/H: wrong = Boss penalty =====
  clientCurveball(task, done) {
    const pool = task.tier === "hard" ? CURVEBALLS.slice(20) : CURVEBALLS.slice(0, 20);
    const qs = shuffle(pool).slice(0, task.workload).map(([text, safe, risky, wrong, sneaky]) => {
      const options = [{ label: safe, kind: "safe" }, { label: risky, kind: "risky" }];
      if (task.tier !== "easy") options.push({ label: wrong, kind: "wrong" });
      if (task.tier === "hard") options.push({ label: sneaky, kind: "wrong" });
      return { text, options: shuffle(options) };
    });
    return questionChain(task, done, "🎯 Client Curveball", qs, "That's not how we do business here.");
  },
};
