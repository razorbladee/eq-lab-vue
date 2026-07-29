<script setup>
import { ref } from 'vue';

const props = defineProps({ duration: Number, current: Number, from: Number, to: Number });
const emit = defineEmits(['seek']);

const track = ref(null);
let dragging = false;

const setTime = (e) => {
  if (!track.value || !props.duration) return;
  const rect = track.value.getBoundingClientRect();
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
  emit('seek', (x / rect.width) * props.duration);
};

const onPointerDown = (e) => {
  dragging = true;
  setTime(e);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
};

const onPointerMove = (e) => {
  if (dragging) setTime(e);
};

const onPointerUp = () => {
  dragging = false;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
};
</script>

<template>
  <div class="seekbar-wrap" @pointerdown="onPointerDown" ref="track">
    <div class="seekbar-hitarea"></div>
    <div class="seekbar-layer seekbar-bg"></div>

    <div
      v-if="duration && to > from"
      class="seekbar-layer seekbar-region"
      :style="{
        left: (from / duration) * 100 + '%',
        width: ((to - from) / duration) * 100 + '%',
      }"
    ></div>

    <div
      class="seekbar-layer seekbar-fill"
      :style="{ width: duration ? (current / duration) * 100 + '%' : '0%' }"
    ></div>

    <div
      class="seekbar-knob"
      :style="{ left: duration ? (current / duration) * 100 + '%' : '0%' }"
    ></div>
  </div>
</template>

<style scoped>
.seekbar-wrap {
  position: relative;
  width: calc(100% - 14px);
  margin: 0 7px;
  height: 6px;
  cursor: pointer;
  touch-action: none;
  z-index: 10;
}
.seekbar-hitarea {
  position: absolute;
  top: -10px;
  bottom: -10px;
  left: 0;
  right: 0;
  z-index: 1;
}
.seekbar-layer {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 3px;
  pointer-events: none;
  transition: transform 0.15s;
  transform-origin: center;
}
.seekbar-bg {
  left: 0;
  right: 0;
  background: var(--track);
}
.seekbar-region {
  background: oklch(var(--accent) / 0.25);
}
.seekbar-fill {
  left: 0;
  background: var(--accent);
}
.seekbar-wrap:hover .seekbar-layer {
  transform: scaleY(1.5);
}

.seekbar-knob {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  background: var(--panel);
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  pointer-events: none;
  transition:
    transform 0.15s,
    background-color 0.15s;
  box-shadow:
    0 0 0 2px var(--accent),
    0 2px 4px rgba(0, 0, 0, 0.5);
  z-index: 2;
}
.seekbar-wrap:hover .seekbar-knob {
  transform: translate(-50%, -50%) scale(1);
  background: #fff;
}
</style>
