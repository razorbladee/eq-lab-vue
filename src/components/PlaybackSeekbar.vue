<script setup>
import { ref } from 'vue';

const props = defineProps({ duration: Number, current: Number });
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
  <div class="seekbar-wrap" @pointerdown="onPointerDown">
    <div class="seekbar-hitarea"></div>
    <div class="seekbar-track" ref="track">
      <div
        class="seekbar-fill"
        :style="{ width: duration ? (current / duration) * 100 + '%' : '0%' }"
      ></div>
      <div
        class="seekbar-knob"
        :style="{ left: duration ? (current / duration) * 100 + '%' : '0%' }"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.seekbar-wrap {
  position: relative;
  width: 100%;
  height: 6px;
  cursor: pointer;
  touch-action: none;
  z-index: 10;
  background: var(--track);
}
.seekbar-hitarea {
  position: absolute;
  top: -10px;
  bottom: -10px;
  left: 0;
  right: 0;
}
.seekbar-track {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  transition: transform 0.15s;
  transform-origin: bottom;
}
.seekbar-wrap:hover .seekbar-track {
  transform: scaleY(1.3);
}
.seekbar-fill {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  background: var(--accent);
  pointer-events: none;
}
.seekbar-knob {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: var(--accent);
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  pointer-events: none;
  transition: transform 0.15s;
  box-shadow:
    0 0 0 2px var(--panel),
    0 2px 4px rgba(0, 0, 0, 0.5);
}
.seekbar-wrap:hover .seekbar-knob {
  transform: translate(-50%, -50%) scale(1);
}
</style>
