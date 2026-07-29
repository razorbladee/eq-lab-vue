<script setup>
import { onMounted, ref } from 'vue';
const props = defineProps({
  frameStyle: Object,
  dragging: Boolean,
  meters: Array,
  bands: Array,
  bpm: [String, Number],
  error: Object,
});
const emit = defineEmits(['dragover', 'dragleave', 'drop', 'ready']);
const canvas = ref(null);
const frame = ref(null);
onMounted(() => emit('ready', { canvas, frame }));
</script>
<template>
  <main class="stage">
    <div class="frame" ref="frame" :style="frameStyle">
      <canvas ref="canvas"></canvas>
      <div v-if="dragging" class="drop">Отпустите аудиофайл</div>
      <div v-if="error" class="drop" style="background: oklch(46% 0.185 32 / 0.8)">
        {{ error.msg }}
      </div>
    </div>
  </main>
</template>
