<script setup>
defineProps({ recording: Boolean, countdown: Number, error: String, start: Function, cancel: Function });
</script>
<template>
  <details class="sec recorder-panel" open>
    <summary>Запись WebM</summary>
    <div class="sec-body panel-body">
      <p v-if="recording" class="rec-status rec-live">Идёт запись</p>
      <p v-if="error" class="rec-error">{{ error }}</p>
      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="btn btn-primary" :disabled="recording" @click.stop="start()">{{ recording ? 'Идёт запись' : 'Запись' }}</button>
        <button type="button" class="btn" :disabled="!recording" @click.stop="cancel">Остановить</button>
      </div>
      <small class="rec-note">Запись начинается сразу по нажатию. Останови её, чтобы скачать WebM.</small>
    </div>
  </details>
</template>
