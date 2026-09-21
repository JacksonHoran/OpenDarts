<script setup>
import { ref } from 'vue'
import { buildSegments, numberLabels, R } from '../dartboard.js'

defineProps({
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['throw'])

const segments = buildSegments()
const labels = numberLabels()
const hovered = ref(null)

function hit(seg) {
  emit('throw', {
    value: seg.value,
    multiplier: seg.multiplier,
    label: seg.label,
    score: seg.value * seg.multiplier,
  })
}

function hitBull(multiplier) {
  emit('throw', {
    value: 25,
    multiplier,
    label: multiplier === 2 ? 'Bull (50)' : '25',
    score: 25 * multiplier,
  })
}

function hitMiss() {
  emit('throw', { value: 0, multiplier: 1, label: 'Miss', score: 0 })
}

// Color for a segment based on ring + alternating position.
function fill(seg) {
  if (seg.ring === 'single') return seg.alt ? 'var(--board-cream)' : 'var(--board-black)'
  // triple / double rings alternate red / green
  return seg.alt ? 'var(--board-red)' : 'var(--board-green)'
}
</script>

<template>
  <div class="board-wrap" :class="{ disabled }">
    <svg viewBox="-110 -110 220 220" class="board" role="img" aria-label="Dartboard">
      <!-- anything outside the board counts as a miss (0) -->
      <rect
        x="-110" y="-110" width="220" height="220"
        fill="transparent" class="miss-zone"
        @click="hitMiss"
      />

      <!-- outer black ring / number band: a dart landing here also misses -->
      <circle
        cx="0" cy="0" :r="R.boardEdge" fill="var(--board-black)"
        class="miss-zone"
        @click="hitMiss"
      />

      <!-- clickable segments -->
      <g>
        <path
          v-for="seg in segments"
          :key="seg.id"
          :d="seg.path"
          :fill="fill(seg)"
          class="segment"
          :class="{ active: hovered === seg.id }"
          @mouseenter="hovered = seg.id"
          @mouseleave="hovered = null"
          @click="hit(seg)"
        >
          <title>{{ seg.label }} = {{ seg.value * seg.multiplier }}</title>
        </path>
      </g>

      <!-- outer bull (25) -->
      <circle
        cx="0" cy="0" :r="R.bullOuter"
        fill="var(--board-green)" class="segment"
        :class="{ active: hovered === 'bull' }"
        @mouseenter="hovered = 'bull'" @mouseleave="hovered = null"
        @click="hitBull(1)"
      >
        <title>Outer bull = 25</title>
      </circle>

      <!-- double bull (50) -->
      <circle
        cx="0" cy="0" :r="R.doubleBullOuter"
        fill="var(--board-red)" class="segment"
        :class="{ active: hovered === 'dbull' }"
        @mouseenter="hovered = 'dbull'" @mouseleave="hovered = null"
        @click="hitBull(2)"
      >
        <title>Bullseye = 50</title>
      </circle>

      <!-- number labels -->
      <g class="labels">
        <text
          v-for="l in labels" :key="l.num"
          :x="l.x" :y="l.y"
          text-anchor="middle" dominant-baseline="central"
        >{{ l.num }}</text>
      </g>
    </svg>

    <button class="miss-btn" type="button" :disabled="disabled" @click="hitMiss">
      Missed the board (0)
    </button>
  </div>
</template>

<style scoped>
.board-wrap {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.board {
  flex: 0 0 auto;
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  /* Never taller than the pane (leave room for the miss button). */
  max-width: 100%;
  max-height: calc(100% - 48px);
  display: block;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.35));
  touch-action: manipulation;
}
.segment {
  cursor: pointer;
  stroke: rgba(0, 0, 0, 0.55);
  stroke-width: 0.4;
  transition: filter 0.08s ease, opacity 0.08s ease;
}
.segment.active {
  filter: brightness(1.35) saturate(1.2);
}
.miss-zone { cursor: pointer; }
.disabled .board { pointer-events: none; opacity: 0.55; }
.labels text {
  fill: #fff;
  font-size: 9px;
  font-weight: 700;
  pointer-events: none;
  font-family: system-ui, sans-serif;
}
.miss-btn {
  padding: 8px 18px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--text);
  border-radius: 999px;
  font-size: 0.85rem;
  cursor: pointer;
}
.miss-btn:hover:not(:disabled) { background: var(--surface-3); }
.miss-btn:disabled { opacity: 0.4; cursor: default; }
</style>
