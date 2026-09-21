<script setup>
import { computed } from 'vue'
import GameSetup from './components/GameSetup.vue'
import Dartboard from './components/Dartboard.vue'
import Scoreboard from './components/Scoreboard.vue'
import CricketBoard from './components/CricketBoard.vue'
import KillerBoard from './components/KillerBoard.vue'
import { useGame, KILLER_TO_BECOME } from './useGame.js'

const {
  state, currentPlayer, turnTotal, turnMarks, canThrow,
  startGame, throwDart, endTurn, undo, resetToSetup, rematch, checkoutHint,
} = useGame()

const isCricket = computed(() => state.mode === 'cricket')
const isKiller = computed(() => state.mode === 'killer')

// Checkout route for the player currently throwing (X01 only, when on a finish).
const currentCheckout = computed(() =>
  state.mode === 'x01' && currentPlayer.value
    ? checkoutHint(currentPlayer.value.score)
    : null,
)

// Guidance line for the current Killer thrower.
const killerHint = computed(() => {
  if (!isKiller.value || !currentPlayer.value) return ''
  const p = currentPlayer.value
  if (p.isKiller) return `KILLER — hit opponents' numbers`
  return `Hit ${p.number} to become a killer (${p.killerProgress}/${KILLER_TO_BECOME})`
})

const dartsLeft = computed(() => 3 - state.turnDarts.length)
const winner = computed(() =>
  state.winnerId !== null ? state.players.find((p) => p.id === state.winnerId) : null,
)

function onStart(config) {
  startGame(config)
}
</script>

<template>
  <GameSetup v-if="!state.started" @start="onStart" />

  <div v-else class="game">
    <header class="bar">
      <button class="ghost" type="button" @click="resetToSetup">← Setup</button>
      <div class="title">
        <template v-if="isCricket">Cricket</template>
        <template v-else-if="isKiller">Killer</template>
        <template v-else>{{ state.startScore }}{{ state.doubleOut ? ' · Double out' : '' }}</template>
      </div>
      <button class="ghost" type="button" :disabled="state.history.length === 0" @click="undo">
        ↩ Undo
      </button>
    </header>

    <div class="panes">
      <!-- LEFT: scores + turn info + actions -->
      <div class="left-pane">
        <CricketBoard
          v-if="isCricket"
          :players="state.players"
          :active-id="currentPlayer ? currentPlayer.id : -1"
        />
        <KillerBoard
          v-else-if="isKiller"
          :players="state.players"
          :active-id="currentPlayer ? currentPlayer.id : -1"
          :max-lives="state.killerLives"
          :to-become="KILLER_TO_BECOME"
        />
        <Scoreboard
          v-else
          :players="state.players"
          :active-id="currentPlayer ? currentPlayer.id : -1"
          :legs-to-win="state.legsToWin"
          :checkout-hint="checkoutHint"
        />

        <!-- Big checkout callout so players can read the finish from across the room -->
        <div v-if="currentCheckout && !winner" class="checkout-call">
          <span class="co-label">{{ currentPlayer?.name }} checkout</span>
          <span class="co-combo">{{ currentCheckout.join(' · ') }}</span>
        </div>

        <div v-if="!winner" class="turn-panel">
          <div class="now-throwing">
            <span class="label">Now throwing</span>
            <span class="who">{{ currentPlayer?.name }}</span>
          </div>
          <div class="darts">
            <div
              v-for="i in 3" :key="i"
              class="dart-slot"
              :class="{ filled: state.turnDarts[i - 1] }"
            >
              <template v-if="state.turnDarts[i - 1]">
                {{ state.turnDarts[i - 1].label }}
              </template>
              <template v-else>–</template>
            </div>
          </div>
          <div class="turn-sum">
            <template v-if="isKiller">
              <strong class="killer-hint">{{ killerHint }}</strong>
            </template>
            <template v-else-if="isCricket">
              This turn: <strong>{{ turnMarks }}</strong> mark{{ turnMarks === 1 ? '' : 's' }}
            </template>
            <template v-else>
              This turn: <strong>{{ turnTotal }}</strong>
            </template>
            <span class="dl">· {{ dartsLeft }} dart{{ dartsLeft === 1 ? '' : 's' }} left</span>
          </div>
        </div>

        <p v-if="state.message" class="message">{{ state.message }}</p>

        <div v-if="!winner" class="actions">
          <button
            class="next"
            type="button"
            :disabled="state.turnDarts.length === 0"
            @click="endTurn"
          >
            Next player →
          </button>
        </div>
      </div>

      <!-- RIGHT: the dartboard clicker -->
      <div class="right-pane">
        <Dartboard :disabled="!canThrow" @throw="throwDart" />
      </div>
    </div>

    <!-- Win overlay -->
    <div v-if="winner" class="win-overlay">
      <div class="win-card">
        <div class="confetti">🎯</div>
        <h2>{{ winner.name }} wins!</h2>
        <p v-if="state.legsToWin > 1">Won {{ winner.legs }} of {{ state.legsToWin }} legs.</p>
        <div class="win-actions">
          <button class="primary" type="button" @click="rematch">Rematch</button>
          <button class="ghost" type="button" @click="resetToSetup">New game</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game {
  height: 100dvh;
  max-width: 1120px;
  margin: 0 auto;
  padding: 8px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}
.bar {
  flex: none;
  display: flex; align-items: center; justify-content: space-between;
  background: var(--bg); padding: 4px 0;
}

/* Two panes: scores on the left, board on the right. */
.panes {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(150px, 0.95fr) minmax(0, 1.05fr);
  gap: 12px;
  align-items: stretch;
}
.left-pane {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
  /* Breathing room so the active card's lift/glow isn't clipped at the top. */
  padding-top: 6px;
}
.right-pane {
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* Push the turn panel / actions toward the bottom, scores at the top. */
.turn-panel { margin-top: auto; }

/* Prominent checkout suggestion under the score boxes. */
.checkout-call {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 10px;
  border-radius: 14px;
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid var(--accent);
  text-align: center;
}
.co-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
}
.co-combo {
  font-size: clamp(1.6rem, 7vw, 2.6rem);
  font-weight: 800;
  line-height: 1.1;
  color: var(--accent);
  letter-spacing: -0.01em;
}
.title { font-weight: 700; color: var(--text-dim); font-size: 0.9rem; }
.ghost {
  padding: 8px 14px; border-radius: 999px; border: 1px solid var(--line);
  background: var(--surface); color: var(--text); cursor: pointer; font-size: 0.85rem;
}
.ghost:disabled { opacity: 0.4; cursor: default; }

.turn-panel {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 10px;
}
.now-throwing { display: flex; align-items: baseline; gap: 10px; }
.now-throwing .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); }
.now-throwing .who { font-size: 1.25rem; font-weight: 800; color: var(--accent); }
.darts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.dart-slot {
  padding: 10px; border-radius: 10px; text-align: center;
  border: 1px dashed var(--line); color: var(--text-dim);
  font-weight: 700; font-size: 0.95rem;
}
.dart-slot.filled {
  border-style: solid; border-color: var(--accent);
  background: rgba(220, 38, 38, 0.12); color: var(--text);
}
.turn-sum { font-size: 0.9rem; color: var(--text-dim); }
.turn-sum strong { color: var(--text); font-size: 1.05rem; }
.turn-sum .killer-hint { color: var(--accent); font-size: 0.98rem; }
.dl { margin-left: 4px; }

.message {
  margin: 0; text-align: center; font-weight: 700;
  background: var(--surface-2); border: 1px solid var(--line);
  border-radius: 10px; padding: 10px;
}

.actions { display: flex; justify-content: center; }
.next {
  padding: 14px 28px; border: none; border-radius: 12px;
  background: var(--accent); color: #fff; font-size: 1.05rem; font-weight: 700; cursor: pointer;
}
.next:disabled { opacity: 0.4; cursor: default; }

.win-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7);
  display: grid; place-items: center; z-index: 20; padding: 20px;
}
.win-card {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: 20px; padding: 32px; text-align: center; max-width: 360px; width: 100%;
}
.confetti { font-size: 3.5rem; }
.win-card h2 { margin: 8px 0; font-size: 1.8rem; }
.win-card p { color: var(--text-dim); margin: 0 0 20px; }
.win-actions { display: flex; gap: 10px; justify-content: center; }
.primary {
  padding: 12px 24px; border: none; border-radius: 12px;
  background: var(--accent); color: #fff; font-weight: 700; cursor: pointer;
}

/* Very narrow screens (small phones): stack scores above the board and let the
   page grow/scroll, since two side-by-side columns can't fit under ~430px. */
@media (max-width: 430px) {
  .game { height: auto; min-height: 100dvh; overflow: visible; }
  .panes { grid-template-columns: 1fr; }
  .turn-panel { margin-top: 0; }
  .right-pane { min-height: 60vw; }
}
</style>
