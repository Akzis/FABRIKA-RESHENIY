<script setup lang="ts">
const { howSteps } = useLandingData()
useReveal('.how-step', { stagger: 0.12, y: 60, scale: 0.92, blur: 6, duration: 1.0, ease: 'power3.out' })
</script>

<template>
  <section id="how" class="py-[110px] relative">
    <div class="max-w-[1320px] mx-auto px-8">
      <SectionHeader tag="Механика" sub="Каждый день платформа подбирает челленджи под уровень команды. Чем сложнее задача — тем больше баллов и шанс получить эксклюзивную награду в магазине.">
        <template #title>
          4 шага<br />от задачи<br />до <span class="text-cyan-brand">награды</span>
        </template>
      </SectionHeader>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="step in howSteps"
          :key="step.n"
          class="how-step relative overflow-hidden bg-bg-2 border border-line rounded-[18px] p-7 transition-[border-color,transform] duration-200 hover:border-line-strong hover:-translate-y-1"
        >
          <span class="absolute right-[22px] top-[18px] font-pix text-[60px] leading-none text-bg-3">{{ step.n }}</span>
          <div class="w-16 h-16 flex items-center justify-center bg-bg-3 rounded-xl mb-[22px]">
            <img :src="step.icon" alt="" class="w-11 [image-rendering:pixelated]" />
          </div>
          <h3 class="font-pix text-2xl m-0 mb-2.5 uppercase whitespace-pre-line">{{ step.title }}</h3>
          <p class="text-ink-2 text-sm leading-[1.5] m-0">{{ step.text }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
