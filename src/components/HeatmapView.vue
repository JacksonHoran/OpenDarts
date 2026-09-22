<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { buildSegments, numberLabels, R } from '../dartboard.js'
import { fetchPlayers, fetchThrows } from '../api.js'

defineEmits(['back'])

const segments = buildSegments()
const labels = numberLabels()

const players = ref([])
const throws = ref([])
const player = ref('all')
const mode = ref('all')
const loading = ref(false)
const canvasEl = ref(null)

const CANVAS = 600 // internal heatmap resolution (square)

function fill(seg) {
  if (seg.ring === 'single') return seg.alt ? 'var(--board-cream)' : 'var(--board-black)'
  return seg.alt ? 'var(--board-red)' : 'var(--board-green)'
}

// Stats derived from the current throw set.
const located = computed(() => throws.value.filter((t) => t.x != null && t.y != null))
const stats = computed(() => {
  const list = throws.value
  const total = list.length
  const hitBoard = list.filter((t) => t.score > 0).length
  const counts = {}
  for (const t of list) {
    if (!t.label || t.label === 'Miss') continue
    counts[t.label] = (counts[t.label] || 0) + 1
  }
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  return {
    total,
    accuracy: total ? Math.round((hitBoard / total) * 100) : 0,
    top,
  }
})

// Build a 256-entry colour lookup table (cold -> hot).
function gradientLUT() {
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 256
  const cx = c.getContext('2d')
  const g = cx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0.0, '#1e3a8a')
  g.addColorStop(0.35, '#2f81f7')
  g.addColorStop(0.55, '#2f9e57')
  g.addColorStop(0.75, '#e3d84a')
  g.addColorStop(1.0, '#dc2626')
  cx.fillStyle = g
  cx.fillRect(0, 0, 1, 256)
  return cx.getImageData(0, 0, 1, 256).data
}

function drawHeatmap() {
  const canvas = canvasEl.value
  if (!canvas) return
  const W = canvas.width
  const H = canvas.height
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, W, H)

  const pts = located.value
  if (!pts.length) return

  const radius = W * 0.055
  // 1) Accumulate intensity as additive grayscale alpha.
  ctx.globalCompositeOperation = 'lighter'
  for (const t of pts) {
    const px = ((t.x + 110) / 220) * W
    const py = ((t.y + 110) / 220) * H
    const grad = ctx.createRadialGradient(px, py, 0, px, py, radius)
    grad.addColorStop(0, 'rgba(0,0,0,0.30)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'

  // 2) Colourise: map accumulated alpha through the palette.
  const img = ctx.getImageData(0, 0, W, H)
  const d = img.data
  const lut = gradientLUT()
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]
    if (a === 0) continue
    const o = a * 4
    d[i] = lut[o]
    d[i + 1] = lut[o + 1]
    d[i + 2] = lut[o + 2]
    d[i + 3] = Math.min(255, Math.round(a * 1.5))
  }
  ctx.putImageData(img, 0, 0)
}

async function load() {
  loading.value = true
  throws.value = await fetchThrows({ player: player.value, mode: mode.value })
  loading.value = false
  await nextTick()
  drawHeatmap()
}

watch([player, mode], load)

onMounted(async () => {
  players.value = await fetchPlayers()
  await load()
})
</script>

<template>
  <div class="heat">
    <header class="bar">
      <button class="ghost" type="button" @click="$emit('back')">← Back</button>
      <div class="title">Throw Heatmap</div>
      <div style="width: 72px"></div>
    </header>

    <div class="controls">
      <div class="filter">
        <span class="flabel">Player</span>
        <div class="chips">
          <button
            type="button" class="chip" :class="{ on: player === 'all' }"
            @click="player = 'all'"
          >Everyone</button>
          <button
            v-for="p in players" :key="p.id"
            type="button" class="chip" :class="{ on: player === p.name }"
            @click="player = p.name"
          >{{ p.name }} <small>{{ p.throw_count }}</small></button>
        </div>
      </div>
      <div class="filter">
        <span class="flabel">Game</span>
        <div class="chips">
          <button
            v-for="m in ['all', 'x01', 'cricket', 'killer']" :key="m"
            type="button" class="chip" :class="{ on: mode === m }"
            @click="mode = m"
          >{{ m === 'all' ? 'All' : m === 'x01' ? '301/501' : m[0].toUpperCase() + m.slice(1) }}</button>
        </div>
      </div>
    </div>

    <div class="board-and-stats">
      <div class="board-box">
        <svg viewBox="-110 -110 220 220" class="board-bg" aria-hidden="true">
          <circle cx="0" cy="0" :r="R.boardEdge" fill="var(--board-black)" />
          <path v-for="seg in segments" :key="seg.id" :d="seg.path" :fill="fill(seg)" />
          <circle cx="0" cy="0" :r="R.bullOuter" fill="var(--board-green)" />
          <circle cx="0" cy="0" :r="R.doubleBullOuter" fill="var(--board-red)" />
          <g class="labels">
            <text
              v-for="l in labels" :key="l.num" :x="l.x" :y="l.y"
              text-anchor="middle" dominant-baseline="central"
            >{{ l.num }}</text>
          </g>
        </svg>
        <canvas ref="canvasEl" :width="CANVAS" :height="CANVAS" class="heat-canvas"></canvas>

        <div v-if="!loading && located.length === 0" class="empty">
          No located throws yet.<br /><small>Play a game and your darts will appear here.</small>
        </div>
      </div>

      <aside class="stats">
        <div class="stat">
          <div class="snum">{{ stats.total }}</div>
          <div class="slabel">darts thrown</div>
        </div>
        <div class="stat">
          <div class="snum">{{ stats.accuracy }}%</div>
          <div class="slabel">hit the board</div>
        </div>
        <div class="top">
          <div class="slabel">Most-hit spots</div>
          <ul v-if="stats.top.length">
            <li v-for="[label, n] in stats.top" :key="label">
              <span class="tlabel">{{ label }}</span>
              <span class="tbar">
                <span class="tfill" :style="{ width: (n / stats.top[0][1]) * 100 + '%' }"></span>
              </span>
              <span class="tcount">{{ n }}</span>
            </li>
          </ul>
          <p v-else class="muted">No hits recorded.</p>
        </div>
        <div class="legend">
          <span class="slabel">Density</span>
          <div class="legend-bar"></div>
          <div class="legend-ends"><span>low</span><span>high</span></div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.heat {
  max-width: 1120px;
  margin: 0 auto;
  padding: 10px 16px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 0;
}
.title { font-weight: 800; font-size: 1.05rem; }
.ghost {
  padding: 8px 14px; border-radius: 999px; border: 1px solid var(--line);
  background: var(--surface); color: var(--text); cursor: pointer; font-size: 0.85rem;
}

.controls { display: flex; flex-direction: column; gap: 12px; }
.filter { display: flex; flex-direction: column; gap: 6px; }
.flabel {
  font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--text-dim);
}
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  padding: 8px 14px; border-radius: 999px; border: 1px solid var(--line);
  background: var(--surface); color: var(--text); cursor: pointer; font-size: 0.9rem;
}
.chip small { color: var(--text-dim); font-size: 0.75rem; margin-left: 2px; }
.chip.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.chip.on small { color: rgba(255, 255, 255, 0.8); }

.board-and-stats {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(220px, 1fr);
  gap: 20px;
  align-items: start;
}
.board-box {
  position: relative;
  width: 100%;
  max-width: 520px;
  aspect-ratio: 1;
  margin: 0 auto;
}
.board-bg, .heat-canvas {
  position: absolute; inset: 0; width: 100%; height: 100%;
  border-radius: 50%;
}
.board-bg { opacity: 0.5; }
.heat-canvas { mix-blend-mode: screen; pointer-events: none; }
.labels text { fill: #fff; font-size: 9px; font-weight: 700; font-family: system-ui, sans-serif; }
.empty {
  position: absolute; inset: 0; display: grid; place-items: center; text-align: center;
  color: var(--text-dim); font-weight: 600;
}
.empty small { font-weight: 400; font-size: 0.8rem; }

.stats { display: flex; flex-direction: column; gap: 16px; }
.stat {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: 14px; padding: 12px 16px;
}
.snum { font-size: 2rem; font-weight: 800; line-height: 1; }
.slabel { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); }
.top ul { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.top li { display: grid; grid-template-columns: 44px 1fr 28px; align-items: center; gap: 8px; }
.tlabel { font-weight: 700; font-size: 0.85rem; }
.tbar { height: 8px; background: var(--surface-3); border-radius: 4px; overflow: hidden; }
.tfill { display: block; height: 100%; background: var(--accent); }
.tcount { text-align: right; font-size: 0.8rem; color: var(--text-dim); }
.muted { color: var(--text-dim); font-size: 0.85rem; }

.legend { display: flex; flex-direction: column; gap: 4px; }
.legend-bar {
  height: 12px; border-radius: 6px;
  background: linear-gradient(90deg, #1e3a8a, #2f81f7, #2f9e57, #e3d84a, #dc2626);
}
.legend-ends { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-dim); }

@media (max-width: 720px) {
  .board-and-stats { grid-template-columns: 1fr; }
}
</style>
