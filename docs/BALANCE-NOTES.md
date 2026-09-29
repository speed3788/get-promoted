# Balance Notes

Numbers in this game weren't picked by feel — several were tested with
Monte Carlo simulations first. This doc records *why* the numbers in
`GAME-DESIGN.md` are what they are, so nobody re-litigates them from
scratch or "fixes" them back to something that already failed.

## Task payout scale (Easy $5-8 / Medium $12-19 / Hard $30-45)

Original ranges (Easy $30-50 / Medium $80-130 / Hard $200-320) were sized
for the old 5-minutes-per-day design. Simulating actual throughput in a
60-second day showed even a weak/unlucky player could earn $400-1000+ in a
single minute — meaning every shop item, even Rare, was trivially
affordable after Day 1 almost every time. Dividing all three ranges by 7
(keeping shop prices fixed) fixed this: a skilled player who specifically
commits to Hard tasks can reliably afford Rare items early; a player who
only grinds Easy tasks, however skilled, tops out below Rare's ceiling
entirely; an average/struggling player mostly affords Common/Uncommon.
This creates real strategic differentiation without needing hand-tuning.

## Task spawn odds (60/30/10 → 33/33/34 across Days 1-4)

The specific split matters less for total earnings (dominated by the
payout scale above) than for *variety and stakes* — how much Medium/Hard
content a player experiences on a given day. Escalating it day-by-day
mirrors the shop's Rare-odds curve, so both systems ramp together as the
week progresses.

## Day 5 structure (4 Projects: Medium, Medium, Hard, Hard)

Tested 3 vs. 4 Projects. 4 Projects increases everyone's final Day 5 total
by roughly 16-21% over 3 Projects, and — usefully — slightly *compresses*
the skill gap (best/worst ratio drops from ~3.9x to ~3.7x), since weaker
players get two shots at the more-forgiving Medium tier instead of one.
Good for a finale: keeps it from being a foregone conclusion.

## Accolade bonus ranges

This is the one that actually caught a real problem. Initial bonus ranges
($40-160 per category) were sized against an artificial Expert/Average/
Average/Novice skill spread, where the natural gap between 1st and 4th
place was so large (~$1,500) that accolades couldn't move the standings at
all. But simulating 4 *similarly-skilled* players (the realistic case for
friends playing together) showed the opposite problem: natural gaps
between ranks were small (~$55-56 typical), and the original bonus ranges
let a 4th-place player who landed just 2 accolades flip to 1st **56.7% of
the time** — a full comeback was nearly a coin flip rather than a rare
moment.

Scaling all ranges to ~40% of the original values (see the final ranges in
`GAME-DESIGN.md`) brought this down to:
- 1 accolade: 1.3% chance of a 4th→1st flip
- 2 accolades: 9.0%
- 3 accolades (requires winning several often-contradictory stat
  categories at once, itself rare): 22.5%

This matches the intended design: accolades can realistically shift the
standings by about 1 spot, occasionally 2 with a lucky multi-accolade
game, but a full last-to-first sweep stays a rare, memorable outcome
rather than a routine one.

**If task payout numbers change later, re-run this simulation** — the
accolade ranges were tuned against the current payout scale and spawn
odds; changing either invalidates this tuning.
