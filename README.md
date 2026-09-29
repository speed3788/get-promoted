# Get Promoted! (Corporate Climber)

A 4-player Sales/Marketing office party game. Complete tasks for cash,
buy passive Boosts/Sabotages each night, and face off directly on Day 5
to see who gets the promotion.

**Format**: 5 days, ~60 seconds of active play per day, untimed "ready up"
gate between days. Mobile-friendly, built to be playable with either touch
or mouse.

## Status

🚧 Full design locked — economy, tasks, shop, Day 5, end game, art, screen
flow, bots, and networking (see `docs/GAME-DESIGN.md`). Ready to build.
See `docs/BUILD-PLAN.md` for the phased plan (~16-22 days) and
`docs/BACKLOG.md` for the one remaining open detail.

## Project structure

```
get-promoted/
├── README.md                  this file
├── docs/
│   ├── GAME-DESIGN.md          the full design — source of truth
│   ├── BALANCE-NOTES.md        why the numbers are what they are (simulation-backed)
│   ├── BUILD-PLAN.md           the phased build plan
│   └── BACKLOG.md              the one thing still undecided
├── src/
│   └── data-model.js           JS shapes for Task/Player/GameState/Shop/Accolades
└── index.html                  (not yet started) the game itself
```

## Read this first

`docs/GAME-DESIGN.md` is the single source of truth for how the game
works — task tiers and mechanics, the universal payout formula, the full
Boosts/Sabotages catalog, Day 5's Project structure, and the end-game
Boardroom sequence. If you're picking this project back up after a break,
start there.

`docs/BALANCE-NOTES.md` explains *why* several of the numbers in the
design doc are what they are — a few were tuned against real Monte Carlo
simulations, not gut feel, and that doc records the reasoning so it
doesn't get accidentally undone later.
