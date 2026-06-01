<script setup lang="ts">
import { computed } from 'vue'
import type { ActivityDay } from '~/composables/useTeam'

const props = defineProps<{
  from: string | null
  to: string | null
  days: Record<string, ActivityDay>
}>()

const MS = 86_400_000
const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

// Parse a YYYY-MM-DD string into a UTC date (avoids local-tz off-by-one).
const toDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y!, (m! - 1), d!))
}
const fmtDay = (dt: Date) => dt.toISOString().slice(0, 10)
// Monday = 0 … Sunday = 6
const dow = (dt: Date) => (dt.getUTCDay() + 6) % 7

const levelFor = (v: number) => (v === 0 ? 0 : v <= 1 ? 1 : v <= 3 ? 2 : v <= 5 ? 3 : 4)

interface Cell {
  date: string
  challenges: number
  dailies: number
  total: number
  level: number
}
interface Week {
  cells: (Cell | null)[]
  monthLabel: string | null
}

const grid = computed<Week[]>(() => {
  if (!props.from || !props.to) return []
  const from = props.from
  const to = props.to
  const end = toDate(to)

  // Start the grid on the Monday on/before `from` so every column is a full week.
  const start = toDate(from)
  start.setUTCDate(start.getUTCDate() - dow(start))

  const weeks: Week[] = []
  let cur = new Date(start)
  let lastLabeledMonth = -1

  while (cur <= end) {
    // Month label: when this week's Monday falls in a new month.
    const weekMonth = cur.getUTCMonth()
    let monthLabel: string | null = null
    if (weekMonth !== lastLabeledMonth) {
      monthLabel = MONTHS[weekMonth]!
      lastLabeledMonth = weekMonth
    }

    const cells: (Cell | null)[] = []
    for (let i = 0; i < 7; i++) {
      const ds = fmtDay(cur)
      if (ds < from || ds > to) {
        cells.push(null)
      } else {
        const d = props.days[ds] ?? { challenges: 0, dailies: 0 }
        const total = (d.challenges || 0) + (d.dailies || 0)
        cells.push({ date: ds, challenges: d.challenges || 0, dailies: d.dailies || 0, total, level: levelFor(total) })
      }
      cur = new Date(cur.getTime() + MS)
    }
    weeks.push({ cells, monthLabel })
  }
  return weeks
})

const tip = (c: Cell) =>
  c.total === 0
    ? `${c.date}: нет активности`
    : `${c.date}: челленджи — ${c.challenges}, ежедневки — ${c.dailies}`
</script>

<template>
  <div class="hm">
    <div class="hm-grid">
      <!-- weekday labels -->
      <div class="hm-weekdays" aria-hidden="true">
        <span></span>
        <span>Пн</span>
        <span></span>
        <span>Ср</span>
        <span></span>
        <span>Пт</span>
        <span></span>
      </div>

      <div class="hm-cols">
        <!-- month labels -->
        <div class="hm-months" aria-hidden="true">
          <span v-for="(w, i) in grid" :key="'m' + i" class="hm-month">{{ w.monthLabel || '' }}</span>
        </div>
        <!-- week columns -->
        <div class="hm-weeks">
          <div v-for="(w, i) in grid" :key="i" class="hm-week">
            <span
              v-for="(c, j) in w.cells"
              :key="j"
              class="hm-cell"
              :data-level="c ? c.level : -1"
              :title="c ? tip(c) : ''"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="hm-legend font-mono">
      <span>Меньше</span>
      <span class="hm-cell" data-level="0" />
      <span class="hm-cell" data-level="1" />
      <span class="hm-cell" data-level="2" />
      <span class="hm-cell" data-level="3" />
      <span class="hm-cell" data-level="4" />
      <span>Больше</span>
    </div>
  </div>
</template>

<style scoped>
.hm {
  --hm-cell: 12px;
  --hm-gap: 3px;
  overflow-x: auto;
  scrollbar-width: thin;
}
.hm-grid {
  display: flex;
  gap: 6px;
}
.hm-weekdays {
  display: grid;
  grid-template-rows: repeat(7, var(--hm-cell));
  gap: var(--hm-gap);
  padding-top: 16px; /* clear the month-label row */
  flex-shrink: 0;
}
.hm-weekdays span {
  height: var(--hm-cell);
  line-height: var(--hm-cell);
  font-size: 9px;
  letter-spacing: .04em;
  color: var(--color-ink-3);
  white-space: nowrap;
}
.hm-cols { min-width: 0; }
.hm-months {
  display: flex;
  height: 14px;
  margin-bottom: 2px;
}
.hm-month {
  width: calc(var(--hm-cell) + var(--hm-gap));
  font-size: 9px;
  letter-spacing: .04em;
  color: var(--color-ink-3);
  white-space: nowrap;
  overflow: visible;
  flex-shrink: 0;
}
.hm-weeks {
  display: flex;
  gap: var(--hm-gap);
}
.hm-week {
  display: grid;
  grid-template-rows: repeat(7, var(--hm-cell));
  gap: var(--hm-gap);
}
.hm-cell {
  width: var(--hm-cell);
  height: var(--hm-cell);
  border-radius: 3px;
  background: var(--color-bg-3);
}
/* intensity scale — mint/cyan brand ramp; empty cells stay on bg-3 */
.hm-cell[data-level="-1"] { background: transparent; }
.hm-cell[data-level="0"] { background: var(--color-bg-3); }
.hm-cell[data-level="1"] { background: rgba(82, 242, 197, 0.32); }
.hm-cell[data-level="2"] { background: rgba(82, 242, 197, 0.55); }
.hm-cell[data-level="3"] { background: rgba(24, 239, 242, 0.72); }
.hm-cell[data-level="4"] { background: var(--color-cyan-brand); }

.hm-legend {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
  font-size: 9px;
  letter-spacing: .06em;
  color: var(--color-ink-3);
}
.hm-legend .hm-cell { width: 11px; height: 11px; }
</style>
