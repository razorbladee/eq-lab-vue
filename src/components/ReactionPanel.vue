<script setup>
import PanelFrame from './PanelFrame.vue';
defineProps({
  state: Object,
  algorithms: Array,
  hint: String,
  music: Object,
  schema: Object,
  keys: Array,
  applyMusic: Function,
});
</script>
<template>
  <PanelFrame title="Реакция на звук" :open="false"
    ><label class="block"
      ><span class="plabel">Алгоритм</span
      ><select v-model="state.algo">
        <option v-for="item in algorithms" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select></label
    >
    <p class="text-[11.5px]" style="color: var(--ink-3)">{{ hint }}</p>
    <label class="block"
      ><span class="plabel">Жанровый пресет</span
      ><select v-model="state.music" @change="applyMusic">
        <option value="custom">Custom</option>
        <option v-for="(item, id) in music" :key="id" :value="id">{{ id }}</option>
      </select></label
    >
    <div v-for="key in keys" :key="key">
      <span class="plabel"
        >{{ schema[key].label }}<span class="pval">{{ state[key] }}</span></span
      ><input
        v-model.number="state[key]"
        type="range"
        :min="schema[key].min"
        :max="schema[key].max"
        :step="schema[key].step"
      /></div
  ></PanelFrame>
</template>
