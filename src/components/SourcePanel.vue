<script setup>
import PanelFrame from './PanelFrame.vue';
defineProps({
  playing: Boolean,
  microphone: Boolean,
  hasFile: Boolean,
  demo: Boolean,
  loadFile: Function,
  toggleMicrophone: Function,
});
defineEmits(['update:demo']);
</script>
<template>
  <PanelFrame title="Источник"
    ><div class="grid grid-cols-1 gap-2">
      <label class="btn"
        >Файл<input
          type="file"
          accept="audio/*"
          class="hidden"
          @change="
            loadFile($event.target.files[0]);
            $event.target.value = '';
          "
      /></label>
    </div>
    <label class="flex items-center justify-between gap-3 text-[12.5px]"
      >Демо-сигнал без звука<span
        class="sw"
        :data-on="demo"
        role="switch"
        @click="$emit('update:demo', !demo)"
        ><i /></span></label
  ></PanelFrame>
</template>
