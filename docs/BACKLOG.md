

## Locked: wrong-answer penalty (from the playtest group's idea)

Problem it fixes: random clicking beat reading (~1.7x on Quarterly Crunch,
~3x on Client Curveball) and was rewarded by the Most Mistakes accolade.

- Applies to the question games only (Quarterly Crunch, Client Curveball),
  on Medium and Hard. Easy stays forgiving (Easy Curveball has no wrong answer).
- Any wrong answer: the whole task pays $0, and the player is locked out for a
  flat 4 seconds (same no matter how many were wrong) behind a
  "👔 The Boss wants a 1 on 1 with you" screen (Boss cropped from the office
  art, with a countdown).
- A Risky choice that flops is NOT a wrong answer: no lockout.
- Rough check: a careful reader (~90% right) still gets paid on ~77% of Hard
  Crunch tasks; a random clicker (4 choices) on ~3%, and is locked out almost
  every task. Confirm with the full simulation before building.
- Accolade "Most Mistakes" becomes a roast: "Most 1-on-1s with the Boss" —
  counts lockouts, keeps its $40-65 bonus (far less than what the $0 tasks and
  lost time cost, so it's a consolation prize, not a strategy).
- Bots need lockouts in their simulation too.

## In design: difficulty ladder (replaces "Easy = reflexes, Medium = timing, Hard = thinking")

Decided so far:
- Tier now means difficulty + pay, not type of game. Any game can appear in
  any tier (e.g. Easy Post-it Panic = 6 notes, Hard = 12 notes + a decoy).
- Each game exists in 2-3 tiers, whichever fit naturally (not forced to 3).
- Tier pay ranges stay: Easy $5-8, Medium $12-19, Hard $30-45. Harder
  versions must genuinely take more skill/time, or players will only grab
  red tasks — simulate every version before locking.
- Question games at Easy (e.g. 1 simple math question) are intentionally
  allowed, breaking the old "no reading on Easy" rule.
- This should also shrink the random-clicking exploit (question games become
  a small share of Hard tasks), so re-check the penalty idea above after.

- **Workload ranges set the pay.** Each task rolls its workload within a
  range (e.g. Easy Stapler Frenzy = 10-14 taps instead of a flat 12). The time
  limit scales with the workload, and the pay is placed within the tier's pay
  range by how heavy the roll was (10 taps ≈ $5, 14 taps ≈ $8). So price now
  signals real work instead of luck. Cards show the pay only — the workload
  itself is a surprise.
- **Timing games become chart games.** The 4 current timing games (Perfect
  Send, Nail the Pitch, Hold the Line, Closing the Deal) are REPLACED by chart
  games that keep the click / hold mechanics but make the target a number the
  player must read (friends said the colored zone made them feel like Easy
  games: "no need to read"). Bar graph, pie chart, and line chart versions;
  one shared chart component. Example ladder for a bar graph:
  Easy = 1 bar with a faint target line; Medium = 2 bars, target numbers +
  axis labels only; Hard = 3 bars (e.g. Q1 $20K / Q2 $55K / Q3 $35K), axis
  labels only. Scoring = how close to the target number (Perfect / Good /
  miss) instead of colored bands.

Still to come: more ideas from the user, then a game-by-game pass.

### Locked: reflex games ladder (see the minigame sheet for the full table)
- Stapler Frenzy: Easy 10-14 taps · Medium 22-30 taps + button hops every 8 taps. No Hard.
- Cover Your Tracks: Easy 3-5 docs · Medium 6-8 + 1-2 Signed Contracts to leave · Hard 7-9, CONFIDENTIAL → shredder, rest → trash.
- Inbox Zero Rush: Easy 4-6 · Medium 6-8, leave 1-2 Boss emails, scrolling · Hard 8-10, check only junk, scrolling. Clear all pinned.
- Post-it Panic: Easy 5-7 · Medium 9-12 + one Boss note to leave. No Hard.
- Copier Meltdown: one 🖨️ printer, pages come out into the same tray. Easy 4-6 pages every 0.9s, jams at 4 piled up · Medium 7-9 every 0.7s, jams at 2. Jam = lose 1s, −25%. No Hard.
- Time limit = base + per-item; pay placed in tier range by workload; mistakes −25% each.

### Locked: chart games (replace the 4 timing games) — see the minigame sheet
- Scoring by closeness: Perfect ±3% = 100%, Good ±8% = 70%, farther = miss (that item resets, retry). Accuracy = average. Speed by time.
- Hit the Quota (bar graph, HOLD): Easy 1-2 bars + target line · Medium 2-3, no line, axis every $10K · Hard 3-4, axis every $20K, faster.
- Budget Pie (pie, CLICK, slices chain): Easy 1-2, 25/50/75% + outline · Medium 2-3, 10% steps, ticks every 25% · Hard 3-4, 5% steps, no marks, faster.
- Trend Line (line, CLICK, bumpy line, any crossing counts): Medium 2-3 stops, axis every $10K · Hard 3-4, axis every $20K, faster. No Easy.
- Coverage after reflex + chart: Easy 7 · Medium 8 · Hard 5 (+ question games).

### Locked: question games — see the minigame sheet
- Quarterly Crunch (generated math): Easy 1-2 q, round-number +/−, 3 choices · Medium 2-3 q, today's math, 3 choices · Hard 2-3 q, harder/two-step math, 4 choices with close distractors.
- Client Curveball (bank 7 → ~40, answer order shuffled): Easy 1 scenario (flat), 2 choices Safe/Risky, flat $6.50 pay · Medium 1-2 scenarios, Safe/Risky/Wrong · Hard 2-3 scenarios, Safe/Risky/Wrong/sneaky Wrong.
- FINAL BALANCE: Easy 9 games · Medium 10 · Hard 7 (was 5 / 4 / 2).
- Next: write ~40 Curveball scenarios → simulate all versions + re-check the parked penalty → build.

## Locked: "HR wants a chat" penalty (same logic as the Boss penalty)
- Any conduct mistake → the whole task pays $0 + a flat 4s lockout behind
  "🧑‍💼 HR wants a chat". Applies to: Cover Your Tracks Medium (shredding a
  signed contract) and Hard (CONFIDENTIAL in the wrong bin), Inbox Zero Rush
  Medium (deleting the Boss's email) and Hard (deleting a real email as
  junk), Post-it Panic Medium (pulling the Boss's note). Not Copier jams, not
  chart misses, not Easy. Simulate harshness (one slip wipes a 9-doc task);
  fallback if too harsh: trigger only on the 2nd mistake.

## Locked: sabotage redesign ("you have to feel it")
Playtest: only Slack Gossip was noticed; stat-tweak sabotages were invisible.
Every sabotage now visibly interrupts. Still passive/all-day, still bought and
curated like before. Targets: one player, or "👥 Everyone else" where marked —
choosing Everyone else takes 2 of your 3 loadout slots. Everyone-else
sabotages reveal the sender (the one not hit) — accepted as part of the fun.

| Tier | Sabotage | Target | Effect |
|---|---|---|---|
| Common | 📦 You Have a Delivery | 1 | 2x/day, "Grabbing your package…" locks the board 3-5s |
| Common | 🖨️ Printer's Jammed Again | 1 | 2x/day, tap a hopping "Unjam" 6x before the next task |
| Common | 🔐 Password Expired | 1 | 2x/day, tap a shown 4-digit PIN before the board unlocks |
| Uncommon | 📅 Surprise Meeting | 1 or Everyone | 1x/day, "Quick sync (it's never quick)" locks the board 5s (waits for the current task to finish) |
| Uncommon | 💬 Slack Gossip | 1 or Everyone | Pop-ups double every 5s if left unclosed (see math below); capped at 25 |
| Uncommon | 🙋 Chatty Coworker | 1 or Everyone | Slack-style chat, 20-message bank, see below |
| Uncommon | 🚬 Smoke Break | 2 players | Target + one random other player (never the sender) locked out together 5s: "☁️ On a smoke break with Taylor" |
| Rare | 📋 Performance Review | 1 or Everyone | First 30s of the day: all 4 slots Easy, red "📋 UNDER REVIEW" banner with countdown + "REVIEW" stamps on cards |
| Rare | 🧊 Frozen Paycheck | 1 or Everyone | First 1-2 tasks pay $0 + big red "SABOTAGED!" stamp on the task |

Removed: Budget Freeze, Printer Jam (speed cap), Reply-All Reminder, IT Ticket
Backlog, Micromanager Watching (all invisible stat tweaks), and Fire Drill
(proposed, rejected).

## Open question: Boosts have the same "invisible" problem
+10% pay, +15% speed, etc. may be as unnoticeable as the old sabotages.
Not yet discussed.


## Locked: Slack Gossip doubling interval — 5 seconds

Modeled popup count over time (first popup at t=3s) for several doubling
intervals. Almost any interval under 12s already hits the screen-filling
cap (25) if a player ignores it for the full 60s day — the interval mostly
controls pressure *within one task*, not the whole-day worst case.

| Doubling every | Easy (~5s) | Medium (~7s) | Hard, max (~16s) | Full day ignored (60s) |
|---|---|---|---|---|
| 4s | 1 | 2 | 8 | 25 (capped) |
| **5s (chosen)** | 1 | 1 | 4 | 25 (capped) |
| 7s | 1 | 1 | 2 | 25 (capped) |
| 10s | 1 | 1 | 2 | 25 (capped) |
| 15s | 1 | 1 | 1 | 8 |

5s: does nothing during quick Easy tasks, but quadruples over the course of
a long Hard task — real pressure without maxing out mid-task.

## Locked: popups must stay within the office image

Slack Gossip and Chatty Coworker popups spawn only inside the office
image's bounds, never off-screen, on any screen size/shape. (Was a real
bug in playtest, not a design question.)

## Locked: Chatty Coworker — 20-message bank

Rule caught during writing: if every "right" reply is the deflecting one
and every "wrong" reply is engaging, that's a learnable pattern on its own
(ignore the words, always click the busy-sounding option). Roughly half
the list flips this — sometimes engaging is correct, sometimes deflecting
is correct — so players have to actually read each one.

Named coworkers are `{name}`, filled at render time with a random OTHER
player (bots included, never the victim). A wrong pick shows its reply,
then **a new random message from this same pool loads in the same chat
window** ~0.5s later, and the window nudges to a new screen position.
Only a correct pick ends the chat.

1. "hey do u have 5 min to talk about my fantasy football team" → ✅ "Heads down on a deadline!" / ❌ "Sure, what's up?" → "ok so it all started in week 3…"
2. "did you see my email about the printer codes" → ✅ "Yep, on it!" / ❌ "What email?" → "the one from 3 weeks ago, I'll resend it AGAIN"
3. "quick q — are we allowed to expense parking" → ✅ "I'm not your boss…" / ❌ "Approved!" → "wait you can actually do that? nice"
4. "not to be that guy but you're on mute" → ✅ "Thanks, fixed!" / ❌ "Wait really?" → "yeah for like the last 10 minutes bro"
5. "hey random question, is {name} ok? they seem off" → ❌ "I'll check on them later!" / ✅ "What do you mean?" → "they've been microwaving fish at 8am, that's not normal behavior"
6. "can you approve my PTO request real quick" → ❌ "Approved!" / ✅ "I'm not your boss…" → "ok well I'm putting it in anyway lol"
7. "lol did you see what {name} said in the meeting" → ✅ "Gotta focus, tell me later!" / ❌ "No, what happened" → "they called the CEO 'chief' and he did NOT laugh"
8. "hey so this is awkward but I think I broke the coffee machine" → ❌ "I'll call IT!" / ✅ "How??" → "I just wanted an oat milk latte and now it's making a weird noise, this is such bulls***"
9. "quick vent: my landlord is the actual worst" → ✅ "That sucks, talk later?" / ❌ "What happened" → "he raised my rent $200 with ZERO notice, who does that"
10. "hey can you cover my desk phone for like 10 min" → ❌ "Yep, go ahead!" / ✅ "Sure, why?" → "dentist called, apparently I have 3 cavities, great day"
11. "not to be dramatic but I think {name} is stealing my lunches" → ✅ "I'll help you investigate later!" / ❌ "Are you sure?" → "my turkey sandwich has gone missing 3 times this month, I know it's them"
12. "so weird question but does this smell like gas to you" → ✅ "Call facilities now!" / ❌ "Smell what?" → "just come here a sec, this could be a gas leak"
13. "hey can I vent about my mother-in-law for a sec" → ✅ "Rain check?" / ❌ "Sure" → "so she showed up UNANNOUNCED again and rearranged my pantry"
14. "did HR send you that mandatory training too? it's 4 hours" → ❌ "Doing it later!" / ✅ "4 HOURS?" → "yeah it's about 'synergy,' whatever that means"
15. "hey be honest, is my out-of-office message too much" → ✅ "It's perfect, gotta run!" / ❌ "Let me see it" → pastes a wildly overwritten 6-paragraph out-of-office message
16. "quick one — did you eat the last donut, no judgment" → ❌ "Wasn't me, promise!" / ✅ "Wait, there were donuts?" → "someone's lying to me and I will find out who"
17. "so I may have replied-all to the whole company by accident" → ❌ "Oof, good luck! Gotta run." / ✅ "What did you say??" → "I said 'lol same' to a 200-person thread about layoffs, I'm so f***ed"
18. "can I ask you something kind of personal" → ✅ "Not right now, sorry!" / ❌ "Sure" → "do you think my haircut makes me look like {name}"
19. "hey I think my chair is broken, can you look at it later" → ❌ "Sure, later!" / ✅ "What's wrong with it?" → "it just slowly sinks, I've lost like 4 inches of height today"
20. "not to alarm you but there's a weird smell coming from the fridge" → ✅ "I'll deal with it after this!" / ❌ "What kind of smell" → "like betrayal. someone's forgotten lunch has become sentient"

## Locked: the 5 brainstorm ideas — all fully designed now

### 1. Host picks the day length (pace, not "difficulty")
Lobby setting, host-only, picked once before the match starts, applies to
Days 1-4. Named as a pace, not a difficulty level:
- 🐇 Frantic (1:00) — current default
- 🚶 Standard (1:30)
- ☕ Relaxed (2:00)

Real consequence: longer days = more tasks completed = more total money,
so Relaxed also makes Rare items affordable sooner (the whole economy was
simulated against 1:00 days). Accepted as intentional — Relaxed is meant
to be an easier, friendlier game overall, not just slower-paced.

**Day 5 always stays a fixed 60 seconds**, regardless of the chosen pace —
its structure (4 Projects, the time-bonus math) was built and simulated
specifically around 60s, and the finale should always feel equally tight.

### 2. Two new Boosts
- **Overtime** (Uncommon): while everyone else is in the shop, this player
  gets ONE more task first — a random coin flip between one Easy and one
  Medium game (not a choice). Does nothing on Day 5 (same dormant pattern
  as Bribe the Boss / Performance Review).
- **Bribe** (Rare): protects the holder from sabotage that day. Since
  loadouts lock in simultaneously, a sabotage can still be aimed at a
  Bribe holder — it just silently fails once everyone's locked in (the
  attacker's item is spent for nothing). The victim sees "🤝 They bribed
  the right people" so it reads as a real event, not a bug.

### 3. Day 5 / Boardroom result screen — corporate humor banks

**Winner quips (pick 1 at random):**
"Congrats on the promotion! Your coworkers all hate you now." ·
"Congrats on the promotion! More work for the same pay." · "You're
officially middle management. May God have mercy on your soul." · "Enjoy
the corner office. It has the same wifi as everyone else's desk." ·
"Please disregard the layoffs happening next quarter." · "Promoted! Your
new title comes with zero new benefits." · "HR will be reaching out about
your new 'flexible' hours." · "The pizza party budget got cut to pay for
your raise."

**4th place quips (pick 1 at random):**
"The boss would like to see you in his office." · "Keep this up and
you'll be replaced by AI." · "HR has some 'feedback' for you." · "Your
Performance Improvement Plan starts Monday." · "Maybe try LinkedIn 'Open
to Work' this week." · "The boss said your name wrong in the all-hands.
On purpose." · "Your parking spot has been reassigned." · "Someone
already took your stapler."

**Bot wins — replaces the 2-line format entirely, corporate + pop
culture, pick 1 at random:**
"🤖 Replaced by AI." · "The boss only spent $4 in tokens on this AI." ·
"Terminator was fiction. This was a warning." · "Idiocracy really was a
documentary." · "Skynet started in middle management." · "The machines
don't need a lunch break, or a raise." · "HAL 9000 could not be reached
for comment." · "2001: A Space Odyssey called. It says 'told you so.'" ·
"No humans were promoted in the making of this game."

### 4. Boss motivational quote bubble
Speech bubble by the Boss's face during any live phase (task days and Day
5 Projects), random cooldown of **20-35 seconds** between quotes so it's
never back-to-back. Bank (13):
"Dreams don't work unless you do." · "ABC: Always. Be. Closing." · "Don't
wait for opportunity. Create it." · "Don't watch the clock, do what it
does. Keep going." · "Hustle until your haters ask if you're hiring." ·
"There's no elevator to success, you have to take the stairs." · "Great
things never came from comfort zones." · "Work hard in silence, let your
paycheck do the talking." · "Success is a marathon, not a sprint… but
also hurry up." · "Teamwork makes the dream work." · "Rome wasn't built
in a day, but they were laying bricks every hour." · "Fall seven times,
stand up eight. Then file a report on it." · "Sleep is for people without
deadlines."

### 5. Player speech bubble on task failure
Pops above the cubicle of whoever just failed a task (timeout OR the
wrong-answer penalty), visible to every player, short and censored:
"F*ck!" · "God D*mn it!" · "S**t!" · "Dammit!" · "Are you kidding me?!"

## Locked: Quarterly Crunch math templates (12, up from 4)

Templates, not fixed questions — numbers randomize every time, nothing to
memorize.

**Easy — round numbers, one step, all under $100 (user's tweak: was $10Ks)**
1. Add it up: "You bring in $40 and $25 this week. Total?"
2. Subtract it out: "Revenue was $90, costs were $30. Profit?"
3. Double it: "A client doubles their $20 order. New total?"

**Medium — today's 4, one step, slightly uneven numbers**
4. Discount: "Client wants 15% off a $400 invoice. Discount?"
5. Deals × price: "You close 3 deals worth $120 each. Total?"
6. Split the budget: "A $1,000 budget splits across 4 channels. Per channel?"
7. Leads needed: "Goal: 25 leads. You have 18. How many more?"

**Hard — toned down after feedback ("too hard"): rounder numbers, only one
deliberate trap question instead of multiple two-step ones**
8. Percentage: "What's 20% of $150?" (was 15% of $360)
9. Multi-deal commission: "You close deals worth $200 and $300 at a 10% commission. Total commission?" (2 round deals, was 3 uneven ones)
10. Bigger discount: "Client wants 25% off a $280 invoice. Discount?" (replaces the discount-then-tax two-step question, which was the hardest one — cut entirely)
11. Per-rep math: "$3,000 in sales across 5 reps. Average per rep?" (rounder numbers)
12. The trap (kept): "Price goes up 20%, then down 20%. Net change on a $100 item?" — most people guess "net zero," which is wrong ($120 → $96, down $4). Numbers kept easy to compute so the trick, not the arithmetic, is the hard part. Wrong-answer choices should include the "cancels out" mistake.


## Locked: Inbox Zero Rush email visual tags

Each email gets a consistent icon + color tint baked into the row, so
players recognize the category by glancing, not reading line by line. The
tag is intrinsic to the email (from the content bank), so it looks the
same on every tier the email happens to appear in.

| Category | Tag |
|---|---|
| 👔 From the Boss | Amber/gold tint |
| 🤝 From a client | Blue tint |
| 📧 Regular work email | Plain, no tint |
| 🚩 Junk | Red tint (reinforces the already-loud subject lines) |

## Locked: Inbox Zero Rush email bank (41, up from 5)

**Regular work emails (15)** — filler on Easy/Medium, "leave alone" on Hard
Weekly team sync notes · Please review attached deck · Reminder: timesheets
due Friday · Meeting moved to 3pm · Can you send over the Q3 numbers? · New
expense policy update · Quick sync tomorrow? · Follow-up from yesterday's
call · Updated org chart attached · Parking garage closed this weekend ·
IT maintenance window Saturday · New hire starting Monday · Please sign the
updated NDA · Slide deck v2 attached · Can we push our 1:1 to Thursday?

**From the Boss (8)** — leave alone on Medium and Hard
Need this by EOD, no exceptions · Can you hop on a call in 5? · Re: Re: Re:
URGENT · Saw your calendar is wide open Friday · Let's discuss your
performance next week · Why is this project behind schedule · Great job on
the client call · Please come to my office

**From a client (8)** — leave alone on Hard
Following up on our proposal · When can we expect the invoice? · Loved the
presentation, questions inside · Can we push the deadline a week? · Re:
contract redlines attached · Excited to move forward! · Quick question
about pricing · Can you resend the last invoice?

**Obvious junk (10)** — the only thing to check on Hard
You won a free cruise!! Click now · Weekly Synergy Newsletter · Your
package could not be delivered · Hot singles in your office 👀 · Extend
your car's warranty today · URGENT: verify your account now · 🎉 Congrats,
you're our lucky visitor! · Free crypto if you act fast · A mystery
relative left you $10,000,000 · You have unclaimed prize money waiting

## Locked: Client Curveball scenario bank (40, up from 7)

Gentler scenarios (1-20, Safe/Risky/Wrong) power Medium and Easy's pool.
Trickier scenarios (21-40, Safe/Risky/Wrong/Sneaky Wrong) power Hard.

**Gentler (1-20):**
1. Invoice never arrived — Resend it right away / Tell them that's not your problem / Ignore the email entirely
2. Client wants an unauthorized discount — Escalate to your manager / Say yes and hope nobody notices / Offer to cover the difference yourself
3. CC'd the client on an internal joke about them — Apologize right away / Say it was a typo / Reply-all and double down
4. Product doesn't do what they're asking — Be honest about the limitation / Say "absolutely" and figure it out later / Put it in writing as a guarantee
5. 10 minutes late to a client call — Apologize and explain / Blame technical difficulties / Just don't show up
6. Client replied-all to 200 people by accident — Message them privately / Reply-all with a joke / Reply-all asking everyone to unsubscribe
7. Client wants the deck an hour early — Send what you have, with a note / Send last year's deck / Pretend you never saw the message
8. Client wants to renegotiate mid-contract — Loop in your manager first / Agree to new terms on the spot / Tell them the contract is the contract, f***ing deal with it
9. Client's check bounced — Follow up politely, reissue the invoice / Joke that "the check's in the mail" back / Post about it in the team Slack
10. Forgot the "attached" file — Send a quick follow-up with it / Pretend the email sent twice by mistake / Send nothing and hope they forget
11. Client asks for a reference — Ask your happiest client first / Use one you're not sure is happy / Make up a glowing quote yourself
12. Client's competitor reaches out to you directly — Decline, mention the conflict / Take the meeting "just to hear them out" / Tell your client to try harder or lose you
13. Client wants a feature not on the roadmap — Pass it along to product / Say it's "basically already planned" / Promise it ships next month, no matter what
14. Quoted the wrong price two weeks ago — Call and explain the mistake / Quietly honor it and eat the cost / Send a new invoice, hope they don't compare
15. Client wants a report number "adjusted" — Explain you can't do that / "Round" it generously / Make up whatever number sounds good
16. Client's assistant is dropping the ball, overwhelmed — Offer to help coordinate / Go around them to the client / Complain about them to your own team publicly
17. Client wants you to badmouth a competitor in writing — Keep it factual only / One "off the record" jab / Write exactly what they asked, in an email
18. Sent a contract with last quarter's pricing — Send the correction immediately / Wait to see if they notice / Hope they sign the wrong one
19. Client wants a favor against policy — Explain policy, offer an alternative / Bend the rule "just this once" / Break it and don't tell anyone
20. Client jokes a competitor offered a better price — Ask what it'd take to keep them / Joke you'll "look into it" / Call their bluff bulls***  to their face

**Trickier, with a Sneaky Wrong (21-40):**
21. Client threatens to leave over a price hike — Walk them through the reasoning / One-time discount to smooth it over / Tell them prices don't lie, they do / Sneaky: "Per our terms of service, this was disclosed" (true, ice cold, solves nothing)
22. Client's employee is inappropriate with you — Document it, loop in your manager / Address it directly yourself / Laugh along to keep the peace / Sneaky: "I'll circle back on that separately" (never does)
23. Client asks you to skip a compliance step "to save time" — Explain why you can't / Skip a small, "harmless" part / Skip the whole thing / Sneaky: "Let's proceed and circle back on compliance later"
24. Payment 60 days late, client's gone quiet — Firm, polite follow-up / Threaten to pause services / Vague-post about it on LinkedIn / Sneaky: "Let's give it more time" (indefinitely)
25. Your company oversold the product — Be upfront about real capabilities / Buy time, hope engineering catches up / Confirm the false capability / Sneaky: "It's on our Q3 roadmap" (it is not)
26. Client wants to loop in legal over something small — Welcome it, stay transparent / Keep it quick and informal / Discourage them from looping in legal / Sneaky: "Let's keep this between us for now"
27. Client asks your honest opinion of their strategy — Balanced, honest feedback / Tell them what they want to hear / Trash it in front of their team / Sneaky: "That's certainly one approach"
28. Client claims a (fake) lower competitor price — Ask for proof / Match it anyway / Call them a liar directly / Sneaky: "We can explore pricing flexibility" (meaningless, sounds like yes)
29. Covering a client meeting your coworker forgot — Prep fast, cover professionally / Wing it completely / Tell the client your coworker forgot them / Sneaky: "Our team is aligning internally on this"
30. Client wants a same-day answer that needs real research — Give a realistic timeline / Rough guess, heavily caveated / Confident made-up answer / Sneaky: "Great question, let me follow up" (forever)
31. Client asks about a rumored layoff — Redirect to official comms / Vague, noncommittal answer / Confirm the rumor / Sneaky: "I'm not able to comment" (delivered so awkwardly it confirms it)
32. Client wants you to trash your old coworker — Stay neutral / Agree vaguely, no specifics / Fully trash them / Sneaky: "I can only speak to my own experience" (very pointed tone)
33. An exception would set a bad precedent — Explain why consistency matters / Make it quietly, just once / Make it and tell other clients too / Sneaky: "We evaluate case-by-case" (it's a policy change, dressed up)
34. Client wants your read on their business idea — Ask clarifying questions first / Optimistic gut reaction / Bluntly call it terrible / Sneaky: "There's definitely a market for that" (true of almost anything)
35. Client's new hire is in over their head — Offer support quietly / Go over their head / Point out mistakes in a group email / Sneaky: "Let's sync up to align on next steps"
36. You think their exciting project will fail — Raise concerns honestly, kindly / Stay quiet, hope you're wrong / Call it doomed in front of their team / Sneaky: "I'm cautiously optimistic" (means the opposite)
37. Client wants a costly freebie thrown in — Explain the real cost / Throw it in this once / Promise it free forever / Sneaky: "We can look at bundling options"
38. Wants unofficial priority over a bigger client — Explain how priority works / Quietly bump them up a bit / Promise them the top spot / Sneaky: "You're one of our top priorities" (told to everyone)
39. Client asks why the project is over budget — Break down the real reasons / Blame vague "scope creep" / Blame your own team by name / Sneaky: "A number of contributing factors" (names nothing)
40. Client's CEO personally demands something your manager would refuse — Loop your manager in first / Say yes on the spot / Say no to the CEO yourself / Sneaky: "Let me make sure we can deliver on that" (stalling, dressed as a yes)

## Locked: simulation results and two balance fixes

Simulated (see /home/claude/v2sim/): tier pay-per-second consistency, random
clicking vs. careful reading under the new penalty, and full-day economy
with the entire new game roster. Found two real problems, both fixed:

**Fix 1 — question chains shortened to a flat 2** (was 2-3) on Medium
Quarterly Crunch, Hard Quarterly Crunch, and Hard Client Curveball. Cause:
the penalty fires on ANY wrong answer in the chain, so risk compounded
across 2-3 questions and punished honest, careful players ~50-65% of the
time, not just random clickers.

**Fix 2 — Hard pay range raised to $35-55** (was $30-45), across every
Hard game (reflex, chart, and question alike). Cause: Hard barely
out-earned Easy per second for skilled players, and actually paid WORSE
per second than Easy for weak players — the opposite of intended.

**Confirmed after both fixes:**
- Tier scaling restored: Hard $/s now clearly beats Easy at every skill
  level (was worse than Easy for weak players before the fix).
- Careful-player lockout rate dropped from 51-65% to 22-58% — the
  remainder is the accepted trade-off (Hard punishes mistakes, that's why
  it pays well), to be fine-tuned by real playtesting.
- Random clicking still crushed: $0.37-1.38/s vs. $1.9-3.5/s for careful
  play, locked out 75-94% of the time. Exploit stays dead.
- Full-day economy back in line with the original tuning (Novice $48 vs.
  old $57, Average $145 vs. $157, Expert $320 vs. $310-410).

Simulation caveat: skill-probability inputs (chance of a right answer,
chance of a Perfect chart hit, etc.) are estimates for modeling purposes,
not measured from real play — expect the real playtest to want further
small tuning, especially the remaining Hard lockout rate.
