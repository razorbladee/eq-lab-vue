<script setup>
import { computed, unref } from 'vue';

const props = defineProps({ recording: [Boolean, Object], countdown: [Number, Object], error: [String, Object], start: Function, cancel: Function });
const isRecording = computed(() => unref(props.recording) === true);
const message = computed(() => unref(props.error) || '');
</script>
<template>
  <details class="sec recorder-panel" open>
    <summary>Запись WebM</summary>
    <div class="sec-body panel-body">
      <p v-if="isRecording" class="rec-status rec-live">Идёт запись</p>
      <p v-if="message" class="rec-error">{{ message }}</p>
      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="btn btn-primary" :disabled="isRecording" @click.prevent.stop="start()">{{ isRecording ? 'Идёт запись' : 'Запись' }}</button>
        <button type="button" class="btn" :disabled="!isRecording" @click.prevent.stop="cancel">Остановить</button>
      </div>
      <small class="rec-note">Запись начинается только после нажатия. Останови её, чтобы скачать WebM.</small>
    </div>
  </details>
</template>
