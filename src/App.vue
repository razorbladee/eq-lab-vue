<script setup>
import { computed } from 'vue';

const sourceUrl = computed(() => '/eq-lab-vue%20(2).html');
</script>

<template>
  <main class="app-shell">
    <iframe
      class="visualizer-frame"
      :src="sourceUrl"
      title="EQ Lab audio visualizer"
      allow="autoplay; microphone"
    />
  </main>
</template>
