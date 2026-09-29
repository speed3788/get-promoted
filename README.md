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
**Phases 1-2 built**: playable single-player prototype with all 11
minigames — open `index.html` to play. Progress and next steps:
`docs/PROGRESS.md`.

## Project structure

```
get-promoted/
├── README.md                  this file
├── docs/
│   ├── GAME-DESIGN.md          the full design — source of truth
│   ├── BALANCE-NOTES.md        why the numbers are what they are (simulation-backed)
│   ├── BUILD-PLAN.md           the phased build plan
│   ├── PROGRESS.md             what's built, what's next — read when resuming
│   └── BACKLOG.md              the one thing still undecided
├── src/
│   ├── data-model.js           rules and numbers (tasks, shop, accolades)
│   └── game.js                 the game: day loop, board, all minigames
└── index.html                  open this to play
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
