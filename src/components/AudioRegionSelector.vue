<script setup>
import { ref, shallowRef, watch, computed, onMounted, onUnmounted } from 'vue';
import { Audio } from '../core/audio';

const props = defineProps({
  src: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  from: { type: Number, default: 0 },
  to: { type: Number, default: 0 },
});

const emit = defineEmits(['update:from', 'update:to']);

const wrap = ref(null);
const canvas = ref(null);
const peaks = shallowRef([]);
const loading = ref(false);

const isDragging = ref(null); // 'left', 'right', or 'center'
let dragStartX = 0;
let dragStartFrom = 0;
let dragStartTo = 0;

// Render waveform
const extractPeaks = async (buffer, samples) => {
  const channelData = buffer.getChannelData(0);
  const step = Math.ceil(channelData.length / samples);
  const result = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    let max = 0;
    for (let j = 0; j < step; j++) {
      const idx = i * step + j;
      if (idx < channelData.length) {
        const val = Math.abs(channelData[idx]);
        if (val > max) max = val;
      }
    }
    result[i] = max;
  }
  return result;
};

const draw = () => {
  if (!canvas.value || !wrap.value) return;
  const rect = wrap.value.getBoundingClientRect();
  if (rect.width === 0) return;

  canvas.value.width = rect.width;
  canvas.value.height = rect.height;

  const ctx = canvas.value.getContext('2d');
  const w = rect.width;
  const h = rect.height;
  ctx.clearRect(0, 0, w, h);

  if (peaks.value.length === 0) return;

  const style = getComputedStyle(canvas.value);
  ctx.fillStyle = style.getPropertyValue('--accent') || '#3ea8ff';

  const p = peaks.value;
  const step = w / p.length;

  ctx.beginPath();
  for (let i = 0; i < p.length; i++) {
    const val = Math.max(1, p[i] * h * 0.9);
    const x = i * step;
    const y = (h - val) / 2;
    ctx.rect(x, y, Math.max(1, step - 0.5), val);
  }
  ctx.fill();
};

watch(
  () => props.src,
  async (newSrc) => {
    peaks.value = [];
    draw();
    if (!newSrc || !newSrc.startsWith('blob:')) return;

    loading.value = true;
    try {
      const res = await fetch(newSrc);
      const arrayBuffer = await res.arrayBuffer();
      if (!Audio.ac) Audio.ensure(document.createElement('audio'));
      const audioBuffer = await Audio.ac.decodeAudioData(arrayBuffer);
      peaks.value = await extractPeaks(audioBuffer, 180);
      draw();
    } catch (err) {
      console.error('Waveform err:', err);
    } finally {
      loading.value = false;
    }
  },
);

// Interactivity
const getPos = (e) => {
  const rect = wrap.value.getBoundingClientRect();
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
  return x / rect.width; // 0 to 1
};

const onPointerDown = (e, type) => {
  if (!props.duration) return;
  e.preventDefault();
  isDragging.value = type;
  dragStartX = getPos(e);
  dragStartFrom = props.from;
  dragStartTo = props.to;

  if (type === 'track') {
    const t = dragStartX * props.duration;
    const newFrom = Math.max(0, Math.min(props.duration - 1, t - 0.5));
    const newTo = Math.min(props.duration, newFrom + 1);
    emit('update:from', newFrom);
    emit('update:to', newTo);
    isDragging.value = 'right';
    dragStartFrom = newFrom;
    dragStartTo = newTo;
  }

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
};

const onPointerMove = (e) => {
  if (!isDragging.value || !props.duration) return;

  const currentX = getPos(e);
  const deltaT = (currentX - dragStartX) * props.duration;

  let newFrom = dragStartFrom;
  let newTo = dragStartTo;

  if (isDragging.value === 'left') {
    newFrom = Math.max(0, Math.min(dragStartFrom + deltaT, dragStartTo - 0.05));
    emit('update:from', newFrom);
  } else if (isDragging.value === 'right') {
    newTo = Math.max(newFrom + 0.05, Math.min(props.duration, dragStartTo + deltaT));
    emit('update:to', newTo);
  } else if (isDragging.value === 'center') {
    const range = dragStartTo - dragStartFrom;
    newFrom = Math.max(0, Math.min(props.duration - range, dragStartFrom + deltaT));
    newTo = newFrom + range;
    emit('update:from', newFrom);
    emit('update:to', newTo);

};

const onPointerUp = () => {
  isDragging.value = null;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
};

onMounted(() => {
  const ro = new ResizeObserver(() => draw());
  ro.observe(wrap.value);
  onUnmounted(() => ro.disconnect());
});

const leftPct = computed(() => (props.duration ? (props.from / props.duration) * 100 : 0));
const widthPct = computed(() =>
  props.duration ? ((props.to - props.from) / props.duration) * 100 : 100,
);
</script>
<template>
  <div
    class="region-wrap"
    ref="wrap"
    @pointerdown="(e) => e.target === wrap && onPointerDown(e, 'track')"
  >
    <canvas ref="canvas" class="region-canvas"></canvas>

    <div class="region-track" :style="{ left: leftPct + '%', width: widthPct + '%' }">
      <div class="region-center" @pointerdown.stop="(e) => onPointerDown(e, 'center')"></div>
      <div
        class="region-handle region-handle-l"
        @pointerdown.stop="(e) => onPointerDown(e, 'left')"
      ></div>
      <div
        class="region-handle region-handle-r"
        @pointerdown.stop="(e) => onPointerDown(e, 'right')"
      ></div>
    </div>

    <div v-if="loading" class="region-loader">Загрузка...</div>
  </div>
</template>
<style scoped>
.region-wrap {
  position: relative;
  width: 100%;
  height: 48px;
  background: var(--panel-2);
  border-radius: 6px;
  overflow: hidden;
  user-select: none;
  touch-action: none;
  cursor: text;
  border: 1px solid var(--line);
}
.region-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.5;
  pointer-events: none;
}
.region-track {
  position: absolute;
  top: 0;
  bottom: 0;
  box-shadow: inset 0 0 0 1px var(--accent);
}
.region-track::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--accent);
  opacity: 0.15;
  pointer-events: none;
}
.region-center {
  position: absolute;
  inset: 0;
  cursor: grab;
}
.region-center:active {
  cursor: grabbing;
}
.region-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  background: var(--accent);
  cursor: ew-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.1s;
}
.region-handle:hover,
.region-handle:active {
  opacity: 1;
}
.region-handle::after {
  content: '';
  width: 2px;
  height: 12px;
  background: var(--panel);
  border-radius: 1px;
}
.region-handle-l {
  left: 0;
  transform: translateX(-50%);
}
.region-handle-r {
  right: 0;
  transform: translateX(50%);
}
.region-loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  pointer-events: none;
}
</style>
