<script setup lang="ts">
useReveal('.cta-reveal', { y: 40, scale: 0.92, blur: 6, stagger: 0.12, duration: 1.0, ease: 'power4.out' })
</script>

<template>
  <section class="py-[110px]">
    <div class="max-w-[1320px] mx-auto px-8">
      <div class="relative overflow-hidden border border-line rounded-[26px] py-[70px] px-15 text-center"
        style="background:
          radial-gradient(circle at 20% 30%, rgba(24,239,242,0.18), transparent 40%),
          radial-gradient(circle at 85% 70%, rgba(181,89,243,0.18), transparent 40%),
          var(--color-bg-2);"
      >
        <div class="absolute inset-0 cta-grid-bg pointer-events-none"></div>

        <h2 class="cta-reveal font-pix text-[clamp(48px,6vw,80px)] leading-[0.95] mx-auto mb-5 uppercase max-w-[800px] relative">
          Готов взять<br />первый <span class="text-cyan-brand">челлендж</span>?
        </h2>
        <p class="cta-reveal text-ink-2 text-[17px] leading-[1.5] max-w-[480px] mx-auto mb-9 relative">
          Открой свой дашборд, выбери дейли по силам и забери первые XP уже сегодня.
        </p>
        <div class="cta-reveal flex gap-3.5 justify-center flex-wrap relative">
          <BaseButton variant="primary" size="lg" as="a" href="#progress">
            Открыть дашборд <span>→</span>
          </BaseButton>
          <BaseButton variant="ghost" size="lg" as="a" href="#how">Сначала разобраться</BaseButton>
        </div>
      </div>
    </div>
  </section>
</template>
