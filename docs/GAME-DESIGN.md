# Get Promoted! — Game Design (v2)

This is the single source of truth for how the game actually works. If code
and this doc ever disagree, this doc is right until we deliberately change it
here first.

## Overview

4 players (empty seats filled by bots), 5 in-game days, each day ~60 seconds
of active play plus an untimed "ready up" gate between days. Players
complete tasks for a Sales/Marketing company to earn money, buy passive
Boosts/Sabotages each night, and compete head-to-head on Day 5. Highest
**Career Earnings** at the end wins the promotion.

## Day structure

- **Days 1-4**: task loop (below), then a shop/inventory night
- **Day 5**: 4 shared "Projects" instead of the personal task loop — see below
- Between every day: a "ready up" button per player — this untimed gap is
  what actually determines real-world match length, not a fixed clock

## Task acquisition

Two-layer system:

1. **Ambient strip** — a row of small color-coded icons (Easy/Medium/Hard,
   by color) sits in front of the Boss, visible to all 4 players at all
   times, including while they're mid-task. Refills one icon at a time as
   they're taken (not a hard reset — always ~4 visible).
2. **Decision screen** — whenever a player needs a new task (Day start, or
   right after finishing one), *their own screen* shows the current live
   pool enlarged: full detail, tier color AND exact dollar value. Since it's
   the same shared pool as the ambient strip, an option can vanish off a
   player's decision screen if someone else takes it first — real-time,
   no same-pixel tap races.

**Day 1 exception**: the very first board shown to all 4 players is
guaranteed all-Easy. Every other day (2-4) starts normally, following that
day's spawn odds below. Day 5 has no board at all.

### Task tier spawn odds (Days 1-4, after Day 1's guaranteed-Easy opening)

| Day | Easy | Medium | Hard |
|---|---|---|---|
| 1 | 60% | 30% | 10% |
| 2 | 50% | 35% | 15% |
| 3 | 40% | 40% | 20% |
| 4 | 33% | 33% | 34% |

## Universal task rules (all tiers)

- A task ends when its objective is met — **not a fixed clock**. Every task
  has an **outer time cap**; blow it without succeeding and the task fails
  outright: no payout, returns to the shared pool for someone else.
- **Payout = Base Value × Accuracy × Speed**
  - **Base Value**: random within the tier's range, rolled per task
  - **Accuracy**: how correctly it was done (tier-specific, see below)
  - **Speed**: rewards finishing fast relative to the outer cap — for
    clock-based tiers (Easy), 1.5× near-instant down to 0.5× at the cap; for
    retry-based tiers (Medium), determined by which attempt succeeded
    (pass 1 = 1.5×, pass 2 = 1.0×, pass 3 = 0.6×); for Hard, based on total
    time across the question chain relative to its cap.

## Easy tier — reflexes · Base $5-8

Go until the objective's met (not a fixed timer). Accuracy is always 1.0
except where noted (mistakes are about timing, not correctness). Outer cap
~4-5s.

| Game | Interaction | How it plays |
|---|---|---|
| Stapler Frenzy | Mash | Mash a button until the staple bar fills to 100% |
| Cover Your Tracks | Drag (static pile) | Drag each doc into the trash until the pile's cleared |
| Inbox Zero Rush | Checklist + confirm | Check every box next to a list of emails, then hit "Clear All" |
| Post-it Panic | Click (static pile) | Click every sticky note until the board's clear |
| Copier Meltdown | Drag (streaming) | Pages keep coming — drag each into the shredder as it appears, until the copier stops |

## Medium tier — precision timing · Base $12-19

A needle/meter has a nested target zone: narrow "Perfect" band inside a
wider "Good" band. Miss both entirely and it loops for another pass (up to
the outer cap of 6s) — Speed drops with each extra pass.

**Accuracy**: Perfect = 1.0, Good = 0.7.

| Flavor | Mechanic | Flavor text |
|---|---|---|
| Perfect Send | Click | Time your email to hit send at the right moment |
| Nail the Pitch | Click | Time your line in a sales call |
| Hold the Line | Hold/Release | Hold a phone call, release when the caller's ready |
| Closing the Deal | Hold/Release | Hold through negotiation tension, release at peak leverage |

## Hard tier — quick thinking / risk · Base $30-45

A chain of 3 rapid multiple-choice questions. Outer cap ~15s for the whole
chain. Chain **Accuracy = average of the 3 questions' scores**.

**Quarterly Crunch** (math): 3 options each, deterministic.
- Correct = 1.0, Wrong = 0

**Client Curveball** (judgment call): 3 options each — Safe / Risky / Wrong.
- Safe = 0.8 guaranteed
- Risky = 50/50 → 1.5 (big win) or 0.2 (big flop) — deliberately +EV
  (average 0.85) to reward bold players over always-safe players
- Wrong (obviously bad choice) = 0

## Economy: Wallet vs. Career Earnings

Two separate numbers per player:
- **Wallet** — current spendable balance. Goes up from tasks, down when
  buying Boosts/Sabotages. This is what you need on hand to shop.
- **Career Earnings** — the actual score. A running total of everything
  ever earned; buying something costs Wallet but never reduces this number.
  This prevents the shop from punishing players for spending.

## Boosts & Sabotages

Bought into a permanent, unlimited **inventory** (can't sell). Before each
new day (including going into Day 5), each player **selects 3** from their
inventory to be active — passive, whole-day effects only, never a
manually-triggered one-time use.

### Shop mechanics

Each night (after Days 1-4 only — no shop after Day 5), every player is
shown **5 cards** drawn from the pool of 16 items, weighted by tier and by
which day it is:

| Item tier | Price | Day 1 odds | Day 2 odds | Day 3 odds | Day 4 odds |
|---|---|---|---|---|---|
| Common | $50-80 | 70% | 55% | 35% | 20% |
| Uncommon | $120-180 | 25% | 35% | 40% | 40% |
| Rare | $250-350 | 5% | 10% | 25% | 40% |

No duplicate items within the same day's 5-card shop.

### Boosts

| Name | Tier | Effect |
|---|---|---|
| Power Networking | Common | +10% Base Value on all tasks, all day |
| Double Espresso | Common | +15% Speed multiplier on everything, all day |
| IT Fast-Track | Common | +1 extra retry pass before Medium tasks fail out |
| Executive Assistant | Uncommon | Wider Perfect/Good zones on Medium tasks, all day |
| Legal Pre-Approval | Uncommon | Hard chains never draw the "Wrong" option |
| HR Wellness Stipend | Uncommon | Flat cash bonus at end of day, regardless of performance |
| AI Tokens | Rare | Auto-completes first 5 Easy tasks claimed today, at max value (Perfect + top Speed) |
| Bribe the Boss | Rare | Your decision screen guarantees 2+ of 4 slots are Medium/Hard, all day |

### Sabotages (target a rival)

| Name | Tier | Effect |
|---|---|---|
| Budget Freeze | Common | Target's Base Value -10% on all tasks, all day |
| Printer Jam | Common | Target's Speed multiplier capped lower, all day |
| Reply-All Reminder | Common | Target's outer time cap shortened slightly, all day |
| IT Ticket Backlog | Uncommon | Target's Medium zones shrink, all day |
| Slack Gossip | Uncommon | Random popups over target's task, random timing/position; ignored popups multiply, eventually covering the whole screen |
| Micromanager Watching | Uncommon | Target's Risky Hard outcomes shift unfavorably |
| Performance Review | Rare | Target's decision screen guarantees 2+ Easy-only slots, all day |
| Frozen Paycheck | Rare | Target's first 1-2 completed tasks each day pay $0 (randomized 1 or 2 each time it's active) |

## Day 5 — Projects (PvP finale)

No board, no shop. All 4 players get the **same task simultaneously**,
called a Project, announced one at a time by the Boss.

- **4 Projects**: Medium, Medium, Hard, Hard (escalating)
- Standard Payout formula applies per player per Project, same as any
  other day
- **Time-saved bonus**: once all 4 Projects are done, compare total time
  spent against the 60-second budget. Bonus = **1% per second saved**,
  applied to the sum of all 4 Projects' payouts.
- A player who finishes early can peek at how the others are doing while
  waiting.
- **Bribe the Boss** and **Performance Review** have nothing to act on
  during Day 5 (no board) — they simply go dormant for the day.

## End game — Boardroom

1. Reveal each player's **Career Earnings** (pre-bonus).
2. Randomly draw **3 of 8** accolade categories. Whoever leads that
   category's tracked stat wins it and gets a **flat bonus** in that
   category's range (see below).
3. Highest Career Earnings after bonuses wins — gets "promoted."

### Accolade pool (3 drawn per game)

| Category | Rewards | Bonus range |
|---|---|---|
| Overtime Grinder | Most total tasks completed | $15-30 |
| Speed Demon | Highest average Speed multiplier | $15-30 |
| Silent Assassin | Most sabotages used on others | $15-30 |
| Big Spender | Most Wallet cash spent on Boosts/Sabotages | $20-35 |
| Perfectionist | Highest average Accuracy | $25-40 |
| Biggest Gambler | Most Risky choices in Client Curveball | $30-50 |
| Most Mistakes | Most outer-cap fails / wrong answers (comeback bonus) | $40-65 |
| Most Sabotaged | Received the most sabotages (comeback bonus) | $40-65 |

These ranges were chosen via simulation (see `docs/BALANCE-NOTES.md`) to
keep accolades capable of shifting the standings by about 1 spot normally,
and 2 spots in a lucky multi-accolade game — without letting 4th place
routinely leapfrog straight to 1st.

## Art & Presentation

**One composited scene**, not separate layered sprites — since characters
never move or animate on their own (all interactivity is task overlays on
top), a single flat-cartoon illustration covers the Boss and all 4 workers
seated at their desks. Which specific character (male/female, which face)
sits in which cubicle is fixed by the art and purely decorative — it does
not map to a specific real player. Player identity is handled entirely by
UI overlay on top of the fixed art, not by the underlying sprite.

Props (stapler, trash can, shredder, inbox, sticky notes, etc.) use
**emoji**, not generated art — free, instant, renders consistently
everywhere. Boost/Sabotage shop cards use a tier-colored border
(gold/silver/bronze) plus a generic icon (up-arrow style for Boosts,
down-arrow/target style for Sabotages) rather than 16 unique illustrations.

**Two background images total**: the empty office (no characters) is the
shared backdrop for every non-gameplay screen — Host/Join, Ready Up, Shop,
and the Boardroom ending — with UI cards sitting on solid opaque surfaces
on top (the office art shows around the edges as atmosphere, doesn't need
a dimming overlay). The composited version (office + Boss + 4 seated
workers) is used only for the live Task screen and Day 5 Projects, where
the actual gameplay and cubicle overlays happen.

### Layout regions (percentages of the composited image)

| Region | X range | Y range |
|---|---|---|
| Boss area | 0-100% | 0-33% |
| Cubicle 1 (top-left) | 0-50% | 33-60.5% |
| Cubicle 2 (top-right) | 50-100% | 33-60.5% |
| Cubicle 3 (bottom-left) | 0-50% | 60.5-100% |
| Cubicle 4 (bottom-right) | 50-100% | 60.5-100% |

These are estimates from the art's natural proportions — re-check against
the actual rendered image once overlay code exists.

### Overlay elements

- **Ambient task icon strip**: horizontal row of ~4 small icons, centered
  around x=50%, y≈28-32% — at the desk edge, just above the cubicle row.
  Color-coded by tier: Easy = green (`#4CAF50`), Medium = amber
  (`#F5A623`), Hard = red (`#E53935`) — the classic difficulty
  convention. Each tier also gets a distinct shape (Easy = circle,
  Medium = square, Hard = triangle) alongside its color, so the strip
  reads correctly for colorblind players glancing quickly at a fast
  board. No illustration beyond the shape/color itself.
- **Per-player badge**: combined name + Wallet in one element,
  `[color dot] PlayerName 💰$[Wallet]`, positioned top-center within that
  player's cubicle region. Shows **Wallet only** — Career Earnings (the
  real score) stays hidden until the Boardroom reveal. Plays a quick
  pop/scale animation whenever the Wallet value changes (task payout,
  purchase).
- **Active-turn highlight**: colored border/glow around a cubicle's full
  region when relevant (exact trigger conditions TBD in screen flow).
- **Task popup anchor** (mini-game modal, Slack Gossip popups): centered
  on that cubicle's monitor, roughly 35% into the quadrant's width, 40%
  into its height (monitors sit slightly left-of-center in each cubicle).

## Bots

Empty seats (fewer than 4 human players) are filled by bots. **One bot
type only** — no Easy/Medium/Hard bot tiers.

- **Stats**: the bot reuses the exact "Average" skill/strategy profile
  already validated by simulation throughout this design (same task
  completion time distributions, same accuracy rates, same mixed-tier task
  selection odds). No separate tuning — it's the same numbers already
  proven to behave like a believable mid-tier player.
- **Full participation**: the bot plays tasks, buys from the shop, curates
  its 3 active items, uses Sabotages against rivals, and plays Day 5
  Projects — nothing is faked or skipped.
- **Shop behavior**: each shop night, the bot buys the single most
  expensive item it can currently afford (simple greedy heuristic). It
  curates its 3 active items by picking randomly from its inventory. This
  is a starting default — revisit if it feels too passive or too lucky in
  playtesting.
- **Never wins**: the bot's Wallet and Career Earnings are genuinely
  earned and displayed like any player's — nothing is artificially capped
  during play. But **only human players are eligible for the promotion**:
  at the Boardroom, if a bot has the highest Career Earnings, the
  highest-scoring human wins instead. Bots remain eligible to win
  end-game accolades (realistic, though it occasionally "wastes" one of
  the 3 drawn categories on a bot instead of a human).

## Networking

**Host-authoritative peer-to-peer via PeerJS.** No backend server — one
player's device is the host and holds the single real copy of game state
(board, wallets, shop, phase); every other device sends inputs (task
claims, minigame actions, purchases) to the host and just renders
whatever the host says happened.

- **Connection reliability**: direct peer-to-peer by default, falling
  back to a free TURN relay (Open Relay Project) when a direct connection
  fails — expected fairly often for players on different networks/cities,
  not just an edge case, since play isn't assumed to be same-wifi only.
- **Room codes**: host generates a short, human-typeable code (e.g.
  `CORP84`), not a raw technical peer ID.
- **State sync**: host broadcasts the entire current game state as one
  message on every change, rather than a diff/patch system. The state is
  small enough (4 players, a handful of numbers each) that this simplicity
  is free — no real bandwidth concern at this scale.
- **Player disconnects mid-game**: host hands that seat to a bot (see
  Bots) for the rest of the match. No mid-match rejoin support.
- **Host disconnects mid-game**: the game ends for everyone. No host
  migration — confirmed acceptable given the "keep this buildable
  quickly" priority.

## Screen flow

Top-level: **Host/Join → Lobby → Days 1-4 (looped) → Day 5 → Boardroom.**

- **Host/Join**: one player hosts (generates a room code), others join
  with it. Layout: a title, two buttons ("Host a game" / "Join a game"),
  and a code-entry field below for the join path. Hosting skips code
  entry entirely — it immediately displays the generated room code big
  on screen with a copy button, ready to share.
- **Lobby**: name entry, empty seats fill with bots, all players ready up
  to start. No character/avatar customization — the composited scene's
  characters are fixed art, not player-assignable (see Art & Presentation).

### Days 1-4 (repeats 4 times)

**Task screen (60s) → Shop → Curate 3 → Ready up**, then loops back to
Task screen for the next day. No recap screen between Task screen and
Shop — the per-cubicle Wallet badges already show earnings live during
play, so a separate summary would be redundant.

- **Task screen**: the composited office scene, live for 60 seconds, with
  the ambient task strip and personal decision screens as described above.
- **Shop**: draw 5 cards from the pool of 16 (day-weighted odds), buy with
  Wallet.
- **Curate 3**: select 3 items from full inventory to be active for the
  next day.
- **Ready up**: untimed gate — waits for all 4 players before advancing.
  Layout: a header ("Day X starting soon" + "N of 4 ready"), a row per
  player reusing the same badge language as the cubicle overlays (color
  dot, name, current Wallet), each with a checkmark once ready or a
  waiting indicator until then, and the local player's own "Ready up"
  button. Bots show as instantly ready — no waiting on them.

### Day 5 and the ending

**Day 5 intro → 4 Projects (2 Medium + 2 Hard) → Time bonus → Boardroom.**

- **Day 5 intro**: the Boss announces the shift to Projects — no board,
  no shop that day.
- **4 Projects**: shared simultaneous tasks, standard payout formula per
  Project.
- **Time bonus**: calculated once all 4 Projects are done (1% per second
  saved under the 60s budget, applied to the sum of all 4).
- **Boardroom**: Career Earnings revealed, 3 of 8 accolades drawn and
  awarded, final ranking determined, winner "promoted."

## Open questions / not yet decided

See `docs/BACKLOG.md`.
