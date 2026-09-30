/**
 * DATA MODEL — Get Promoted! v2
 *
 * Plain objects and factory functions (not classes) so everything here is
 * trivially JSON-serializable for sending over PeerJS later.
 *
 * See docs/GAME-DESIGN.md for the full rules this code implements, and
 * docs/BALANCE-NOTES.md for why specific numbers were chosen.
 */

// ---- Task ladder (v2 redesign — see docs/BACKLOG.md "difficulty ladder") -----
// Tier = difficulty + pay, not type of game. Each game exists in 2-3 tiers.
// Every version rolls a WORKLOAD in [lo, hi]; the time limit is base + per × workload,
// and the pay is placed in the tier's range by how heavy the roll was.
// penalty: "boss" (wrong answer) or "hr" (conduct mistake) → $0 + 4s lockout.

const TIER_PAY = { easy: [5, 8], medium: [12, 19], hard: [35, 55] };
const LOCKOUT_SECONDS = 4;

const LADDER = {
  // reflex games
  staplerFrenzy:   { easy: { wl: [10, 14], t: [1, 0.25] },  medium: { wl: [22, 30], t: [1.5, 0.25] } },
  coverYourTracks: { easy: { wl: [3, 5], t: [4, 0.9] },     medium: { wl: [6, 8], t: [4.5, 0.8], penalty: "hr" },
                     hard: { wl: [7, 9], t: [4.5, 1.0], penalty: "hr" } },
  inboxZeroRush:   { easy: { wl: [4, 6], t: [4, 0.6] },     medium: { wl: [6, 8], t: [5, 0.6], penalty: "hr" },
                     hard: { wl: [8, 10], t: [5.5, 0.9], penalty: "hr" } },
  postItPanic:     { easy: { wl: [5, 7], t: [4, 0.4] },     medium: { wl: [9, 12], t: [4.5, 0.4], penalty: "hr" } },
  copierMeltdown:  { easy: { wl: [4, 6], t: [1, 1.0] },     medium: { wl: [7, 9], t: [1.5, 0.8] } },
  // chart games (replace the 4 old timing games)
  hitTheQuota:     { easy: { wl: [1, 2], t: [4.5, 2.2] },   medium: { wl: [2, 3], t: [5, 2.2] },   hard: { wl: [3, 4], t: [5.5, 2.2] } },
  budgetPie:       { easy: { wl: [1, 2], t: [4.5, 2.4] },   medium: { wl: [2, 3], t: [5, 2.4] },   hard: { wl: [3, 4], t: [5.5, 2.2] } },
  trendLine:       {                                         medium: { wl: [2, 3], t: [5, 2.5] },   hard: { wl: [3, 4], t: [5.5, 2.3] } },
  // question games
  quarterlyCrunch: { easy: { wl: [1, 2], t: [4.5, 3] },     medium: { wl: [2, 2], t: [5, 3], penalty: "boss" },
                     hard: { wl: [2, 2], t: [5.5, 3.5], penalty: "boss" } },
  clientCurveball: { easy: { wl: [1, 1], t: [4.5, 4], flatPay: 6.5 }, medium: { wl: [1, 2], t: [5, 4], penalty: "boss" },
                     hard: { wl: [2, 2], t: [5.5, 4.5], penalty: "boss" } },
};

// Client Curveball scoring: Safe 0.8 guaranteed; Risky a coin flip (+EV on purpose)
const CURVE_SCORING = { safe: 0.8, riskyWin: 1.5, riskyLose: 0.2 };

const flavorsFor = (tier) => Object.keys(LADDER).filter((f) => LADDER[f][tier]);

// Day 1's opening board is a special case handled by the caller (force all
// 4 slots to "easy"); this table governs every board refresh after that,
// on Days 1-4. Day 5 has no board at all.
const TASK_SPAWN_ODDS_BY_DAY = {
  1: { easy: 0.6, medium: 0.3, hard: 0.1 },
  2: { easy: 0.5, medium: 0.35, hard: 0.15 },
  3: { easy: 0.4, medium: 0.4, hard: 0.2 },
  4: { easy: 0.33, medium: 0.33, hard: 0.34 },
};

/** Roll a task tier for a new board slot, per the current day's odds. */
function rollTaskTier(day) {
  const odds = TASK_SPAWN_ODDS_BY_DAY[day];
  const r = Math.random();
  if (r < odds.easy) return "easy";
  if (r < odds.easy + odds.medium) return "medium";
  return "hard";
}

/** Create a task: pick a game that has this tier, roll its workload, derive pay + time limit. */
function createTask({ id, tier, flavor }) {
  const pool = flavorsFor(tier);
  const f = flavor && LADDER[flavor]?.[tier] ? flavor : pool[Math.floor(Math.random() * pool.length)];
  const v = LADDER[f][tier], [lo, hi] = v.wl;
  const workload = lo + Math.floor(Math.random() * (hi - lo + 1));
  const heaviness = hi === lo ? 0.5 : (workload - lo) / (hi - lo);
  const [pLo, pHi] = TIER_PAY[tier];
  const baseValue = v.flatPay ?? pLo + heaviness * (pHi - pLo);
  return {
    id, tier, flavor: f, workload,
    cap: Math.round((v.t[0] + v.t[1] * workload) * 10) / 10, // outer time limit, seconds
    penalty: v.penalty || null,
    baseValue: Math.round(baseValue * 10) / 10,
    state: "available", ownerId: null, startedAt: null,
    accuracy: null, speed: null, payout: null,
  };
}

/** The universal formula: Payout = Base × Accuracy × Speed. */
function calculatePayout(task) {
  if (task.accuracy == null || task.speed == null) {
    throw new Error(`Task ${task.id} not yet resolved`);
  }
  return Math.round(task.baseValue * task.accuracy * task.speed * 10) / 10;
}

/** Speed: 1.5x if finished in the first 25% of the time limit, down to 0.5x at the limit. */
function speedFromElapsed(elapsedSeconds, outerCapSeconds) {
  const frac = Math.min(Math.max(elapsedSeconds / outerCapSeconds, 0.25), 1.0);
  return 1.5 - ((frac - 0.25) / 0.75) * (1.5 - 0.5);
}

// ---- Boosts & Sabotages --------------------------------------------------

const ITEM_TIERS = {
  // Cut from $50-80 / 120-180 / 250-350 after playtesting (see BALANCE-NOTES.md)
  common: { minPrice: 30, maxPrice: 45 },
  uncommon: { minPrice: 70, maxPrice: 100 },
  rare: { minPrice: 150, maxPrice: 200 },
};

// Shop draw odds per day (Days 1-4 only; no shop after Day 5).
const SHOP_ODDS_BY_DAY = {
  1: { common: 0.7, uncommon: 0.25, rare: 0.05 },
  2: { common: 0.55, uncommon: 0.35, rare: 0.1 },
  3: { common: 0.35, uncommon: 0.4, rare: 0.25 },
  4: { common: 0.2, uncommon: 0.4, rare: 0.4 },
};

// v2: every sabotage visibly interrupts the victim (docs/BACKLOG.md "sabotage redesign").
// everyone: true → can target "👥 Everyone else" (costs 2 of the 3 loadout slots).
const BOOSTS = [
  { id: "powerNetworking", tier: "common" },
  { id: "doubleEspresso", tier: "common" },
  { id: "itFastTrack", tier: "common" },
  { id: "executiveAssistant", tier: "uncommon" },
  { id: "legalPreApproval", tier: "uncommon" },
  { id: "hrWellnessStipend", tier: "uncommon" },
  { id: "overtime", tier: "uncommon" },
  { id: "aiTokens", tier: "rare" },
  { id: "bribeTheBoss", tier: "rare" },
  { id: "bribeHR", tier: "rare" },
];

const SABOTAGES = [
  { id: "delivery", tier: "common" },
  { id: "printerJammed", tier: "common" },
  { id: "passwordExpired", tier: "common" },
  { id: "surpriseMeeting", tier: "uncommon", everyone: true },
  { id: "slackGossip", tier: "uncommon", everyone: true },
  { id: "chattyCoworker", tier: "uncommon", everyone: true },
  { id: "smokeBreak", tier: "uncommon" },
  { id: "performanceReview", tier: "rare", everyone: true },
  { id: "frozenPaycheck", tier: "rare", everyone: true },
];

const SHOP_ITEM_CATALOG = [...BOOSTS, ...SABOTAGES];

/** Draw 5 cards for a given day's shop, weighted by that day's tier odds, no duplicates. */
function drawShopCards(day) {
  const odds = SHOP_ODDS_BY_DAY[day];
  const drawn = [];
  const remaining = [...SHOP_ITEM_CATALOG];
  while (drawn.length < 5 && remaining.length > 0) {
    const r = Math.random();
    const tier = r < odds.common ? "common" : r < odds.common + odds.uncommon ? "uncommon" : "rare";
    const candidates = remaining.filter((item) => item.tier === tier);
    const pool = candidates.length > 0 ? candidates : remaining; // fall back if that tier's exhausted
    const pick = pool[Math.floor(Math.random() * pool.length)];
    drawn.push(pick);
    remaining.splice(remaining.indexOf(pick), 1);
  }
  return drawn;
}

// ---- Accolades ------------------------------------------------------------

// 3 of these 8 are drawn at random each game. Ranges are the "~40% scale"
// from docs/BALANCE-NOTES.md — re-run that simulation before changing them.
const ACCOLADES = [
  { id: "overtimeGrinder", statKey: "tasksCompleted", minBonus: 15, maxBonus: 30 },
  { id: "speedDemon", statKey: "avgSpeed", minBonus: 15, maxBonus: 30 },
  { id: "silentAssassin", statKey: "sabotagesUsed", minBonus: 15, maxBonus: 30 },
  { id: "bigSpender", statKey: "walletSpent", minBonus: 20, maxBonus: 35 },
  { id: "perfectionist", statKey: "avgAccuracy", minBonus: 25, maxBonus: 40 },
  { id: "biggestGambler", statKey: "riskyChoicesCount", minBonus: 30, maxBonus: 50 },
  { id: "bossMeetings", statKey: "lockouts", minBonus: 40, maxBonus: 65 }, // "Most 1-on-1s with the Boss" (roast)
  { id: "mostSabotaged", statKey: "sabotagesReceived", minBonus: 40, maxBonus: 65 },
];

function drawAccolades() {
  const shuffled = [...ACCOLADES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

// ---- Player ---------------------------------------------------------------

function createPlayer({ id, name, isBot = false }) {
  return {
    id,
    name,
    isBot,

    wallet: 0, // spendable balance
    careerEarnings: 0, // the actual score — never reduced by spending

    inventory: [], // Boost/Sabotage item ids owned; duplicates allowed, each copy is used up after one day
    activeToday: [], // up to 3 item ids selected for the current day

    // Tracked purely for end-game accolades — see ACCOLADES above.
    stats: {
      tasksCompleted: 0,
      mistakesCount: 0, // outer-cap fails + wrong answers + conduct mistakes
      lockouts: 0, // Boss/HR penalty lockouts (the "Most 1-on-1s with the Boss" accolade)
      riskyChoicesCount: 0,
      speedSum: 0,
      speedCount: 0, // -> avgSpeed = speedSum / speedCount
      accuracySum: 0,
      accuracyCount: 0, // -> avgAccuracy = accuracySum / accuracyCount
      walletSpent: 0,
      sabotagesUsed: 0,
      sabotagesReceived: 0,
    },
  };
}

/** Add a resolved task's payout to a player and update their accolade stats. */
function applyTaskResult(player, task) {
  const payout = calculatePayout(task);
  player.wallet += payout;
  player.careerEarnings += payout;
  player.stats.tasksCompleted += 1;
  player.stats.speedSum += task.speed;
  player.stats.speedCount += 1;
  player.stats.accuracySum += task.accuracy;
  player.stats.accuracyCount += 1;
  return payout;
}

// ---- GameState --------------------------------------------------------------

function createGameState({ hostPlayerId, players }) {
  return {
    day: 1, // 1-5
    phase: "task", // "task" | "shop" | "readyUp" | "projects" | "boardroom"
    board: [], // current ambient/decision pool of available tasks (Days 1-4 only)
    hostPlayerId,
    players,
  };
}

if (typeof module !== "undefined") module.exports = {
  LADDER,
  TIER_PAY,
  LOCKOUT_SECONDS,
  CURVE_SCORING,
  flavorsFor,
  TASK_SPAWN_ODDS_BY_DAY,
  ITEM_TIERS,
  SHOP_ODDS_BY_DAY,
  BOOSTS,
  SABOTAGES,
  SHOP_ITEM_CATALOG,
  ACCOLADES,
  rollTaskTier,
  createTask,
  calculatePayout,
  speedFromElapsed,
  drawShopCards,
  drawAccolades,
  createPlayer,
  applyTaskResult,
  createGameState,
};
