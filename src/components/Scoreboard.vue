<script setup>
import { computed } from 'vue'

const props = defineProps({
  players: { type: Array, required: true },
  activeId: { type: Number, required: true },
  legsToWin: { type: Number, required: true },
  checkoutHint: { type: Function, required: true },
})
</script>

<template>
  <div class="scoreboard">
    <div
      v-for="p in players"
      :key="p.id"
      class="player"
      :class="{ active: p.id === activeId }"
    >
      <div class="top">
        <span class="name">{{ p.name }}</span>
        <span v-if="legsToWin > 1" class="legs">🏆 {{ p.legs }}</span>
      </div>
      <div class="score">{{ p.score }}</div>
      <div class="meta">
        <span v-if="p.lastTurn !== null" class="last">Last: {{ p.lastTurn }}</span>
        <span v-if="checkoutHint(p.score)" class="checkout">
          {{ checkoutHint(p.score).join(' · ') }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scoreboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}
.player {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 14px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}
.player.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.35);
  transform: translateY(-2px);
}
.top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.name {
  font-weight: 700; font-size: 0.95rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.legs { font-size: 0.8rem; color: var(--text-dim); flex: none; }
.score {
  font-size: 2.6rem; font-weight: 800; line-height: 1.05;
  letter-spacing: -0.03em; font-variant-numeric: tabular-nums;
}
.player.active .score { color: var(--accent); }
.meta { display: flex; flex-direction: column; gap: 2px; min-height: 18px; margin-top: 2px; }
.last { font-size: 0.75rem; color: var(--text-dim); }
.checkout { font-size: 0.72rem; color: var(--accent); font-weight: 600; }
</style>
