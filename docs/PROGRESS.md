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

## Code map (src/game.js)

- Flow: `titleScreen` → `startGame` → `startDay` → `tick` → `endDay`
- Board: `renderBoard`, `claim`, `finishTask`
- Helpers: `runner` (outer-cap timer, every minigame uses it), `dragTo`,
  `spawnItems`, `openOverlay`
- `MINIGAMES` object: one entry per flavor id from `data-model.js`

## Next: Phase 3 — shop, inventory, day loop, bot

1. After each of Days 1-4: shop screen, 5 cards
   via `drawShopCards(day)`, buy with Wallet (random price in tier range),
   items go to `player.inventory` (unlimited, no selling)
2. Curate screen: pick up to 3 from inventory → `player.activeToday`
3. Apply effects during the next day (see Boosts/Sabotages tables in
   GAME-DESIGN.md) — Sabotages need a target picker
4. Bot: 3 bot players using the "Average" profile (simulated task results
   on a timer, greedy shop buying, random curation); they need visible
   Wallets (cubicle badges come in Phase 7, a simple list is fine now)

## Known gaps / TODOs

- Failed tasks are discarded; in multiplayer they return to the pool (Phase 4)
- No shop, bots, Day 5, Boardroom, networking, or background art yet
- Base value shown on cards; actual payout can be 0.5×–1.5× of it
