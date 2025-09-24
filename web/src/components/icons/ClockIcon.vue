<script setup lang="ts">
const { size = 24 } = defineProps<{ size?: number }>();
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" />
    <polyline
      points="12,6 12,12 16,14"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
