<script setup>
defineProps({ frameStyle: Object, dragging: Boolean, canvas: Object, frame: Object, meters: Array, bands: Array, bpm: [String, Number], error: Object, onDrop: Function });
defineEmits(['dragover','dragleave','drop']);
</script>
<template><main class="stage"><div class="frame" :style="frameStyle" @dragover.prevent="$emit('dragover')" @dragleave="$emit('dragleave')" @drop.prevent="$emit('drop',$event)"><canvas ref="canvas"></canvas><div v-if="dragging" class="drop">Отпустите трек</div></div><div class="stage-foot flex items-center gap-4"><div class="flex-1 grid grid-cols-5 gap-2"><div v-for="(band,i) in bands" :key="band.k"><div class="meter"><i :ref="el=>meters[i]=el" /></div><span class="mono text-[9px]">{{band.short}}</span></div></div><span class="mono text-[10px]">BEAT · {{bpm}} BPM</span></div><p v-if="error" class="mono text-[11px]" style="color:var(--accent)">Визуализатор «{{error.id}}» упал: {{error.msg}}</p></main></template>
