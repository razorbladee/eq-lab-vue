<script setup>
defineProps({ title: { type: String, default: '' }, open: { type: Boolean, default: true } });
</script>
<template>
  <details class="sec" :open="open">
    <summary>{{ title }}</summary>
    <div class="sec-body panel-body"><slot /></div>
  </details>
</template>
