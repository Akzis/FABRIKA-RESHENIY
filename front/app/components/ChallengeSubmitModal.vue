<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { ChallengeTask } from '~/types/landing'

const props = defineProps<{ challenge: ChallengeTask | null }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'submitted'): void }>()

const { submit } = useSubmissions()

const comment = ref('')
const files = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const submitting = ref(false)
const error = ref<string | null>(null)

const MAX_FILE = 20 * 1024 * 1024 // 20 MB per file

const fmtSize = (n: number) => {
  if (n < 1024) return `${n} Б`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} КБ`
  return `${(n / (1024 * 1024)).toFixed(1)} МБ`
}

const pickFiles = () => fileInput.value?.click()

const onFilesChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  input.value = ''
  error.value = null
  for (const f of picked) {
    if (f.size > MAX_FILE) { error.value = `Файл «${f.name}» больше 20 МБ`; continue }
    files.value = [...files.value, f]
  }
}

const removeFile = (idx: number) => {
  files.value = files.value.filter((_, i) => i !== idx)
}

const canSubmit = computed(
  () => !submitting.value && !!props.challenge?.id && (comment.value.trim().length > 0 || files.value.length > 0),
)

const onSubmit = async () => {
  if (!canSubmit.value || !props.challenge?.id) return
  submitting.value = true
  error.value = null
  const ok = await submit(props.challenge.id, comment.value.trim(), files.value)
  submitting.value = false
  if (ok) {
    emit('submitted')
    emit('close')
  } else {
    error.value = 'Не удалось отправить. Возможно, задание уже на проверке.'
  }
}

const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close') }
onMounted(() => document.addEventListener('keydown', onEsc))
onBeforeUnmount(() => document.removeEventListener('keydown', onEsc))
</script>

<template>
  <Teleport to="body">
    <div class="cs-overlay" @click.self="emit('close')">
      <div class="cs-card" role="dialog" aria-modal="true" :aria-label="`Сдать челлендж ${challenge?.title ?? ''}`">
        <button class="cs-close" aria-label="Закрыть" @click="emit('close')">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div class="font-mono text-[10px] tracking-[0.14em] uppercase text-cyan-brand mb-2">Сдать на проверку</div>
        <h3 class="font-pix text-[24px] leading-tight m-0 mb-1 text-ink uppercase pr-8">{{ challenge?.title }}</h3>
        <p v-if="challenge?.description" class="m-0 mb-5 text-[13px] leading-relaxed text-ink-3">{{ challenge.description }}</p>

        <label class="block font-mono text-[10px] tracking-[0.14em] text-ink-3 uppercase mb-2">Комментарий к решению</label>
        <textarea
          v-model="comment"
          rows="5"
          placeholder="Опиши, что сделал, дай ссылку на результат или поясни решение…"
          class="w-full py-3 px-3.5 bg-bg border border-line-strong rounded-[10px] text-ink text-[14px] leading-relaxed outline-none transition-colors duration-150 focus:border-cyan-brand resize-y"
        />

        <label class="block font-mono text-[10px] tracking-[0.14em] text-ink-3 uppercase mt-5 mb-2">Файлы</label>
        <button type="button" class="cs-attach font-mono" @click="pickFiles">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          Прикрепить файл
        </button>
        <input ref="fileInput" type="file" multiple class="hidden" @change="onFilesChange" />

        <ul v-if="files.length" class="mt-3 flex flex-col gap-2">
          <li
            v-for="(f, i) in files"
            :key="i"
            class="flex items-center gap-2.5 py-2 px-3 bg-bg-3 border border-line rounded-lg"
          >
            <span class="text-[13px] text-ink truncate flex-1">{{ f.name }}</span>
            <span class="font-mono text-[10px] text-ink-3 shrink-0">{{ fmtSize(f.size) }}</span>
            <button type="button" class="text-ink-3 hover:text-[#ff7575] shrink-0" aria-label="Убрать" @click="removeFile(i)">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </li>
        </ul>

        <p
          v-if="error"
          class="font-mono text-[12px] tracking-[0.04em] text-[#ff7575] bg-[rgba(255,117,117,0.08)] border border-[rgba(255,117,117,0.25)] rounded-lg py-2.5 px-3 mt-4"
        >
          {{ error }}
        </p>

        <div class="flex gap-3 mt-6">
          <button type="button" class="cs-btn-ghost font-mono" @click="emit('close')">Отмена</button>
          <button type="button" class="cs-btn-primary font-mono" :disabled="!canSubmit" @click="onSubmit">
            {{ submitting ? 'Отправляем…' : 'Отправить на проверку →' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cs-overlay {
  position: fixed;
  inset: 0;
  z-index: 210;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(11, 11, 14, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: csFade 180ms ease-out;
}
[data-theme="light"] .cs-overlay { background: rgba(13, 13, 18, 0.35); }
@keyframes csFade { from { opacity: 0; } to { opacity: 1; } }

.cs-card {
  position: relative;
  width: min(540px, 100%);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  background: var(--color-panel-bg, var(--color-bg-2));
  border: 1px solid var(--color-line-strong);
  border-radius: 18px;
  padding: 26px 26px 24px;
  box-shadow: 0 30px 80px -16px rgba(0, 0, 0, 0.6);
  animation: csPop 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes csPop { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: none; } }

.cs-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-3);
  background: transparent;
  border: 1px solid var(--color-line);
  cursor: pointer;
  transition: color 150ms, border-color 150ms, transform 200ms cubic-bezier(0.34,1.56,0.64,1);
}
.cs-close:hover { color: var(--color-ink); border-color: var(--color-ink-2); transform: rotate(90deg); }

.cs-attach {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px dashed var(--color-line-strong);
  background: var(--color-bg-3);
  color: var(--color-ink-2);
  font-size: 11px;
  letter-spacing: .06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 150ms, color 150ms, background 150ms;
}
.cs-attach:hover { border-color: var(--color-cyan-brand); color: var(--color-cyan-brand); }

.cs-btn-ghost {
  padding: 12px 18px;
  border-radius: 10px;
  border: 1px solid var(--color-line-strong);
  background: transparent;
  color: var(--color-ink-2);
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color 150ms, border-color 150ms;
}
.cs-btn-ghost:hover { color: var(--color-ink); border-color: var(--color-ink-2); }

.cs-btn-primary {
  flex: 1;
  padding: 12px 18px;
  border-radius: 10px;
  border: 0;
  background: var(--color-cyan-brand);
  color: var(--color-btn-ink);
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: opacity 150ms, transform 150ms;
}
.cs-btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
.cs-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
</style>
