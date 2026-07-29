<script setup>
import PanelFrame from './PanelFrame.vue';
defineProps({
  current: Object,
  params: Object,
  state: Object,
  schema: Object,
  frameKeys: Array,
  paramKeys: Array,
  groupShort: Object,
  formats: Array,
  dark: Boolean,
  resetParams: Function,
  randomParams: Function,
  resetFrame: Function,
  setParam: Function,
  fmt: Function,
  snapshot: Function,
  toggleFull: Function,
  toggleTheme: Function,
});
defineEmits(['update:format']);
</script>
<template>
  <aside class="insp">
    <div
      class="px-4 pt-4 pb-3 border-b"
      style="border-color: var(--line); background: var(--panel)"
    >
      <div class="mono text-[10px]" style="color: var(--ink-3)">Параметры</div>
      <h2 class="text-[19px] font-semibold">{{ current.name }}</h2>
      <div class="mono text-[10px]" style="color: var(--ink-3)">
        {{ groupShort[current.group] }} · {{ paramKeys.length }} контролов
      </div>
      <div class="grid grid-cols-2 gap-2 mt-3">
        <button class="btn" @click="resetParams">Сброс</button
        ><button class="btn" @click="randomParams">🎲 Случайно</button>
      </div>
    </div>
    <PanelFrame title="Кадр EQ"
      ><div v-for="key in frameKeys" :key="key">
        <span class="plabel"
          >{{ schema[key].label }}<span class="pval">{{ fmt(state[key]) }}</span></span
        ><input
          v-model.number="state[key]"
          type="range"
          :min="schema[key].min"
          :max="schema[key].max"
          :step="schema[key].step"
        />
      </div>
      <button class="btn" @click="resetFrame">Сбросить кадр EQ</button></PanelFrame
    ><PanelFrame title="Цвет EQ"
      ><label
        ><span class="plabel">Режим</span
        ><select v-model="state.colorMode">
          <option value="duo">Дуо-градиент</option>
          <option value="single">Один цвет</option>
          <option value="spectrum">Спектр</option>
          <option value="split">Сплит</option>
        </select></label
      >
      <div class="grid grid-cols-2 gap-2">
        <label><span class="plabel">A</span><input type="color" v-model="state.c1" /></label
        ><label><span class="plabel">B</span><input type="color" v-model="state.c2" /></label>
      </div>
      <div>
        <span class="plabel"
          >Прокрутка оттенка<span class="pval">{{ fmt(state.cycle) }}</span></span
        ><input v-model.number="state.cycle" type="range" min="0" max="2" step=".02" /></div
    ></PanelFrame>
    <div class="px-4 py-4 flex flex-col gap-3.5">
      <template v-for="key in paramKeys" :key="key"
        ><label
          v-if="current.params[key].type === 'toggle'"
          class="flex items-center justify-between gap-3 text-[12.5px]"
          >{{ current.params[key].label
          }}<span
            class="sw"
            :data-on="!!params[key]"
            role="switch"
            @click="params[key] = !params[key]"
            ><i /></span></label
        ><label v-else-if="current.params[key].type === 'select'"
          ><span class="plabel">{{ current.params[key].label }}</span
          ><select :value="params[key]" @change="setParam(key, $event.target.value)">
            <option v-for="option in current.params[key].options" :key="option" :value="option">
              {{ option }}
            </option>
          </select></label
        >
        <div v-else>
          <span class="plabel"
            >{{ current.params[key].label }}<span class="pval">{{ fmt(params[key]) }}</span></span
          ><input
            v-model.number="params[key]"
            type="range"
            :min="current.params[key].min"
            :max="current.params[key].max"
            :step="current.params[key].step"
          /></div
      ></template>
    </div>
    <slot />
  </aside>
</template>
