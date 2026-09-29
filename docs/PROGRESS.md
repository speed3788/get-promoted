# Progress / Handoff

**Read this first when resuming.** Update it at the end of every session.

## How to resume in a new chat

Upload `docs/PROGRESS.md`, `docs/GAME-DESIGN.md`, `docs/BUILD-PLAN.md`,
`src/data-model.js`, `src/game.js`, and `index.html`, then say:

> Continue building Get Promoted! Read PROGRESS.md and start the next phase.

(Uploading beats linking — GitHub page fetches can return stale cached copies.)

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
    items go to a permanent inventory
  - Curate screen: pick up to 3 active items; Sabotages pick a target
  - All 16 item effects work for humans and bots (see `fxFor` in game.js)
  - Slack Gossip: pop-ups every 9s, each ignored one multiplies every 4s
  - Bots: "Average" profile, greedy shop, random curate, sabotage the
    richest rival
  - After Day 4's shop/curate: placeholder "Friday is coming" screen

## Decisions made during the build (confirm or change)

- Owned items are permanent and can't be bought twice (shop shows "Owned")
- HR Wellness Stipend pays $25 at end of day
- IT Fast-Track adds one extra 2-second pass to Medium tasks
- Bribe the Boss / Performance Review edit the shared board for now
  (should become a per-player view in Phase 4)
- Bots target the richest rival with Sabotages

## Code map

- `src/data-model.js` — rules and numbers (tiers, odds, items, accolades)
- `src/minigames.js` — all 11 minigames + `runner`, `dragTo`,
  `timingClick`, `holdRelease`, `questionChain`
- `src/game.js`
  - Flow: `startGame` → `startDay` → `tick` → `endDay` → `openShop` →
    `openCurate` → `startDay` (… after Day 4 → `prototypeEnd`)
  - Effects: `fxFor(player)` builds today's modifiers; `settle()` applies
    them to every payout (human and bot)
  - Board: `renderDay`, `updateBoard`, `updateFloor`, `takeTask`, `claim`
  - Bots: `botsTick`, `botPick`, `simulateBot`, `botShop`, `botCurate`
- Dev tip: `index.html?day=10` makes each day 10 seconds for testing

## Next: Phase 4 — networking (PeerJS)

1. Host/Join screen with a 6-character room code (see GAME-DESIGN.md)
2. Host runs everything that exists now (board, bots, settle); clients
   send "claim task i" and "task result" and receive the full state after
   every change
3. Humans replace bots seat by seat; a dropped player's seat becomes a bot
4. Failed tasks return to the shared pool
5. Bribe the Boss / Performance Review become per-player board views
6. Free TURN relay fallback (Open Relay Project) for cross-network play

## Known gaps / TODOs

- No Day 5, Boardroom, networking, or background art yet
- Base value shown on cards; actual payout can be 0.5x-1.5x of it
