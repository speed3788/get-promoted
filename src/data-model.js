/**
 * DATA MODEL — Get Promoted! v2
 *
 * Plain objects and factory functions (not classes) so everything here is
 * trivially JSON-serializable for sending over PeerJS later.
 *
 * See docs/GAME-DESIGN.md for the full rules this code implements, and
 * docs/BALANCE-NOTES.md for why specific numbers were chosen.
 */

// ---- Task tiers ---------------------------------------------------------

const TASK_TIERS = {
  easy: {
    minValue: 5,
    maxValue: 8,
    outerCapSeconds: 4,
    flavors: [
      "staplerFrenzy",
      "coverYourTracks",
      "inboxZeroRush",
      "postItPanic",
      "copierMeltdown",
    ],
  },
  medium: {
    minValue: 12,
    maxValue: 19,
    outerCapSeconds: 6,
    // Speed depends on which retry pass succeeded, not raw elapsed time.
    speedByPass: { 1: 1.5, 2: 1.0, 3: 0.6 },
    accuracyByResult: { perfect: 1.0, good: 0.7 },
    flavors: ["perfectSend", "nailThePitch", "holdTheLine", "closingTheDeal"],
  },
  hard: {
    minValue: 30,
    maxValue: 45,
    outerCapSeconds: 10, // was 15 with 3 questions; scaled with the chain length
    questionsPerChain: 2, // cut from 3: reading 3 questions took too long
    flavors: ["quarterlyCrunch", "clientCurveball"],
    // Client Curveball answer scoring (Quarterly Crunch is just correct=1/wrong=0)
    curveballScoring: {
      safe: 0.8,
      riskyWin: 1.5,
      riskyLose: 0.2,
      wrong: 0,
    },
  },
};

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

/** Create a new task. On Day 1's opening board, pass tier="easy" explicitly. */
function createTask({ id, tier, flavor }) {
  const config = TASK_TIERS[tier];
  const baseValue =
    config.minValue + Math.random() * (config.maxValue - config.minValue);

  return {
    id,
    tier,
    flavor: flavor || config.flavors[Math.floor(Math.random() * config.flavors.length)],
    baseValue: Math.round(baseValue * 10) / 10,

    state: "available", // "available" | "inProgress" | "completed" | "failed"
    ownerId: null,
    startedAt: null, // ms timestamp, when the player began working it

    // Filled in once resolved:
    accuracy: null,
    speed: null,
    payout: null,
  };
}

/** The universal formula: Payout = Base × Accuracy × Speed. */
function calculatePayout(task) {
  if (task.accuracy == null || task.speed == null) {
    throw new Error(`Task ${task.id} not yet resolved`);
  }
  return Math.round(task.baseValue * task.accuracy * task.speed * 10) / 10;
}

/** Speed for clock-based tiers (Easy): 1.5x near-instant -> 0.5x at cap. */
function speedFromElapsed(elapsedSeconds, outerCapSeconds) {
  const frac = Math.min(Math.max(elapsedSeconds / outerCapSeconds, 0.25), 1.0);
  return 1.5 - ((frac - 0.25) / 0.75) * (1.5 - 0.5);
}

/** Speed for Medium's retry-pass model. */
function speedFromPass(passNumber) {
  return TASK_TIERS.medium.speedByPass[passNumber] ?? 0.5;
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

const BOOSTS = [
  { id: "powerNetworking", tier: "common", effect: "baseValueBonus", amount: 0.10 },
  { id: "doubleEspresso", tier: "common", effect: "speedBonus", amount: 0.15 },
  { id: "itFastTrack", tier: "common", effect: "extraMediumRetry", amount: 1 },
  { id: "executiveAssistant", tier: "uncommon", effect: "widerMediumZones" },
  { id: "legalPreApproval", tier: "uncommon", effect: "noWrongOnHardChains" },
  { id: "hrWellnessStipend", tier: "uncommon", effect: "flatEndOfDayBonus" },
  { id: "aiTokens", tier: "rare", effect: "autoCompleteFirstNEasy", amount: 5 },
  { id: "bribeTheBoss", tier: "rare", effect: "guaranteeMediumHardSlots", amount: 2 },
];

const SABOTAGES = [
  { id: "budgetFreeze", tier: "common", effect: "targetBaseValuePenalty", amount: -0.10 },
  { id: "printerJam", tier: "common", effect: "targetSpeedCap" },
  { id: "replyAllReminder", tier: "common", effect: "targetOuterCapReduction" },
  { id: "itTicketBacklog", tier: "uncommon", effect: "targetMediumZonesShrink" },
  { id: "slackGossip", tier: "uncommon", effect: "randomPopupsOnTarget" },
  { id: "micromanagerWatching", tier: "uncommon", effect: "targetRiskyOutcomeShift" },
  { id: "performanceReview", tier: "rare", effect: "guaranteeTargetEasySlots", amount: 2 },
  { id: "frozenPaycheck", tier: "rare", effect: "targetFirstTasksZeroPayout", minCount: 1, maxCount: 2 },
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
  { id: "mostMistakes", statKey: "mistakesCount", minBonus: 40, maxBonus: 65 },
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
      mistakesCount: 0, // outer-cap fails + wrong Hard answers
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
  TASK_TIERS,
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
  speedFromPass,
  drawShopCards,
  drawAccolades,
  createPlayer,
  applyTaskResult,
  createGameState,
};
