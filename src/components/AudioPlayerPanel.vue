<script setup>
import { onMounted, ref } from 'vue';
const props = defineProps({ playing: Boolean, hasFile: Boolean, fileName: String });
const emit = defineEmits(['ready','toggle']);
const audio = ref(null);
onMounted(() => emit('ready', audio));
</script>
<template>
  <section class="player-panel" aria-label="Аудиоплеер">
    <button type="button" class="btn btn-primary player-toggle" :disabled="!hasFile" @click="emit('toggle')">{{ playing ? 'Пауза' : 'Играть' }}</button>
    <span class="player-name" :title="fileName">{{ fileName || 'Источник не выбран' }}</span>
    <audio ref="audio" controls preload="metadata"></audio>
  </section>
</template>
