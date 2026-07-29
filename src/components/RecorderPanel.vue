<script setup>
defineProps({ recording: Boolean, countdown: Number, error: String, start: Function, cancel: Function });
</script>
<template>
  <Teleport to=".insp">
    <details class="sec recorder-panel" open>
      <summary>Запись WebM</summary>
      <div class="sec-body panel-body">
        <p v-if="countdown" class="rec-status">Старт через {{ countdown }}…</p>
        <p v-else-if="recording" class="rec-status rec-live">Идёт запись</p>
        <p v-if="error" class="rec-error">{{ error }}</p>
        <div class="grid grid-cols-2 gap-2"><button class="btn btn-primary" :disabled="recording || countdown" @click="start(3)">{{ countdown ? 'Подготовка…' : 'Записать' }}</button><button class="btn" :disabled="!recording && !countdown" @click="cancel">Отмена</button></div>
        <small class="rec-note">Canvas и доступный аудиовыход, WebM.</small>
      </div>
    </details>
  </Teleport>
</template>
