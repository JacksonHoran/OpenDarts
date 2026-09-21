<script setup>
defineProps({
  players: { type: Array, required: true },
  activeId: { type: Number, required: true },
  maxLives: { type: Number, required: true },
  toBecome: { type: Number, default: 3 },
})
</script>

<template>
  <div class="killer-board">
    <div
      v-for="p in players"
      :key="p.id"
      class="kplayer"
      :class="{
        active: p.id === activeId && p.lives > 0,
        dead: p.lives <= 0,
        killer: p.isKiller,
      }"
    >
      <div class="ktop">
        <span class="knum">{{ p.number }}</span>
        <span class="kname">{{ p.name }}</span>
        <span v-if="p.isKiller && p.lives > 0" class="killer-badge">🔪</span>
      </div>

      <div class="kstatus">
        <template v-if="p.lives <= 0">
          <span class="out">☠ OUT</span>
        </template>
        <template v-else>
          <span class="lives" :aria-label="`${p.lives} lives`">
            <span
              v-for="h in maxLives" :key="h"
              class="heart" :class="{ lost: h > p.lives }"
            >♥</span>
          </span>
          <span v-if="p.isKiller" class="tag killer-tag">KILLER</span>
          <span v-else class="tag prog">{{ p.killerProgress }}/{{ toBecome }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.killer-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}
.kplayer {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 10px 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}
.kplayer.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.35);
  transform: translateY(-2px);
}
.kplayer.killer { border-color: var(--board-green); }
.kplayer.active.killer { border-color: var(--accent); }
.kplayer.dead { opacity: 0.45; }

.ktop { display: flex; align-items: center; gap: 8px; }
.knum {
  flex: none; width: 30px; height: 30px; border-radius: 8px;
  background: var(--surface-3); color: var(--text);
  display: grid; place-items: center; font-weight: 800; font-size: 1rem;
}
.kplayer.killer .knum { background: var(--board-green); color: #06210f; }
.kname {
  font-weight: 700; font-size: 0.95rem; flex: 1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dead .kname { text-decoration: line-through; }
.killer-badge { flex: none; font-size: 1rem; }

.kstatus { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; }
.lives { display: inline-flex; gap: 2px; font-size: 1.1rem; line-height: 1; }
.heart { color: var(--accent); }
.heart.lost { color: var(--surface-3); }
.out { color: var(--text-dim); font-weight: 800; letter-spacing: 0.04em; }

.tag { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.05em; padding: 2px 6px; border-radius: 6px; }
.killer-tag { background: var(--board-green); color: #06210f; }
.prog { background: var(--surface-3); color: var(--text-dim); }
</style>
