<script setup>
import { computed } from 'vue'
import { CRICKET_NUMBERS } from '../useGame.js'

const props = defineProps({
  players: { type: Array, required: true },
  activeId: { type: Number, required: true },
})

const rows = CRICKET_NUMBERS // [20,19,18,17,16,15,25]

function label(n) {
  return n === 25 ? 'Bull' : String(n)
}

// A number is "dead" once every player has closed it (3 marks).
const deadNumbers = computed(() => {
  const dead = {}
  for (const n of rows) {
    dead[n] = props.players.every((p) => p.marks[n] >= 3)
  }
  return dead
})

// Symbol for a mark count: 1 = /, 2 = ✕, 3 = closed ⊗.
function markClass(count) {
  return count >= 3 ? 'closed' : count === 2 ? 'two' : count === 1 ? 'one' : 'none'
}
</script>

<template>
  <div class="cricket-scroll">
    <table class="cricket">
      <thead>
        <tr>
          <th class="corner"></th>
          <th
            v-for="p in players" :key="p.id"
            class="phead" :class="{ active: p.id === activeId }"
          >
            <div class="pname">{{ p.name }}</div>
            <div class="ppoints">{{ p.points }}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="n in rows" :key="n" :class="{ dead: deadNumbers[n] }">
          <th class="num">{{ label(n) }}</th>
          <td
            v-for="p in players" :key="p.id"
            :class="{ active: p.id === activeId }"
          >
            <span class="mark" :class="markClass(p.marks[n])">
              <template v-if="p.marks[n] >= 3">⊗</template>
              <template v-else-if="p.marks[n] === 2">✕</template>
              <template v-else-if="p.marks[n] === 1">╱</template>
            </span>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th class="num">Pts</th>
          <td
            v-for="p in players" :key="p.id"
            class="pts" :class="{ active: p.id === activeId }"
          >{{ p.points }}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<style scoped>
.cricket-scroll { width: 100%; }
.cricket {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
}
th, td {
  border: 1px solid var(--line);
  text-align: center;
  padding: 4px 3px;
}
.corner { width: 38px; background: var(--surface-2); }
.phead {
  background: var(--surface-2);
}
.phead.active { background: rgba(220, 38, 38, 0.18); }
.pname {
  font-weight: 700; font-size: 0.72rem; max-width: 100%;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0 auto;
}
.ppoints { font-size: 1rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.phead.active .ppoints { color: var(--accent); }

.num {
  background: var(--surface-2); font-weight: 800; font-size: 0.9rem;
  width: 38px; color: var(--text);
}
td { height: 34px; }
td.active { background: rgba(220, 38, 38, 0.08); }

.mark { font-size: 1.15rem; line-height: 1; display: inline-block; }
.mark.one { color: var(--text-dim); }
.mark.two { color: var(--text); }
.mark.closed { color: var(--board-green); font-weight: 700; }

tr.dead { opacity: 0.45; }
tr.dead .num { text-decoration: line-through; }

.pts { font-weight: 800; font-size: 1.05rem; font-variant-numeric: tabular-nums; }
tfoot .num { background: var(--surface-3); }
</style>
