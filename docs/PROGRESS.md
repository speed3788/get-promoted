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
  - If a bot earned the most, the top human is promoted and the screen says why
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
