<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

const { team, members, loading, fetch, rename } = useTeam()
const strapiBase = (useRuntimeConfig().public as any)?.strapi?.url ?? 'http://localhost:1337'

onMounted(() => { void fetch() })

const avatarSrc = (url: string | null): string | null => {
  if (!url) return null
  return /^https?:\/\//.test(url) ? url : `${strapiBase}${url}`
}

const initial = (name: string) => (name?.[0] ?? '?').toUpperCase()
const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ')

// ── team rename (inline) ──
const editing = ref(false)
const draftName = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

watch(team, (t) => { if (t && !editing.value) draftName.value = t.name }, { immediate: true })

const startEdit = () => {
  draftName.value = team.value?.name ?? ''
  error.value = null
  editing.value = true
}
const cancelEdit = () => { editing.value = false; error.value = null }
const saveName = async () => {
  if (saving.value) return
  saving.value = true
  error.value = null
  const err = await rename(draftName.value)
  saving.value = false
  if (err) { error.value = err; return }
  editing.value = false
}

// aggregate stats for the header
const totalXp = computed(() => members.value.reduce((s, m) => s + (m.xp || 0), 0))
const totalClosed = computed(() => members.value.reduce((s, m) => s + (m.challengesClosed || 0), 0))

</script>

<template>
  <section id="team" class="py-[90px] relative scroll-mt-24">
    <div class="max-w-[1100px] mx-auto px-8">
      <SectionHeader tag="Команда" tag-color="var(--color-mint-brand)" sub="Все участники твоей команды и их статистика: опыт, уровень, закрытые челленджи и серия. Здесь же можно переименовать команду.">
        <template #title>
          Моя <span class="text-mint-brand">команда</span>
        </template>
      </SectionHeader>

      <!-- team header card: name + rename + totals -->
      <div class="bg-bg-2 border border-line rounded-[18px] p-6 mb-6 flex flex-wrap items-center gap-5">
        <div class="flex-1 min-w-[220px]">
          <div class="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-3 mb-2">Название команды</div>

          <div v-if="!editing" class="flex items-center gap-3 flex-wrap">
            <span class="font-pix text-[28px] leading-none text-ink uppercase">{{ team?.name ?? '—' }}</span>
            <button type="button" class="tr-edit font-mono" @click="startEdit">✎ Переименовать</button>
          </div>

          <div v-else class="flex items-center gap-2 flex-wrap">
            <input
              v-model="draftName"
              type="text"
              maxlength="60"
              class="py-2.5 px-3.5 bg-bg border border-line-strong rounded-[10px] text-ink text-[16px] outline-none focus:border-mint-brand min-w-[220px]"
              @keyup.enter="saveName"
              @keyup.esc="cancelEdit"
            />
            <button type="button" class="tr-save font-mono" :disabled="saving" @click="saveName">
              {{ saving ? 'Сохраняем…' : 'Сохранить' }}
            </button>
            <button type="button" class="tr-cancel font-mono" :disabled="saving" @click="cancelEdit">Отмена</button>
          </div>

          <p v-if="error" class="font-mono text-[12px] text-[#ff7575] mt-2">{{ error }}</p>
        </div>

        <div class="flex gap-6">
          <div class="text-center">
            <div class="font-pix text-[24px] text-cyan-brand leading-none">{{ members.length }}</div>
            <div class="font-mono text-[9px] tracking-[0.1em] uppercase text-ink-3 mt-1.5">участников</div>
          </div>
          <div class="text-center">
            <div class="font-pix text-[24px] text-mint-brand leading-none">{{ fmt(totalXp) }}</div>
            <div class="font-mono text-[9px] tracking-[0.1em] uppercase text-ink-3 mt-1.5">XP команды</div>
          </div>
          <div class="text-center">
            <div class="font-pix text-[24px] text-purple-brand leading-none">{{ fmt(totalClosed) }}</div>
            <div class="font-mono text-[9px] tracking-[0.1em] uppercase text-ink-3 mt-1.5">челленджей</div>
          </div>
        </div>
      </div>

      <!-- members list -->
      <div class="bg-bg-2 border border-line rounded-[18px] p-6">
        <div class="flex items-center justify-between mb-4">
          <h4 class="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase m-0 flex items-center gap-2.5 before:content-[''] before:w-2 before:h-2 before:bg-mint-brand">
            Участники
          </h4>
          <button type="button" class="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 hover:text-ink-2" :disabled="loading" @click="fetch()">
            {{ loading ? 'Обновляем…' : 'Обновить' }}
          </button>
        </div>

        <p v-if="!members.length" class="text-sm text-ink-3 py-10 text-center">
          В команде пока нет участников. Пригласи их ссылкой из профиля.
        </p>

        <!-- column header -->
        <div v-else class="hidden sm:grid grid-cols-[1.6fr_repeat(4,0.8fr)] gap-3 px-3 pb-2 font-mono text-[9px] tracking-[0.1em] uppercase text-ink-3 border-b border-line">
          <span>Участник</span>
          <span class="text-right">Уровень</span>
          <span class="text-right">XP</span>
          <span class="text-right">Челленджи</span>
          <span class="text-right">Серия</span>
        </div>

        <div class="flex flex-col gap-1.5 mt-2">
          <div
            v-for="(m, i) in members"
            :key="m.id"
            class="grid grid-cols-2 sm:grid-cols-[1.6fr_repeat(4,0.8fr)] gap-3 items-center px-3 py-3 rounded-xl bg-bg-3 border border-line hover:border-line-strong transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0 col-span-2 sm:col-span-1">
              <div class="w-9 h-9 rounded-[10px] overflow-hidden flex items-center justify-center font-pix text-white text-sm shrink-0" style="background: linear-gradient(135deg, var(--color-purple-brand), var(--color-cyan-brand))">
                <img v-if="avatarSrc(m.avatarUrl)" :src="avatarSrc(m.avatarUrl)!" alt="" class="w-full h-full object-cover" />
                <template v-else>{{ initial(m.name) }}</template>
              </div>
              <div class="min-w-0">
                <div class="text-sm font-semibold text-ink truncate">{{ m.name }}</div>
                <div class="font-mono text-[11px] text-ink-3 truncate">@{{ m.username }}</div>
              </div>
            </div>
            <div class="text-right"><span class="sm:hidden font-mono text-[9px] uppercase text-ink-3 mr-1.5">LVL</span><span class="font-pix text-[16px] text-ink">{{ m.level }}</span></div>
            <div class="text-right"><span class="sm:hidden font-mono text-[9px] uppercase text-ink-3 mr-1.5">XP</span><span class="font-pix text-[16px] text-cyan-brand">{{ fmt(m.xp) }}</span></div>
            <div class="text-right"><span class="sm:hidden font-mono text-[9px] uppercase text-ink-3 mr-1.5">Зад.</span><span class="font-pix text-[16px] text-mint-brand">{{ m.challengesClosed }}</span></div>
            <div class="text-right"><span class="sm:hidden font-mono text-[9px] uppercase text-ink-3 mr-1.5">Серия</span><span class="font-pix text-[16px] text-purple-brand">{{ m.streak }}</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tr-edit {
  padding: 7px 12px;
  border-radius: 9px;
  border: 1px solid var(--color-line-strong);
  background: transparent;
  color: var(--color-ink-2);
  font-size: 10px;
  letter-spacing: .08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 150ms, border-color 150ms;
}
.tr-edit:hover { color: var(--color-mint-brand); border-color: var(--color-mint-brand); }

.tr-save {
  padding: 9px 16px;
  border-radius: 10px;
  border: 0;
  background: var(--color-mint-brand);
  color: var(--color-btn-ink);
  font-size: 11px;
  letter-spacing: .06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: opacity 150ms;
}
.tr-save:disabled { opacity: .5; cursor: progress; }

.tr-cancel {
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid var(--color-line-strong);
  background: transparent;
  color: var(--color-ink-2);
  font-size: 11px;
  letter-spacing: .06em;
  text-transform: uppercase;
  cursor: pointer;
}
.tr-cancel:hover:not(:disabled) { color: var(--color-ink); }
</style>
