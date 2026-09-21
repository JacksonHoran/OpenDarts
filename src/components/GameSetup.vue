<script setup>
import { ref, computed, watch } from 'vue'

const emit = defineEmits(['start'])

const NAMES_KEY = 'darts.playerNames'

// Recognisable default target numbers for Killer (highest first).
const NUMBER_POOL = [20, 19, 18, 17, 16, 15]

// Restore the last-used player names (falls back to defaults).
function loadNames() {
  try {
    const saved = JSON.parse(localStorage.getItem(NAMES_KEY))
    if (Array.isArray(saved) && saved.length >= 1) {
      return saved.slice(0, 6).map((n) => String(n))
    }
  } catch {
    // ignore unavailable/corrupt storage
  }
  return ['Player 1', 'Player 2']
}

const mode = ref('x01') // 'x01' | 'cricket' | 'killer'
const startScore = ref(501)
const doubleOut = ref(false)
const legsToWin = ref(1)
const players = ref(loadNames())
const startLives = ref(3)
// Killer target numbers, aligned by index with `players`.
const playerNumbers = ref(players.value.map((_, i) => NUMBER_POOL[i] || i + 1))

const presets = [301, 501, 701]

const hasDuplicateNumbers = computed(() => {
  const used = playerNumbers.value.slice(0, players.value.length)
  return new Set(used).size !== used.length
})

// Persist names whenever they change (add/remove/edit).
watch(
  players,
  (val) => {
    try {
      localStorage.setItem(NAMES_KEY, JSON.stringify(val))
    } catch {
      // ignore write failures (private mode, blocked storage)
    }
  },
  { deep: true },
)

function firstUnusedNumber() {
  for (let n = 20; n >= 1; n--) {
    if (!playerNumbers.value.includes(n)) return n
  }
  return 1
}

function addPlayer() {
  if (players.value.length >= 6) return
  players.value.push(`Player ${players.value.length + 1}`)
  playerNumbers.value.push(firstUnusedNumber())
}
function removePlayer(i) {
  if (players.value.length <= 1) return
  players.value.splice(i, 1)
  playerNumbers.value.splice(i, 1)
}

// Randomly assign unique target numbers to every player.
function shuffleNumbers() {
  const pool = Array.from({ length: 20 }, (_, i) => i + 1)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  playerNumbers.value = players.value.map((_, i) => pool[i])
}

function start() {
  if (mode.value === 'killer' && hasDuplicateNumbers.value) return
  emit('start', {
    mode: mode.value,
    startScore: startScore.value,
    doubleOut: doubleOut.value,
    legsToWin: Number(legsToWin.value),
    startLives: Number(startLives.value),
    playerNames: players.value,
    playerNumbers: playerNumbers.value.map((n) => Number(n)),
  })
}
</script>

<template>
  <div class="setup">
    <header class="hero">
      <div class="hero-icon">🎯</div>
      <h1>Darts Scorer</h1>
      <p>Pick a game, add your players, and start throwing.</p>
    </header>

    <section class="card">
      <h2>Game mode</h2>
      <div class="pill-row">
        <button
          type="button" class="pill mode"
          :class="{ on: mode === 'x01' }"
          @click="mode = 'x01'"
        >
          <span class="mode-name">301 / 501</span>
          <small>Count down to zero</small>
        </button>
        <button
          type="button" class="pill mode"
          :class="{ on: mode === 'cricket' }"
          @click="mode = 'cricket'"
        >
          <span class="mode-name">Cricket</span>
          <small>Close 15–20 &amp; bull</small>
        </button>
        <button
          type="button" class="pill mode"
          :class="{ on: mode === 'killer' }"
          @click="mode = 'killer'"
        >
          <span class="mode-name">Killer</span>
          <small>Last one standing</small>
        </button>
      </div>

      <template v-if="mode === 'x01'">
        <div class="opt-row sub-label">Starting score</div>
        <div class="pill-row">
          <button
            v-for="p in presets" :key="p"
            type="button"
            class="pill"
            :class="{ on: startScore === p }"
            @click="startScore = p"
          >{{ p }}</button>
        </div>

        <div class="opt-row">
          <label class="toggle">
            <input type="checkbox" v-model="doubleOut" />
            <span>Double out <small>(must finish on a double)</small></span>
          </label>
        </div>
      </template>

      <p v-else-if="mode === 'cricket'" class="cricket-note">
        Hit each of 15, 16, 17, 18, 19, 20 and the bull three times to close it.
        Once closed, extra hits score points until every opponent closes it too.
        Close everything while leading to win.
      </p>

      <template v-else>
        <p class="cricket-note">
          Hit your own number three times to become a Killer, then hit your
          opponents' numbers to knock out their lives. Careful — as a Killer,
          hitting your own number costs <em>you</em> lives. Last player standing wins.
        </p>
        <div class="opt-row">
          <label class="legs">
            <span>Lives each</span>
            <select v-model="startLives">
              <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
            </select>
          </label>
        </div>
      </template>

      <div class="opt-row">
        <label class="legs">
          <span>Legs to win</span>
          <select v-model="legsToWin">
            <option v-for="n in 7" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>
      </div>
    </section>

    <section class="card">
      <div class="players-head">
        <h2>Players <span class="count">{{ players.length }}/6</span></h2>
        <div class="players-actions">
          <button
            v-if="mode === 'killer'"
            type="button" class="add" @click="shuffleNumbers"
          >🎲 Shuffle</button>
          <button type="button" class="add" :disabled="players.length >= 6" @click="addPlayer">
            + Add
          </button>
        </div>
      </div>

      <ul class="players">
        <li v-for="(name, i) in players" :key="i">
          <span class="idx">{{ i + 1 }}</span>
          <input
            v-model="players[i]"
            type="text"
            :placeholder="`Player ${i + 1}`"
            maxlength="16"
          />
          <select
            v-if="mode === 'killer'"
            v-model.number="playerNumbers[i]"
            class="num-select"
            :class="{ dup: hasDuplicateNumbers }"
            aria-label="Target number"
          >
            <option v-for="n in 20" :key="n" :value="n">{{ n }}</option>
          </select>
          <button
            type="button"
            class="remove"
            :disabled="players.length <= 1"
            @click="removePlayer(i)"
            aria-label="Remove player"
          >✕</button>
        </li>
      </ul>

      <p v-if="mode === 'killer' && hasDuplicateNumbers" class="dup-warn">
        Each player needs a different target number.
      </p>
    </section>

    <button
      class="start-btn" type="button"
      :disabled="mode === 'killer' && hasDuplicateNumbers"
      @click="start"
    >
      Start {{ mode === 'cricket' ? 'Cricket' : mode === 'killer' ? 'Killer' : startScore }}
    </button>
  </div>
</template>

<style scoped>
.setup {
  max-width: 560px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.hero { text-align: center; }
.hero-icon { font-size: 3rem; }
.hero h1 { margin: 4px 0 4px; font-size: 2rem; letter-spacing: -0.02em; }
.hero p { margin: 0; color: var(--text-dim); }

.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 18px 18px 20px;
}
.card h2 { margin: 0 0 14px; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); }

.pill-row { display: flex; gap: 10px; flex-wrap: wrap; }
.pill {
  flex: 1 1 auto;
  min-width: 90px;
  padding: 14px 0;
  font-size: 1.3rem;
  font-weight: 700;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text);
  cursor: pointer;
}
.pill.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.pill.mode {
  flex: 1 1 30%;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 12px 4px; font-size: 1rem; min-width: 96px;
}
.pill.mode .mode-name { font-size: 1.1rem; font-weight: 800; }
.pill.mode small { font-weight: 500; opacity: 0.8; font-size: 0.68rem; }

.sub-label {
  font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--text-dim); margin-top: 18px !important; margin-bottom: 8px;
}
.cricket-note {
  margin: 16px 0 0; font-size: 0.85rem; line-height: 1.45; color: var(--text-dim);
}

.opt-row { margin-top: 16px; }
.toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.toggle input { width: 20px; height: 20px; accent-color: var(--accent); }
.toggle small { color: var(--text-dim); }
.legs { display: flex; align-items: center; justify-content: space-between; }
.legs select {
  padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line);
  background: var(--surface-2); color: var(--text); font-size: 1rem;
}

.players-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 8px; }
.players-head h2 { margin: 0; }
.count { color: var(--text-dim); font-size: 0.8rem; }
.players-actions { display: flex; gap: 8px; }
.add {
  padding: 6px 14px; border-radius: 999px; border: 1px solid var(--accent);
  background: transparent; color: var(--accent); font-weight: 600; cursor: pointer;
  white-space: nowrap;
}
.add:disabled { opacity: 0.4; cursor: default; }

.num-select {
  flex: none; width: 60px; padding: 10px 6px; border-radius: 10px;
  border: 1px solid var(--accent); background: var(--surface-2);
  color: var(--accent); font-weight: 800; font-size: 1rem; text-align: center;
}
.num-select.dup { border-color: #e0a800; color: #e0a800; }
.dup-warn { margin: 12px 0 0; color: #e0a800; font-size: 0.82rem; }

.players { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.players li { display: flex; align-items: center; gap: 10px; }
.idx {
  width: 26px; height: 26px; flex: none; border-radius: 50%;
  background: var(--surface-3); color: var(--text-dim);
  display: grid; place-items: center; font-size: 0.8rem; font-weight: 700;
}
.players input[type="text"] {
  flex: 1; padding: 11px 12px; border-radius: 10px;
  border: 1px solid var(--line); background: var(--surface-2); color: var(--text);
  font-size: 1rem;
}
.remove {
  width: 32px; height: 32px; flex: none; border-radius: 8px;
  border: 1px solid var(--line); background: var(--surface-2);
  color: var(--text-dim); cursor: pointer;
}
.remove:disabled { opacity: 0.3; cursor: default; }

.start-btn {
  padding: 16px; border: none; border-radius: 14px;
  background: var(--accent); color: #fff; font-size: 1.15rem; font-weight: 700;
  cursor: pointer; box-shadow: 0 6px 20px rgba(220, 38, 38, 0.35);
}
.start-btn:hover:not(:disabled) { filter: brightness(1.05); }
.start-btn:disabled { opacity: 0.5; cursor: default; box-shadow: none; }
</style>
