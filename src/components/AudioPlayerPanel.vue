<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import AudioRegionSelector from './AudioRegionSelector.vue';
import PlaybackSeekbar from './PlaybackSeekbar.vue';
const props = defineProps({ playing: Boolean, hasFile: Boolean, fileName: String });
const emit = defineEmits(['ready', 'toggle']);
const audio = ref(null);
const audioSrc = ref('');
const duration = ref(0),
  current = ref(0),
  from = ref(0),
  to = ref(0);
const fmt = (value) => {
  const s = Math.max(0, Math.floor(Number(value) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const syncBounds = () => {
  duration.value = Number.isFinite(audio.value?.duration) ? audio.value.duration : 0;
  if (!to.value || to.value > duration.value) to.value = duration.value;
  if (from.value > to.value) from.value = 0;
};
const setSelection = () => {
  from.value = Math.min(from.value, Math.max(0, to.value - 0.05));
  to.value = Math.max(to.value, Math.min(duration.value, from.value + 0.05));
  if (audio.value) {
    audio.value.dataset.selectionFrom = String(from.value);
    audio.value.dataset.selectionTo = String(to.value);
  }
};
const seek = (time) => {
  current.value = Number(time);
  if (audio.value) audio.value.currentTime = current.value;
};
const onTime = () => {
  current.value = audio.value?.currentTime || 0;
  if (to.value > from.value && current.value >= to.value) {
    audio.value.pause();
    current.value = to.value;
  }
};
const onPlay = () => emit('play-state', true);
const onPause = () => emit('play-state', false);
onMounted(() => {
  const el = audio.value;
  emit('ready', audio);
  el.addEventListener('loadedmetadata', syncBounds);
  el.addEventListener('durationchange', syncBounds);
  el.addEventListener('timeupdate', onTime);
  el.addEventListener('play', onPlay);
  el.addEventListener('pause', onPause);
});
onUnmounted(() => {
  const el = audio.value;
  el?.removeEventListener('loadedmetadata', syncBounds);
  el?.removeEventListener('durationchange', syncBounds);
  el?.removeEventListener('timeupdate', onTime);
  el?.removeEventListener('play', onPlay);
  el?.removeEventListener('pause', onPause);
});
watch(
  () => props.hasFile,
  (value) => {
    if (value && audio.value) {
      audioSrc.value = audio.value.src;
    } else {
      audioSrc.value = '';
      duration.value = 0;
      current.value = 0;
      from.value = 0;
      to.value = 0;
    }
  },
);
watch([from, to], setSelection);
</script>
<template>
  <section class="player-panel" aria-label="Аудиоплеер">
    <PlaybackSeekbar :duration="duration" :current="current" :from="from" :to="to" @seek="seek" />
    <div class="player-row">
      <button
        type="button"
        class="btn btn-primary player-toggle-icon"
        :disabled="!hasFile"
        @click="emit('toggle')"
        :title="playing ? 'Пауза' : 'Играть'"
      >
        <svg v-if="playing" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      <div class="player-region-container">
        <AudioRegionSelector
          v-if="duration"
          :src="audioSrc"
          :duration="duration"
          v-model:from="from"
          v-model:to="to"
        />
        <div v-else class="region-placeholder">Нет загруженного трека</div>
      </div>

      <span class="player-time mono">{{ fmt(current) }} / {{ fmt(duration) }}</span>
    </div>
    <audio ref="audio" preload="metadata"></audio>
  </section>
</template>
