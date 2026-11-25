<script setup lang="ts">
import type { ActorKind } from "@/engine/types";
import { actorSpecs } from "@/stage/actor-specs";

defineProps<{
  kind: ActorKind;
}>();
</script>

<template>
  <g>
    <component
      :is="shape.tag"
      v-for="(shape, idx) in actorSpecs[kind].shapes"
      :key="idx"
      v-bind="shape.attrs"
    />
  </g>
</template>
