# Get Promoted! — Game Design (v2)

The single source of truth for how the game works. If code and this doc
disagree, fix one of them on purpose. History and reasoning behind the
numbers: `docs/BALANCE-NOTES.md` and the "Locked:" sections of `docs/BACKLOG.md`.

## Overview

A 4-player Sales/Marketing office party game (empty seats filled by bots).
Five in-game days. Days 1-4: grab tasks from the Boss, finish them fast for
cash, then spend it each night on Boosts for yourself and Sabotages for your
coworkers. Day 5: everyone races through the same 4 Projects. The Boardroom
reveals everyone's Career Earnings, hands out 3 accolades, and promotes the
top earner — human or bot. Plays on phones and computers (touch or mouse).

## Match structure

- **Splash screen** (tap to begin) → **Menu** (name, day length, solo / host
  / join) → **Lobby** (online only) → **Days 1-4** → **Day 5** → **Boardroom**.
- **Day length (the host's pace pick)** applies to Days 1-4:
  🐇 Frantic 1:00 · 🚶 Standard 1:30 · ☕ Relaxed 2:00. Longer days mean more
  tasks and more money, so Relaxed is also an easier, friendlier game.
  **Day 5 is always 60 seconds.**
- **Nights (after Days 1-4):** summary → Supply Closet (shop) → loadout
  (pick tomorrow's items) → ready up. The next day starts when everyone is
  ready; bots are always ready.

## The board

- Four task cards are available at a time, shared by everyone: take one and
  its slot refills instantly. A small strip on the Boss's desk shows the four
  tiers at a glance (Easy ● green circle, Medium ■ amber square, Hard ▲ red
  triangle — shape + color for colorblind players).
- Cards show the tier, the game, and the pay. The workload is a surprise.
- Day 1 opens with an all-Easy board. After that, new cards follow the
  day's odds: Day 1 60/30/10, Day 2 50/35/15, Day 3 40/40/20,
  Day 4 33/33/34 (Easy/Medium/Hard %).
- A task that runs out of time pays nothing and goes back on the board.

## The difficulty ladder

**Tier means difficulty and pay, not the type of game.** Each game exists
in 2-3 tiers. Every version rolls a **workload** in a range; the **time
limit** is base + (per-item × workload); the **pay** sits in the tier's range
according to how heavy the roll was.

**Tier pay:** 🟢 Easy $5-8 · 🟨 Medium $12-19 · 🔺 Hard $35-55.

**Payout = Base × Accuracy × Speed.** Speed is 1.5× if you finish within the
first 25% of the time limit, sliding to 0.5× at the limit.

| Game | 🟢 Easy | 🟨 Medium | 🔺 Hard |
|---|---|---|---|
| 📎 Stapler Frenzy (mash) | 10-14 taps · 1s+0.25s/tap | 22-30 taps, button hops every 8 · 1.5s+0.25s/tap | — |
| 🗑️ Cover Your Tracks (drag to trash) | 3-5 docs · 1s+0.9s/doc | 6-8 docs + 1-2 signed contracts to leave (HR) · 1.5s+0.8s/doc | 7-9 docs: TOP SECRET → shredder, rest → trash (HR) · 1.5s+1.0s/doc |
| 📧 Inbox Zero Rush (check + Clear all) | 4-6 emails · 1s+0.6s | 6-8, leave the Boss's emails, scrolls (HR) · 2s+0.6s | 8-10, check only the junk, scrolls (HR) · 2.5s+0.9s |
| 📝 Post-it Panic (click) | 5-7 notes · 1s+0.4s | 9-12 + the Boss's red note to leave (HR) · 1.5s+0.4s | — |
| 📠 Copier Meltdown (drag pages from one printer tray) | 4-6 pages every 0.9s, jams at 4 piled · 1s+1.0s | 7-9 every 0.7s, jams at 2 · 1.5s+0.8s | — |
| 📊 Hit the Quota (hold to grow bars) | 1-2 bars, target line shown · 1.5s+2.2s | 2-3, axis every $10K · 2s+2.2s | 3-4, axis every $20K, faster · 2.5s+2.2s |
| 🥧 Budget Pie (stop a sweeping slice) | 1-2 slices, 25/50%, outline shown · 1.5s+2.4s | 2-3, 10% steps, ticks every 25% · 2s+2.4s | 3-4, 5% steps, no marks, faster · 2.5s+2.2s |
| 📈 Trend Line (stop a dot at a sales value) | — | 2-3 stops, axis every $10K · 2s+2.5s | 3-4, axis every $20K, faster · 2.5s+2.3s |
| 🧮 Quarterly Crunch (math) | 1-2 questions, under $100, 3 choices · 1.5s+3s | 2 questions, 3 choices (Boss) · 2s+3s | 2 questions, 4 choices incl. a trap (Boss) · 2.5s+3.5s |
| 🎯 Client Curveball (handle a client) | 1 scenario, Safe/Risky only, flat $6.50 · 5.5s | 1-2 scenarios, Safe/Risky/Wrong (Boss) · 2s+4s | 2 scenarios, + a sneaky Wrong (Boss) · 2.5s+4.5s |

Totals: 🟢 9 games · 🟨 10 games · 🔺 7 games.

**Accuracy rules:**
- Reflex games: 100% unless a mistake applies. Copier jams cost −25% each
  (and 1 second).
- Chart games: closeness to the target. Within 3 = Perfect (100%), within 8
  = Good (70%), farther = a miss (that bar/slice/stop resets; try again).
  Accuracy is the average.
- Curveball: Safe 80%, Risky a coin flip (150% or 20%), Wrong 0%. Quarterly
  Crunch: right 100%, wrong 0% (Easy only; see penalties).

**Content:** 41 emails (tagged 👔 Boss / 🤝 client / 📧 regular / 🚩 junk,
with matching tints), 40 Curveball scenarios (20 gentler, 20 trickier),
12 math templates (numbers randomized every time). All at the top of
`src/minigames.js`. Answer order is shuffled every time.

## Penalties: "The Boss wants a 1 on 1" and "HR wants a chat"

- **Boss:** any wrong answer in Quarterly Crunch or Client Curveball on
  Medium/Hard. **HR:** a conduct mistake in the games marked (HR) above.
- Either one: the **whole task pays $0** and the player is **locked out for
  4 seconds** behind a screen (the Boss's face, or 🧑‍💼 HR). A Risky choice
  that backfires is not "wrong" — no penalty.
- Easy never penalizes. Lockouts count toward the "Most 1-on-1s with the
  Boss" accolade.

## Economy

- **Wallet** (spendable) vs **Career Earnings** (the score; spending never
  lowers it). Other players' Career Earnings stay hidden until the Boardroom.
- **Shop:** 5 cards per night, no duplicates, each bought at most once that
  night. Items are **consumable**: each works for one day, then it's gone.
  Duplicates can be stockpiled.

| Item tier | Price | Night 1 | Night 2 | Night 3 | Night 4 |
|---|---|---|---|---|---|
| Common | $30-45 | 70% | 55% | 35% | 20% |
| Uncommon | $70-100 | 25% | 35% | 40% | 40% |
| Rare | $150-200 | 5% | 10% | 25% | 40% |

- **Loadout:** 3 slots per day. Targeting "👥 Everyone else" uses 2 slots.

### Boosts (help yourself)

| Boost | Tier | Effect |
|---|---|---|
| Power Networking | Common | +10% pay on every task |
| Double Espresso | Common | +15% speed bonus |
| IT Fast-Track | Common | +2 seconds on every Medium task |
| Executive Assistant | Uncommon | Wider Perfect/Good bands on chart games |
| Legal Pre-Approval | Uncommon | Question games drop one wrong answer |
| HR Wellness Stipend | Uncommon | +$25 at the end of the day |
| Overtime | Uncommon | One extra task (random Easy/Medium) at night while everyone else shops |
| AI Tokens | Rare | First 5 Easy tasks finish themselves at max pay |
| Bribe the Boss | Rare | At least 2 Medium/Hard tasks on your own board |
| Bribe HR | Rare | Blocks every sabotage aimed at you that day (you're told how many) |

When a boost adds money, a green **+$X** (the boost's share only) floats up;
non-money boosts show a small label when they kick in.

### Sabotages (hinder a rival) — every one visibly interrupts

| Sabotage | Tier | Target | What the victim sees |
|---|---|---|---|
| 📦 You Have a Delivery | Common | 1 player | 2× a day, "Grabbing your package…" locks the board 3-5s |
| 🖨️ Printer's Jammed Again | Common | 1 player | 2× a day, tap a hopping Unjam button 6 times |
| 🔐 Password Expired | Common | 1 player | 2× a day, type a shown 4-digit PIN (a wrong digit starts over) |
| 📅 Surprise Meeting | Uncommon | 1 or everyone | Once a day, a 5s "quick sync" locks the board |
| 💬 Slack Gossip | Uncommon | 1 or everyone | Pop-ups; each one left open doubles every 5s (max 25) |
| 🙋 Chatty Coworker | Uncommon | 1 or everyone | 3× a day, a Slack chat (20-chat bank) that only the right reply ends; wrong replies keep it going and move the window |
| 🚬 Smoke Break | Uncommon | 2 players | Target + one random coworker (never the sender) stuck outside 5s together |
| 📋 Performance Review | Rare | 1 or everyone | First 30s of the day: Easy tasks only, red banner, REVIEW stamps |
| 🧊 Frozen Paycheck | Rare | 1 or everyone | First 1-2 tasks pay $0, with a SABOTAGED! stamp |

- Board-locking interruptions wait until the victim finishes their current
  task. Chats and smoke breaks can land mid-task.
- Pop-ups always stay inside the office picture.
- Senders are anonymous — except that "Everyone else" reveals the one person
  who wasn't hit (accepted as part of the fun).

## Day 5: Projects

- The Boss announces Projects (4-second countdown), then everyone gets the
  **same 4 tasks in the same order** (Medium, Medium, Hard, Hard) with the
  same pay, and races through them. Penalties and sabotages still apply.
- Finishing all 4 earns **+1% per second saved** under 60s, on the total.
- The race is shown on the cubicle badges ("Project 2 of 4").

## The Boardroom

1. Career Earnings revealed.
2. 3 accolades drawn from 8 (skipping any nobody qualifies for; ties broken
   at random), revealed one at a time with standings re-sorting:
   Overtime Grinder, Speed Demon, Silent Assassin ($15-30) · Big Spender
   ($20-35) · Perfectionist ($25-40) · Biggest Gambler ($30-50) ·
   Most 1-on-1s with the Boss, Most Sabotaged ($40-65, comeback bonuses).
3. **PROMOTED** stamp on the top earner — **bots can win.** A human win
   adds a roast for the winner and one for 4th place; a bot win adds an
   "AI took the job" roast (banks in `src/office-events.js`).

## Bots

One bot type with average, simulation-tested skill. Bots claim tasks, get
penalized sometimes, lose time to sabotages, shop greedily (up to 3 items),
curate randomly, and aim sabotages at the richest rival.

## Multiplayer

Host-authoritative, peer-to-peer (PeerJS; optional free TURN relay — see
`src/net.js`). 6-character room codes. The host runs every rule and sends
each player only what they're allowed to see. A guest who drops is replaced
by a bot; if the host leaves, the game ends.

## Art & presentation

- Two backgrounds: the empty office behind menus/night/Boardroom, and the
  office with the Boss + 4 workers on live days. Cards float on top; the
  Boss is never covered. Splash screen: `assets/landing.jpg`.
- Cubicle badges (name + wallet, or Day 5 progress), a glow while a player
  is working, today's items as tags on the Boss's desk.
- The Boss says a "motivational" quote every 20-35 seconds. When anyone
  fails a task, a censored cuss bubble pops over their cubicle on every screen.
