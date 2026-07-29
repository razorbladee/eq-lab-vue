<script setup>
import { onMounted } from 'vue';
import PanelFrame from './PanelFrame.vue';
defineProps({ playing: Boolean, microphone: Boolean, hasFile: Boolean, demo: Boolean, loadFile: Function, toggleMicrophone: Function });
const emit = defineEmits(['update:demo']);
onMounted(() => emit('ready'));
</script>
<template><PanelFrame title="Источник"><div class="grid grid-cols-2 gap-2"><label class="btn">Файл<input type="file" accept="audio/*" class="hidden" @change="loadFile($event.target.files[0]);$event.target.value=''" /></label><button class="btn" :class="{'btn-live': microphone}" @click="toggleMicrophone()">{{ microphone ? 'Стоп мик' : 'Микрофон' }}</button></div><label class="flex items-center justify-between gap-3 text-[12.5px]">Демо-сигнал без звука<span class="sw" :data-on="demo" role="switch" @click="$emit('update:demo',!demo)"><i /></span></label></PanelFrame></template>
