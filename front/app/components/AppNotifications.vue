<script setup lang="ts">
import type { NotificationAccent } from '~/composables/useNotifications'

// Calling this here installs the profile → notification watcher (once) and
// gives us the shared queue. Mounted globally in app.vue so toasts stay visible
// no matter where on the page the completion happened.
const { notifications, dismiss } = useNotifications()

const accentTextClass: Record<NotificationAccent, string> = {
  mint: 'text-mint-brand',
  cyan: 'text-cyan-brand',
  purple: 'text-purple-brand',
}
const accentVarOf: Record<NotificationAccent, string> = {
  mint: 'var(--color-mint-brand)',
  cyan: 'var(--color-cyan-brand)',
  purple: 'var(--color-purple-brand)',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-[84px] right-4 sm:right-6 z-[200] w-[300px] max-w-[calc(100vw-2rem)] flex flex-col gap-2.5 pointer-events-none">
      <TransitionGroup name="app-notif">
        <div
          v-for="n in notifications"
          :key="n.id"
          role="status"
          @click="dismiss(n.id)"
          class="pointer-events-auto border border-line-strong rounded-xl py-3.5 px-4 backdrop-blur-md flex items-center gap-3 cursor-pointer shadow-[0_14px_44px_rgba(0,0,0,0.5)]"
          style="background: var(--color-panel-bg)"
        >
          <span
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :style="{ background: accentVarOf[n.accent], boxShadow: `0 0 12px ${accentVarOf[n.accent]}` }"
          ></span>
          <span class="font-mono text-[12px] tracking-[0.06em] text-ink-2">
            <template v-if="n.xp != null">
              <b :class="accentTextClass[n.accent]" class="font-semibold">+{{ n.xp }} XP</b> ·
            </template>{{ n.text }}
          </span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
/* Slide in from the right, fade/collapse out, reflow neighbours smoothly. */
.app-notif-enter-active,
.app-notif-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.app-notif-enter-from,
.app-notif-leave-to {
  opacity: 0;
  transform: translateX(28px) scale(0.96);
}
.app-notif-leave-active {
  position: absolute;
  width: 100%;
}
.app-notif-move {
  transition: transform 0.4s ease;
}
</style>
