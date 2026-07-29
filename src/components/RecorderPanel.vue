<script setup>
import { computed, ref, unref } from 'vue';

const props = defineProps({ recording: [Boolean, Object], countdown: [Number, Object], error: [String, Object], start: Function, stop: Function, cancel: Function });
const isRecording = computed(() => unref(props.recording) === true);
const message = computed(() => unref(props.error) || '');
const fps = ref(60);
const bitrate = ref(8_000_000);
const duration = ref(0);
const bitrateLabel = computed(() => `${Math.round(bitrate.value / 1_000_000)} Mbps`);
const begin = () => props.start(fps.value, bitrate.value, duration.value);
</script>
<template>
  <details class="sec recorder-panel" open>
    <summary>Запись WebM</summary>
    <div class="sec-body panel-body">
      <p v-if="isRecording" class="rec-status rec-live">Идёт запись</p>
      <p v-if="message" class="rec-error">{{ message }}</p>
      <label><span class="plabel">FPS <span class="pval">{{ fps }}</span></span><select v-model.number="fps" :disabled="isRecording"><option :value="30">30</option><option :value="60">60</option></select></label>
      <label><span class="plabel">Bitrate <span class="pval">{{ bitrateLabel }}</span></span><input v-model.number="bitrate" :disabled="isRecording" type="range" min="2_000_000" max="16_000_000" step="1_000_000"></label>
      <label><span class="plabel">Автостоп <span class="pval">{{ duration ? `${duration} сек.` : 'Выкл.' }}</span></span><select v-model.number="duration" :disabled="isRecording"><option :value="0">Выкл.</option><option :value="10">10 сек.</option><option :value="30">30 сек.</option><option :value="60">60 сек.</option></select></label>
      <div class="grid grid-cols-2 gap-2"><button type="button" class="btn btn-primary" :disabled="isRecording" @click.prevent.stop="begin">Запись</button><button type="button" class="btn" :disabled="!isRecording" @click.prevent.stop="stop">Сохранить WebM</button></div>
      <small class="rec-note">Запись начинается только после нажатия. Автостоп опционален.</small>
    </div>
  </details>
</template>
