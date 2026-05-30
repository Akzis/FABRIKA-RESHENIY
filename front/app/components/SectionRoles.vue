<script setup lang="ts">
const { roles } = useLandingData()

const roleCls: Record<string, { border: string; tag: string; title: string; bullet: string }> = {
  member: {
    border: 'border-[rgba(82,242,197,0.35)]',
    tag: 'text-mint-brand border-[rgba(82,242,197,0.4)] bg-[rgba(82,242,197,0.08)]',
    title: 'text-mint-brand',
    bullet: 'bg-mint-brand',
  },
  pm: {
    border: 'border-[rgba(24,239,242,0.35)]',
    tag: 'text-cyan-brand border-[rgba(24,239,242,0.4)] bg-[rgba(24,239,242,0.08)]',
    title: 'text-cyan-brand',
    bullet: 'bg-cyan-brand',
  },
}

useReveal('.role-card', { stagger: 0.18, y: 60, scale: 0.96, duration: 1.0 })
</script>

<template>
  <section id="roles" class="py-[110px] relative">
    <div class="max-w-[1320px] mx-auto px-8">
      <SectionHeader tag="Многопользовательский режим" tag-color="var(--color-purple-brand)" sub="Платформа поддерживает раздельные роли. Каждая видит свой интерфейс, свои метрики и свои возможности.">
        <template #title>
          Два <span class="text-purple-brand">режима</span><br />работы
        </template>
      </SectionHeader>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          v-for="r in roles"
          :key="r.key"
          :class="['role-card relative overflow-hidden bg-bg-2 border rounded-[22px] p-9', roleCls[r.key].border]"
        >
          <img :src="r.image" alt="" class="absolute -right-2.5 -top-2.5 w-[180px] opacity-85 drop-shadow-[0_18px_30px_rgba(0,0,0,0.5)]" />
          <span :class="['relative font-mono text-[11px] tracking-[0.14em] uppercase py-1.5 px-3 border rounded-full inline-block', roleCls[r.key].tag]">
            {{ r.tag }}
          </span>
          <h3 :class="['relative font-pix text-[44px] leading-none mt-[22px] mb-3.5 uppercase max-w-[320px]', roleCls[r.key].title]">
            <template v-for="(line, i) in r.title" :key="i">
              {{ line }}<br />
            </template>
          </h3>
          <p class="relative text-ink-2 text-[15px] leading-[1.55] max-w-[380px] m-0 mb-7">{{ r.description }}</p>
          <ul class="relative m-0 p-0 list-none">
            <li
              v-for="(b, i) in r.bullets"
              :key="i"
              class="text-sm py-3.5 border-t border-line flex items-center gap-3 text-ink-2"
            >
              <span :class="['w-2 h-2 shrink-0', roleCls[r.key].bullet]"></span>
              <span v-html="b"></span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
