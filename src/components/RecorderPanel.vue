<script setup>
defineProps({ recording: Boolean, countdown: Number, error: String, start: Function, cancel: Function });
</script>
<template>
  <details class="sec recorder-panel" open>
    <summary>Запись WebM</summary>
    <div class="sec-body panel-body">
      <p v-if="countdown > 0" class="rec-status">Подготовка: {{ countdown }} сек.</p>
      <p v-else-if="recording" class="rec-status rec-live">Идёт запись</p>
      <p v-if="error" class="rec-error">{{ error }}</p>
      <div class="grid grid-cols-2 gap-2">
        <button class="btn btn-primary" :disabled="countdown > 0" @click="recording ? cancel() : start(3)">{{ recording ? 'Остановить' : countdown > 0 ? 'Подготовка…' : 'Запись' }}</button>
        <button class="btn" :disabled="!recording && countdown <= 0" @click="cancel">Отмена</button>
      </div>
      <small class="rec-note">Нажми «Запись», дождись старта и останови, когда готово.</small>
    </div>
  </details>
</template>
