# Build Plan

Phased by dependency, not a rigid calendar — each phase should be
genuinely playable/testable before starting the next. Rough total:
**16-22 days**, longer than the original 2-week target since actual
scope (11 task variants, a full economy, real networking) ended up
comparable to the original trimmed v1 plan despite each day being
mechanically simpler.

1. **Core economy, offline (2-3 days)** — single-player, no UI polish:
   task board draw, claim, complete one task end to end with the real
   Payout = Base × Accuracy × Speed formula, Wallet and Career Earnings
   tracking. Prove the numbers work before anything else depends on them.

2. **All minigames built (3-4 days)** — the 5 Easy games, both Medium
   mechanics (with their 4 flavor skins), and both Hard flavors with the
   3-question chain UI. Testable locally with keyboard/mouse standing in
   for 4 players.

3. **Shop, inventory, and day loop (2 days)** — the 5-card shop draw,
   buy/inventory/curate-3 flow, and the Days 1-4 repeat structure. Wire
   in the one bot type (average stats, greedy shop buying) so a full
   4-seat game is playable solo against bots, offline.

4. **Networking (3-4 days)** — PeerJS host/join, room codes, and
   full-state broadcast sync. Test first with two browser tabs on one
   machine, then a second real device, before ever trying it with real
   remote friends. Swap bots for real connections one at a time.
   Highest-risk phase — gets the most time.

5. **Day 5 Projects (1-2 days)** — the 4 shared Projects (2 Medium, 2
   Hard) synced across all connected players, plus the time-saved bonus
   calculation.

6. **Boardroom ending (1-2 days)** — Career Earnings reveal, the 3-of-8
   accolade draw and award sequence, final ranking, and the human-only
   promotion rule.

7. **Art integration and polish (2 days)** — drop in the composited
   background+characters image, wire up the cubicle overlay badges (name
   + Wallet + pop animation), task strip colors/shapes, and the
   Host/Join and Ready Up screens.

8. **Real multi-device playtest buffer (2-3 days)** — non-negotiable.
   This is a networked build and your first one — something will surface
   here that no amount of solo testing would have caught.
