# Progress / Handoff

**Read this first when resuming.** Update it at the end of every session.

## How to resume in a new chat

Upload `docs/PROGRESS.md`, `docs/GAME-DESIGN.md`, `docs/BUILD-PLAN.md`,
`src/data-model.js`, `src/game.js`, and `index.html`, then say:

> Continue building Get Promoted! Read PROGRESS.md and start the next phase.

(Uploading beats linking — GitHub page fetches can return stale cached copies.)

## Releasing an update (important)

`index.html` loads the scripts as `src/game.js?v=8` etc. **Bump that
number (v=8 → v=9) on every release** that changes any `.js` file, and
always upload `index.html` too. Otherwise browsers can keep an old cached
script alongside the new page (this happened once: new index.html + old
game.js drew two offices). If something looks broken after an update,
first try Ctrl+Shift+R.

## How to run it

Open `index.html` in a browser (double-click works, no server needed).
Or enable GitHub Pages: repo Settings → Pages → Branch: main → Save.

## Done

- **Phase 1 — core economy, offline** ✅
  - Title → Days 1-4 (60s each) → end-of-day summary → next day
  - Day 1 opening board all-Easy, then day-by-day spawn odds
  - Board of 4 tasks (tier color + shape + base $), slot refills on claim
  - Payout = Base × Accuracy × Speed, Wallet + Career Earnings, stats
  - Wallet pop animation on payout
- **Phase 2 — all 11 minigames** ✅ (browser-tested, all pay out, no errors)
  - Easy: Stapler Frenzy (mash), Cover Your Tracks (drag to trash),
    Inbox Zero Rush (check all + Clear all), Post-it Panic (click pile),
    Copier Meltdown (drag stream to shredder)
  - Medium: `timingClick` → Perfect Send, Nail the Pitch;
    `holdRelease` → Hold the Line, Closing the Deal (Perfect 1.0 / Good 0.7,
    misses loop, speed from pass/attempt)
  - Hard: `questionChain` → Quarterly Crunch (math), Client Curveball
    (Safe 0.8 / Risky 50-50 1.5 or 0.2 / Wrong 0, 7 scenarios)
  - Stats tracked: tasks, mistakes (per wrong answer + timeouts), risky calls

- **Phase 3 — shop, inventory, curate, effects, bots** ✅ (browser-tested
  over a full 4-day week, zero errors)
  - You + 3 bots (Taylor, Morgan, Riley) share one live board; bots grab
    tasks too, so your options change under you
  - Night shop: 5 day-weighted cards, random price in tier range, bought
    items go to the inventory (consumable: used up after one day)
  - Curate screen: pick up to 3 active items; Sabotages pick a target
  - All 16 item effects work for humans and bots (see `fxFor` in game.js)
  - Slack Gossip: pop-ups every 9s, each ignored one multiplies every 4s
  - Bots: "Average" profile, greedy shop (up to 3 items), random curate, sabotage the
    richest rival
  - After Day 4's shop/curate: placeholder "Friday is coming" screen

- **Phase 4 — multiplayer (PeerJS)** ✅ game logic tested in two browser
  tabs via the local pipe; the PeerJS pipe itself needs a real-internet test
  - Menu: name, Play solo, Host a game, Join with a 6-character code
  - Lobby: room code + copy button, seats, host starts; empty seats → bots
  - Host-authoritative: host runs all rules; everyone renders snapshots
  - Guests play minigames on their own screen, host scores the result
  - Anonymity: snapshots hide rivals' items, targets, and career earnings
  - Failed tasks return to the shared pool
  - Bribe the Boss / Performance Review are per-player private views now
  - Ready-up screen shows who's ready (✅ / ⏳)
  - Guest disconnects mid-game → bot takes the seat, keeps their money
  - Host disconnects → guests see "The host left"

- **Real-internet multiplayer test with a friend** ✅ PeerJS works
- **Phase 5 — Day 5 Projects** ✅ (two-tab test: both players + bots
  finish, time bonus math verified, zero errors)
  - After Day 4's ready-up: Boss intro screen with a 4-second countdown
  - 4 shared Projects (Medium, Medium, Hard, Hard): everyone gets the
    SAME tasks with the SAME pay, and races through them in order
  - Race screen: your current project + everyone's progress bars (x/4)
  - Time bonus: +1% per second saved under the day's budget, applied to
    the 4 projects' total, only if all 4 are finished
  - Day ends when everyone finishes or time runs out
  - Item effects apply (Bribe the Boss / Performance Review / AI Tokens
    do nothing today); a guest who drops mid-race continues as a bot

- **Phase 6 — the Boardroom** ✅ (two-player test: slides stay in sync,
  human-only promotion verified, Play again returns everyone to the lobby)
  - Host-timed slides (4.5s each): career earnings revealed → 3 accolades
    one at a time (standings re-sort, winner highlighted) → PROMOTED stamp
  - Accolades nobody qualifies for (stat is 0) are skipped and replaced
  - **The full game loop is complete: lobby → Days 1-4 → Day 5 → Boardroom**

- **Phase 7 — art and polish** ✅ (checked on 4 screen sizes, zero errors)
  - `assets/office-full.jpg` (Boss + 4 workers) is the stage on Days 1-5;
    `assets/office-empty.jpg` sits behind every other screen. Both
    compressed from ~1.6 MB to ~125 KB
  - Cubicle badges (name + wallet, or Day 5 progress), busy glow, your
    own cubicle outlined; task strip on the Boss's desk (color + shape)
  - Office height adapts to the screen so the whole day screen fits
    without scrolling, from iPhone SE (375x667) to laptops

- **Layout fix after playtest** ✅ the office is now a fixed full-height
  backdrop behind every screen (was cut off on desktop); on live days the
  timer floats over the top wall and tasks float over the lower cubicles.
  Verified on iPhone SE, iPhone 14, and a 1310x1340 desktop: Boss never
  covered, all 4 badges visible, nothing needs scrolling
  - Code: `#scene` in index.html + `setScene(live)` / `hudHtml()` /
    `updateStage()` in game.js

- **Layout pass 2 (v=9)** ✅ task panel anchored right under the Boss's desk
  (about 58% of the office width on desktop); first screen + Lobby cards
  start below the Boss; fixed the HUD bug that showed "Day 1 of 510s" with
  no timer bar. Verified on desktop, iPhone 14, iPhone SE

- **Layout pass 3 (v=10)** ✅ task panel lowered to one fixed spot (same on
  every day); active Boosts/Sabotages moved off the panel onto tags on the
  front of the Boss's desk (`showDeskItems()`, `#deskItems`). Checked on
  desktop, iPhone 14, iPhone SE, small Android: no overlap with the panel

- **Bots can be promoted (v=11)** ✅ highest career earnings wins, bot or
  not; a bot win shows "🤖 Replaced by AI." on the final slide

## Decisions made during the build (confirm or change)

- Items are consumable (your call): locking in your 3 uses them up.
  Duplicates can be bought; each shop card can be bought once per night
- Hard tasks: 2 questions (your call, cut from 3), outer cap 10s
- Shop prices cut to $30-45 / $70-100 / $150-200 after playtesting
  (target: doing well = 2-3 items by night 2); bots buy up to 3 items
- HR Wellness Stipend pays $25 at end of day
- IT Fast-Track adds one extra 2-second pass to Medium tasks
- Bribe the Boss / Performance Review edit the shared board for now
  (should become a per-player view in Phase 4)
- Bots target the richest rival with Sabotages
- Accolade ties: random pick among the tied players
- Accolades with no qualifier (e.g. nobody sabotaged) are skipped and redrawn

## Code map

- `src/data-model.js` — rules and numbers (tiers, odds, items, accolades)
- `src/net.js` — transport: PeerJS (real) or BroadcastChannel (`?local=1`),
  plus the optional Metered TURN config at the top
- `src/minigames.js` — all 11 minigames + `runner`, `dragTo`,
  `timingClick`, `holdRelease`, `questionChain`
- `src/game.js`
  - HOST section: `fxFor`, `settle`, `viewFor`, `startDay`, `endDay`,
    `hostAction` (claim / result / buy / curate / start / again),
    `onClientMessage`, `onClientLeave`, `snapshotFor`, `sync`, bots
  - EVERYONE section: `act` (send an action), `startHosting`, `joinGame`,
    `applySnapshot` → `render` → `renderMenu` / `renderLobby` /
    `renderDay` / `renderNight` (summary → shop → curate → wait) / `renderEnd`
- Dev tips: `?day=10` for 10-second days. `?local=1` to test multiplayer
  in two tabs of one browser (needs a local web server, e.g.
  `python3 -m http.server`, then open http://localhost:8000/?local=1)

## How to play with friends

1. Put the game online with GitHub Pages: repo Settings → Pages →
   Branch: main → Save. Wait a minute; the URL appears on that page.
2. Everyone opens that URL. One person taps Host a game and shares the code.
3. If a friend can't connect (school/work wifi, some carriers), set up the
   free relay: sign up at dashboard.metered.ca, create an app, and paste
   the app name + API key into the top of `src/net.js`.

## Next: Phase 8 — playtest and parked feedback

1. Full multiplayer playtest of the complete game (all 5 days + Boardroom)
2. More Easy minigames (players saw the same 5 too often)
3. Bigger Hard question bank: many more Client Curveball scenarios and
   Quarterly Crunch templates so answers can't be memorized
4. Anything the playtest turns up

## Known gaps / TODOs

- Guests can't rejoin after disconnecting (by design for now)
- Base value shown on cards; actual payout can be 0.5x-1.5x of it

## Splash screen (v=12)

Added `assets/landing.jpg` (user-provided title art) as the very first
screen. `#splash` in index.html sits above everything (z-index 10) until
tapped/Enter, then `dismissSplash()` in game.js hides it and calls
`renderMenu()` — previously `renderMenu()` ran immediately on load.

**Note for next session: verify multi-step sed/python edits actually
wrote to disk before testing.** Two edits in this session silently failed
(an assertion inside a script aborted the whole script BEFORE its
`open(...).write()` line ran), so testing against "changes" that were
never saved. Always re-`grep` for the expected string in the file right
after an edit script runs, especially multi-replacement ones.

## Asset pack review (skipped)

User found a free pixel-art asset pack ("Icons_Essential" + a "Premade
Menus"/"DIY_16x16" UI kit) and asked me to review it. Verdict: skip
entirely — wrong genre (cozy pastel fantasy-RPG style: quests, companions,
torn-paper journal corners) versus this game's flat-cartoon corporate
office, and every game-relevant icon (cash, trash, phone, shopping cart)
already has an emoji doing that job consistently elsewhere. Licenses were
fine (one CC BY 4.0, one free-use) but style mismatch was the dealbreaker.
No files added to the project.

## v2 BUILD — Phase 1 of 3 ✅ (v=13): new engine, all 26 games, both penalties

Design source of truth for v2: the "Locked:" sections in docs/BACKLOG.md
(GAME-DESIGN.md still describes v1 and should be rewritten at the end).

- `data-model.js`: TASK_TIERS replaced by `LADDER` (per-game tiers: workload
  range, time = base + per × workload, penalty "boss"/"hr", flat pay for Easy
  Curveball) + `TIER_PAY` (Hard now $35-55) + `flavorsFor(tier)`. createTask
  rolls workload → pay + cap. Accolade "mostMistakes" → "bossMeetings"
  (stat `lockouts`, shown as "Most 1-on-1s with the Boss").
- `minigames.js` rewritten: 10 games that change rules by tier. Reflex:
  Stapler (M: button hops), Cover Your Tracks (M: signed contracts, H: sort
  TOP SECRET to shredder), Inbox (M: leave Boss mail, H: check only junk;
  color/icon tags; scrolling), Post-it (M: Boss note), Copier (one printer
  tray, jams at 4/2). Charts: Hit the Quota (hold), Budget Pie (click,
  slices chain), Trend Line (click, M/H only). Questions: Quarterly Crunch
  (12 generated templates), Client Curveball (40 scenarios). All content
  banks live at the top of minigames.js (EMAILS, CURVEBALLS, makeMathQ).
- Penalties: `runner().penalize()` / wrong answers → settle() pays $0,
  counts a lockout, sets `lockUntil` (4s). hostClaim rejects while locked;
  clients show `#lockov` (Boss face cropped from office-full.jpg, or 🧑‍💼 HR).
- Bots: `simulateBot` rewritten for the ladder (Average profile, incl.
  Boss/HR penalties + the 4s they lose). Day 5 Projects carry workload/cap/penalty.
- Tested: robot played all 26 versions (all pay; Boss penalty fires on M/H
  question games); HR + Boss penalties triggered deliberately (both $0, 4s
  lockout, claims blocked); full solo week to the Boardroom; two-tab online
  game (guest played a chart game); bots finish Day 5 in ~31s of 60s.
- Testing tip: /tmp-style autoplay helpers read `#pie[data-size]` for the pie.

### Then: v2 BUILD Phase 3 — polish
Pace setting (Frantic/Standard/Relaxed; Day 5 fixed 60s — note Day 5 currently
uses DAY_SECONDS), Boss quote bubble (20-35s cooldown), fail-cuss bubbles for
everyone, Boardroom quips (winner / 4th / bot-win banks), rewrite GAME-DESIGN.md.


## v2 BUILD — Phase 2 of 3 ✅ (v=14): sabotages + boosts

- `data-model.js`: 10 BOOSTS (new: overtime, bribeHR) and 9 SABOTAGES
  (delivery, printerJammed, passwordExpired, surpriseMeeting*, slackGossip*,
  chattyCoworker*, smokeBreak, performanceReview*, frozenPaycheck*;
  * = can target "👥 Everyone else", which costs 2 of 3 loadout slots).
- NEW `src/office-events.js` (loads before game.js): what players SEE —
  interruption screens (delivery/meeting/smoke countdowns, hopping Unjam,
  PIN keypad), Chatty Coworker (CHATS bank, {name} = another player, wrong
  reply chains a new message + moves the window), Slack Gossip (GOSSIP bank,
  new pop-up every 12s, each ignored one doubles every 5s, cap 25, always
  inside the office image), SABOTAGED! stamp, floating "+$X" boost bonus.
- `game.js` host: `fxFor` rebuilt (targets incl. "*", Bribe HR blocks all and
  `bribeNotice` tells the holder); `planInterruptions` + `interruptsTick`
  schedule and fire events (lock-type ones wait until the victim's current
  task ends; bots just lose the time); `settle` computes the boost-only bonus
  and flags the frozen stamp; Performance Review = all 4 slots Easy for the
  first 30s (+ red banner, REVIEW stamps); Overtime = one extra Easy/Medium
  task at night before shopping; hostCurate enforces slot costs.
- Renamed: new sabotage shield is "Bribe HR" (existing Rare boost is already
  called "Bribe the Boss").
- Tested: every sabotage as the victim, Bribe HR, frozen stamp, boost float,
  Overtime, slot limits, a full bot week (bots fire ~13 sabotages), and an
  online guest receiving + clearing Password Expired (sender stays hidden).

## v2 BUILD — Phase 3 of 3 ✅ (v=16): polish — v2 IS COMPLETE

- Pace: menu picker (saved in localStorage) + host can change it in the
  lobby; `taskDaySeconds()` for Days 1-4, `PROJECT_SECONDS` (60) for Day 5;
  snapshots carry `dayLen` for everyone's timer. `?day=N` still forces all days.
- Boss quote bubble (office-events.js `startBossQuotes`, 20-35s).
- Fail bubbles: host's `failed(p)` picks the word (timeouts + penalties) so
  every screen matches; drawn above the task panel so bottom-row cubicles
  are covered too.
- Boardroom roasts: host picks winner/4th-place or bot-win quips in
  `startBoardroom` (banks in office-events.js).
- docs/GAME-DESIGN.md rewritten for v2.
- Tested: pace (solo, Day 5 stays 60s, online lobby), quotes, fail bubbles
  matching across two screens, both Boardroom endings, and a complete online
  match (host + guest + bots) through the Boardroom with zero errors.

## What's next (ideas, nothing scheduled)
- Real playtest of v2 with friends, especially the chart games' speeds and
  the Hard lockout rate (both are simulation estimates).
- Anything the playtest surfaces goes into docs/BACKLOG.md first.
