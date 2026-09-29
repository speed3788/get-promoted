
## Parked: let bots be promoted (playtest feedback)

A player finished 4th in a game with bots and was still promoted, because
the Boardroom only lets humans win. The friend's feedback: that doesn't
feel like a real win. Proposed change: remove the human-only rule so bots
compete normally and can take the promotion. Code: `startBoardroom()` in
`src/game.js` picks `winnerId` from humans only; the "bots can't be
promoted" line is in `renderBoardroom()`. Also update GAME-DESIGN.md's
Bots section ("Never wins").
