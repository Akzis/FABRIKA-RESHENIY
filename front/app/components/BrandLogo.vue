<script setup lang="ts">
/**
 * Theme-aware logo. Renders the light-theme image and the dark-theme (white)
 * image; CSS shows only the one matching the current `data-theme` on <html>.
 * Doing the swap in CSS (not reactively) keeps it flash-free and SSR-safe.
 */
withDefaults(defineProps<{
  light: string
  dark: string
  alt?: string
  imgClass?: string
}>(), { alt: 'Фабрика решений', imgClass: '' })
</script>

<template>
  <img :src="light" :alt="alt" :class="['brand-logo brand-logo--light', imgClass]" />
  <img :src="dark" :alt="alt" :class="['brand-logo brand-logo--dark', imgClass]" />
</template>

<style>
/* default (and light theme): show the light logo, hide the white one */
.brand-logo--dark { display: none; }
[data-theme="dark"] .brand-logo--light { display: none; }
[data-theme="dark"] .brand-logo--dark { display: inline-block; }
</style>
