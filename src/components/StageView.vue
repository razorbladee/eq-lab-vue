<script setup>
import { onMounted, ref } from 'vue';
const props = defineProps({ frameStyle: Object, dragging: Boolean, meters: Array, bands: Array, bpm: [String, Number], error: Object });
const emit = defineEmits(['dragover','dragleave','drop','ready']);
const canvas = ref(null); const frame = ref(null);
onMounted(() => emit('ready', { canvas, frame }));
</script>
<template><main class="stage"><div ref="frame" class="frame" :style="frameStyle" @dragover.prevent="$emit('dragover')" @dragleave="$emit('dragleave')" @drop.prevent="$emit('drop',$event)"><canvas ref="canvas"></canvas><div v-if="dragging" class="drop">Отпустите трек</div></div><div class="stage-foot flex items-center gap-4"><div class="flex-1 grid grid-cols-5 gap-2"><div v-for="(band,i) in bands" :key="band.k"><div class="meter"><i :ref="el=>meters[i]=el" /></div><span class="mono text-[9px]">{{band.short}}</span></div></div><span class="mono text-[10px]">BEAT · {{bpm}} BPM</span></div><p v-if="error" class="mono text-[11px]" style="color:var(--accent)">Визуализатор «{{error.id}}» упал: {{error.msg}}</p></main></template>
