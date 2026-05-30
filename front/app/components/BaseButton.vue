<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'ghost' | 'purple'
  size?: 'md' | 'lg'
  as?: 'button' | 'a'
  href?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  as: 'button',
})

const base = 'inline-flex items-center gap-2 rounded-full font-semibold transition-[transform,background-color,color,border-color] duration-150 border border-transparent cursor-pointer'

const sizes: Record<string, string> = {
  md: 'text-sm px-5 py-3',
  lg: 'text-[15px] px-7 py-4',
}

const variants: Record<string, string> = {
  primary: 'bg-cyan-brand text-btn-ink hover:-translate-y-px hover:brightness-110',
  ghost: 'bg-transparent text-ink-2 border-line-strong hover:text-ink hover:border-ink-2',
  purple: 'bg-purple-brand text-white hover:bg-[#c376ff]',
}
</script>

<template>
  <component
    :is="as"
    :href="href"
    :class="[base, sizes[props.size], variants[props.variant]]"
  >
    <slot />
  </component>
</template>
