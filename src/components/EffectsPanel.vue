<script setup>
import { computed, ref } from 'vue';
import { Effects } from '../core/effects';

const selected = ref(Effects.selected || Object.keys(Effects.items)[0]);
const revision = ref(0);
const labels = { snow: 'Snowfall', rain: 'Rain streaks', bokeh: 'Bokeh lights', fireflies: 'Fireflies', dust: 'Floating dust', aurora: 'Aurora veil' };
const effect = computed(() => { revision.value; return Effects.items[selected.value]; });
const touch = () => { Effects.states = Object.create(null); revision.value++; };
const update = (key, value) => { effect.value[key] = value; touch(); };
const file = (slot, event) => {
  const source = event.target.files?.[0];
  if (!source) return;
  Effects.setAsset(slot, source);
  touch();
  event.target.value = '';
};
</script>
<template>
  <Teleport to=".rail">
    <details class="sec" data-effects-panel open>
      <summary>Эффекты и медиа-слои</summary>
      <div class="sec-body effects-panel-body">
        <label class="effect-select-label">Эффект<select v-model="selected"><option v-for="(value, id) in Effects.items" :key="id" :value="id">{{ labels[id] }}</option></select></label>
        <label><input type="checkbox" :checked="effect.enabled" @change="update('enabled', $event.target.checked)"> {{ labels[selected] }}</label>
        <label>Слой<select :value="effect.layer" @change="update('layer', $event.target.value)"><option value="back">За EQ</option><option value="front">Перед EQ</option></select></label>
        <label v-for="key in ['opacity', 'amount', 'speed', 'size']" :key="key">{{ key }} <input type="range" :value="effect[key]" min="0" :max="key === 'opacity' ? 1 : key === 'amount' ? 900 : key === 'speed' ? 3 : 64" step=".01" @input="update(key, +$event.target.value)"></label>
        <label>Цвет <input type="color" :value="effect.color" @input="update('color', $event.target.value)"></label>
        <div class="media-divider">Медиа-слои</div>
        <label v-for="slot in ['background', 'cover']" :key="slot">{{ slot === 'background' ? 'Фон' : 'Обложка' }} <input type="file" accept="image/*,video/*" @change="file(slot, $event)"></label>
      </div>
    </details>
  </Teleport>
</template>
