import { reactive, computed } from 'vue'

// Numbers in play for Cricket (plus the bull, value 25), highest first.
export const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, 25]

// Hits on your own number needed to become a Killer.
export const KILLER_TO_BECOME = 3

// A single reactive game store shared across the app.
const state = reactive({
  started: false,
  mode: 'x01',          // 'x01' | 'cricket' | 'killer'
  startScore: 501,      // x01 only
  doubleOut: false,     // x01 only
  killerLives: 3,       // killer only: starting lives
  legsToWin: 1,
  players: [],          // see freshPlayer()
  turnPointer: 0,       // index of player whose turn it is
  turnDarts: [],        // throws in the current (unfinished) turn
  turnStartScore: 0,    // x01: score at start of turn (for bust revert)
  history: [],          // snapshots for undo
  message: '',          // status line
  winnerId: null,       // set when a player wins the whole match
  legWinnerId: null,    // set briefly when a leg is won
})

function freshPlayer(name, i) {
  return {
    id: i,
    name: name.trim() || `Player ${i + 1}`,
    legs: 0,
    lastTurn: null,
    // x01
    score: state.startScore,
    checkoutDarts: null,
    // cricket
    marks: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 },
    points: 0,
    // killer
    number: 0,          // assigned target number
    lives: 0,
    isKiller: false,
    killerProgress: 0,  // hits on own number so far (0..KILLER_TO_BECOME)
  }
}

// Reset per-leg fields but keep legs won.
function resetPlayerForLeg(p) {
  p.lastTurn = null
  p.checkoutDarts = null
  p.score = state.startScore
  p.marks = { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 }
  p.points = 0
  p.lives = state.killerLives
  p.isKiller = false
  p.killerProgress = 0
}

function snapshot() {
  return JSON.stringify({
    players: state.players,
    turnPointer: state.turnPointer,
    turnDarts: state.turnDarts,
    turnStartScore: state.turnStartScore,
    message: state.message,
    winnerId: state.winnerId,
    legWinnerId: state.legWinnerId,
  })
}

function pushHistory() {
  state.history.push(snapshot())
  if (state.history.length > 300) state.history.shift()
}

function startGame({
  mode, startScore, doubleOut, legsToWin, playerNames,
  playerNumbers, startLives,
}) {
  state.mode = mode || 'x01'
  state.startScore = startScore
  state.doubleOut = doubleOut
  state.killerLives = startLives || 3
  state.legsToWin = legsToWin
  state.players = playerNames.map((name, i) => {
    const p = freshPlayer(name, i)
    if (state.mode === 'killer') {
      p.number = playerNumbers ? playerNumbers[i] : 0
      p.lives = state.killerLives
    }
    return p
  })
  state.turnPointer = 0
  state.turnDarts = []
  state.turnStartScore = startScore
  state.history = []
  state.message = ''
  state.winnerId = null
  state.legWinnerId = null
  state.started = true
}

// Begin a new leg: reset scores/marks, rotate who throws first.
function nextLeg(startingPointer) {
  state.players.forEach(resetPlayerForLeg)
  state.turnPointer = startingPointer % state.players.length
  state.turnDarts = []
  state.turnStartScore = state.startScore
  state.legWinnerId = null
  state.message = ''
}

const currentPlayer = computed(() => state.players[state.turnPointer] || null)

const turnTotal = computed(() =>
  state.turnDarts.reduce((sum, d) => sum + d.score, 0),
)

// Cricket marks hit this turn (for the turn panel).
const turnMarks = computed(() =>
  state.turnDarts.reduce(
    (sum, d) => sum + (CRICKET_NUMBERS.includes(d.value) ? d.multiplier : 0),
    0,
  ),
)

const canThrow = computed(
  () => state.started && state.winnerId === null && state.turnDarts.length < 3,
)

function advanceTurn() {
  // In Killer, skip players who have been eliminated (0 lives).
  let next = state.turnPointer
  for (let k = 0; k < state.players.length; k++) {
    next = (next + 1) % state.players.length
    if (state.mode !== 'killer' || state.players[next].lives > 0) break
  }
  state.turnPointer = next
  state.turnDarts = []
  state.turnStartScore = state.players[next].score
}

// Register one dart. `dart` = { value, multiplier, label, score }
function throwDart(dart) {
  if (!canThrow.value) return
  pushHistory()
  state.legWinnerId = null
  state.turnDarts.push(dart)

  if (state.mode === 'cricket') applyCricketDart(dart)
  else if (state.mode === 'killer') applyKillerDart(dart)
  else applyX01Dart(dart)
}

// ---- X01 ----
function applyX01Dart(dart) {
  const player = currentPlayer.value
  const remaining = player.score - dart.score
  const isDouble = dart.multiplier === 2 || dart.label === 'Bull (50)'

  const bustBelowZero = remaining < 0
  const bustLeavesOne = state.doubleOut && remaining === 1
  const bustBadFinish = remaining === 0 && state.doubleOut && !isDouble

  if (bustBelowZero || bustLeavesOne || bustBadFinish) {
    player.score = state.turnStartScore // revert whole turn
    player.lastTurn = 0
    state.message = `Bust! ${player.name} scored 0 this turn.`
    advanceTurn()
    return
  }

  player.score = remaining

  if (remaining === 0) {
    player.checkoutDarts = state.turnDarts.length
    player.lastTurn = state.turnStartScore
    winLeg(player)
    return
  }

  if (state.turnDarts.length === 3) {
    player.lastTurn = turnTotal.value
    advanceTurn()
  }
}

// ---- Cricket ----
function applyCricketDart(dart) {
  const player = currentPlayer.value
  const n = dart.value
  const marks = dart.multiplier // single=1, double=2, triple=3; bull outer=1, bullseye=2

  if (n !== 0 && CRICKET_NUMBERS.includes(n)) {
    let remaining = marks
    // Fill up to 3 (closing) first.
    if (player.marks[n] < 3) {
      const applied = Math.min(3 - player.marks[n], remaining)
      player.marks[n] += applied
      remaining -= applied
    }
    // Extra marks score points if the number isn't closed by everyone.
    if (remaining > 0 && player.marks[n] >= 3) {
      const allClosed = state.players.every(
        (p) => p.id === player.id || p.marks[n] >= 3,
      )
      if (!allClosed) player.points += n * remaining
    }
  }

  player.lastTurn = turnMarks.value

  // Win: closed every number and not trailing on points.
  if (cricketClosedAll(player) && player.points >= maxOpponentPoints(player)) {
    winLeg(player)
    return
  }

  if (state.turnDarts.length === 3) advanceTurn()
}

function cricketClosedAll(player) {
  return CRICKET_NUMBERS.every((n) => player.marks[n] >= 3)
}

function maxOpponentPoints(player) {
  return state.players.reduce(
    (max, p) => (p.id === player.id ? max : Math.max(max, p.points)),
    0,
  )
}

// ---- Killer ----
function applyKillerDart(dart) {
  const thrower = currentPlayer.value
  const n = dart.value
  const mult = dart.multiplier // single=1, double=2, triple=3

  // Bull (25) and misses (0) belong to no target number — they just use a dart.
  if (n !== 0 && n !== 25) {
    if (!thrower.isKiller) {
      // Building up: only your own number counts toward killer status.
      if (n === thrower.number) {
        thrower.killerProgress = Math.min(
          KILLER_TO_BECOME,
          thrower.killerProgress + mult,
        )
        if (thrower.killerProgress >= KILLER_TO_BECOME) {
          thrower.isKiller = true
          state.message = `🔪 ${thrower.name} is now a KILLER!`
        } else {
          state.message = `${thrower.name}: ${thrower.killerProgress}/${KILLER_TO_BECOME} to become a killer`
        }
      }
    } else if (n === thrower.number) {
      // As a killer, hitting your own number costs you lives.
      thrower.lives = Math.max(0, thrower.lives - mult)
      state.message = thrower.lives === 0
        ? `💀 ${thrower.name} knocked themselves out!`
        : `${thrower.name} hit their own number and lost ${mult} life${mult > 1 ? 'ves' : ''}!`
    } else {
      // As a killer, hitting a living opponent's number removes their lives.
      const victim = state.players.find(
        (p) => p.id !== thrower.id && p.number === n && p.lives > 0,
      )
      if (victim) {
        victim.lives = Math.max(0, victim.lives - mult)
        state.message = victim.lives === 0
          ? `💀 ${thrower.name} eliminated ${victim.name}!`
          : `${thrower.name} took ${mult} off ${victim.name} (${victim.lives} left)`
      }
    }
  }

  // Win: only one player left with lives.
  const alive = state.players.filter((p) => p.lives > 0)
  if (alive.length <= 1) {
    winLeg(alive[0] || thrower)
    return
  }

  // End the turn after 3 darts, or immediately if the thrower knocked
  // themselves out.
  if (state.turnDarts.length === 3 || thrower.lives <= 0) advanceTurn()
}

// ---- Shared leg / match handling ----
function winLeg(player) {
  player.legs += 1
  state.legWinnerId = player.id
  if (player.legs >= state.legsToWin) {
    state.winnerId = player.id
    state.message = `🎯 ${player.name} wins the match!`
  } else {
    state.message = `${player.name} wins the leg! (${player.legs}/${state.legsToWin})`
    nextLeg((state.turnPointer + 1) % state.players.length)
  }
}

// Manually end the turn early (banks fewer than 3 darts).
function endTurn() {
  if (!state.started || state.winnerId !== null) return
  if (state.turnDarts.length === 0) return
  pushHistory()
  if (state.mode === 'x01') currentPlayer.value.lastTurn = turnTotal.value
  else currentPlayer.value.lastTurn = turnMarks.value
  advanceTurn()
}

function undo() {
  const snap = state.history.pop()
  if (!snap) return
  const s = JSON.parse(snap)
  state.players = s.players
  state.turnPointer = s.turnPointer
  state.turnDarts = s.turnDarts
  state.turnStartScore = s.turnStartScore
  state.message = s.message
  state.winnerId = s.winnerId
  state.legWinnerId = s.legWinnerId
}

function resetToSetup() {
  state.started = false
  state.winnerId = null
  state.legWinnerId = null
  state.history = []
  state.message = ''
}

function rematch() {
  startGame({
    mode: state.mode,
    startScore: state.startScore,
    doubleOut: state.doubleOut,
    legsToWin: state.legsToWin,
    startLives: state.killerLives,
    playerNames: state.players.map((p) => p.name),
    playerNumbers: state.players.map((p) => p.number),
  })
}

// Suggested checkout for an x01 score (double-out routes).
function checkoutHint(score) {
  if (state.mode !== 'x01') return null
  if (score > 170 || score < 2) return null
  return CHECKOUTS[score] || null
}

export function useGame() {
  return {
    state,
    currentPlayer,
    turnTotal,
    turnMarks,
    canThrow,
    startGame,
    throwDart,
    endTurn,
    undo,
    resetToSetup,
    rematch,
    checkoutHint,
  }
}

// A compact checkout table for double-out finishes (score -> suggested route).
const CHECKOUTS = {
  170: ['T20', 'T20', 'Bull'], 167: ['T20', 'T19', 'Bull'], 164: ['T20', 'T18', 'Bull'],
  161: ['T20', 'T17', 'Bull'], 160: ['T20', 'T20', 'D20'], 158: ['T20', 'T20', 'D19'],
  157: ['T20', 'T19', 'D20'], 156: ['T20', 'T20', 'D18'], 155: ['T20', 'T19', 'D19'],
  154: ['T20', 'T18', 'D20'], 153: ['T20', 'T19', 'D18'], 152: ['T20', 'T20', 'D16'],
  151: ['T20', 'T17', 'D20'], 150: ['T20', 'T18', 'D18'], 149: ['T20', 'T19', 'D16'],
  148: ['T20', 'T20', 'D14'], 147: ['T20', 'T17', 'D18'], 146: ['T20', 'T18', 'D16'],
  145: ['T20', 'T15', 'D20'], 144: ['T20', 'T20', 'D12'], 143: ['T20', 'T17', 'D16'],
  142: ['T20', 'T14', 'D20'], 141: ['T20', 'T19', 'D12'], 140: ['T20', 'T20', 'D10'],
  139: ['T20', 'T13', 'D20'], 138: ['T20', 'T18', 'D12'], 137: ['T20', 'T19', 'D10'],
  136: ['T20', 'T20', 'D8'], 135: ['T20', 'T17', 'D12'], 134: ['T20', 'T14', 'D16'],
  133: ['T20', 'T19', 'D8'], 132: ['T20', 'T16', 'D12'], 131: ['T20', 'T13', 'D16'],
  130: ['T20', 'T18', 'D8'], 129: ['T19', 'T16', 'D12'], 128: ['T18', 'T14', 'D16'],
  127: ['T20', 'T17', 'D8'], 126: ['T19', 'T19', 'D6'], 125: ['T20', 'T19', 'D4'],
  124: ['T20', 'T16', 'D8'], 123: ['T19', 'T16', 'D9'], 122: ['T18', 'T20', 'D4'],
  121: ['T20', 'T11', 'D14'], 120: ['T20', '20', 'D20'], 119: ['T19', 'T12', 'D13'],
  118: ['T20', '18', 'D20'], 117: ['T20', '17', 'D20'], 116: ['T20', '16', 'D20'],
  115: ['T20', '15', 'D20'], 114: ['T20', '14', 'D20'], 113: ['T20', '13', 'D20'],
  112: ['T20', '12', 'D20'], 111: ['T20', '19', 'D16'], 110: ['T20', 'Bull'],
  109: ['T20', '9', 'D20'], 108: ['T20', '16', 'D16'], 107: ['T19', 'Bull'],
  106: ['T20', '14', 'D16'], 105: ['T20', '13', 'D16'], 104: ['T18', 'Bull'],
  103: ['T19', '10', 'D18'], 102: ['T20', '10', 'D16'], 101: ['T17', 'Bull'],
  100: ['T20', 'D20'], 99: ['T19', '10', 'D16'], 98: ['T20', 'D19'], 97: ['T19', 'D20'],
  96: ['T20', 'D18'], 95: ['T19', 'D19'], 94: ['T18', 'D20'], 93: ['T19', 'D18'],
  92: ['T20', 'D16'], 91: ['T17', 'D20'], 90: ['T20', 'D15'], 89: ['T19', 'D16'],
  88: ['T20', 'D14'], 87: ['T17', 'D18'], 86: ['T18', 'D16'], 85: ['T15', 'D20'],
  84: ['T20', 'D12'], 83: ['T17', 'D16'], 82: ['Bull', 'D16'], 81: ['T19', 'D12'],
  80: ['T20', 'D10'], 79: ['T19', 'D11'], 78: ['T18', 'D12'], 77: ['T19', 'D10'],
  76: ['T20', 'D8'], 75: ['T17', 'D12'], 74: ['T14', 'D16'], 73: ['T19', 'D8'],
  72: ['T16', 'D12'], 71: ['T13', 'D16'], 70: ['T18', 'D8'], 69: ['T19', 'D6'],
  68: ['T20', 'D4'], 67: ['T17', 'D8'], 66: ['T10', 'D18'], 65: ['T19', 'D4'],
  64: ['T16', 'D8'], 63: ['T13', 'D12'], 62: ['T10', 'D16'], 61: ['T15', 'D8'],
  60: ['20', 'D20'], 59: ['19', 'D20'], 58: ['18', 'D20'], 57: ['17', 'D20'],
  56: ['16', 'D20'], 55: ['15', 'D20'], 54: ['14', 'D20'], 53: ['13', 'D20'],
  52: ['12', 'D20'], 51: ['11', 'D20'], 50: ['Bull'], 49: ['9', 'D20'],
  48: ['16', 'D16'], 47: ['15', 'D16'], 46: ['6', 'D20'], 45: ['13', 'D16'],
  44: ['12', 'D16'], 43: ['11', 'D16'], 42: ['10', 'D16'], 41: ['9', 'D16'],
  40: ['D20'], 39: ['7', 'D16'], 38: ['D19'], 37: ['5', 'D16'], 36: ['D18'],
  35: ['3', 'D16'], 34: ['D17'], 33: ['1', 'D16'], 32: ['D16'], 31: ['15', 'D8'],
  30: ['D15'], 29: ['13', 'D8'], 28: ['D14'], 27: ['11', 'D8'], 26: ['D13'],
  25: ['9', 'D8'], 24: ['D12'], 23: ['7', 'D8'], 22: ['D11'], 21: ['5', 'D8'],
  20: ['D10'], 19: ['3', 'D8'], 18: ['D9'], 17: ['1', 'D8'], 16: ['D8'],
  15: ['7', 'D4'], 14: ['D7'], 13: ['5', 'D4'], 12: ['D6'], 11: ['3', 'D4'],
  10: ['D5'], 9: ['1', 'D4'], 8: ['D4'], 7: ['3', 'D2'], 6: ['D3'], 5: ['1', 'D2'],
  4: ['D2'], 3: ['1', 'D1'], 2: ['D1'],
}
