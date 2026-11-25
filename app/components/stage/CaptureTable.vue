<script setup lang="ts">
import { computed, ref } from "vue";
import type { CompiledCapture } from "@/engine/compile";

const props = defineProps<{
  captures: CompiledCapture[];
  visibleCaptures: number;
  activePacketId?: string;
}>();

const emit = defineEmits<{
  selectCapture: [capture: CompiledCapture];
}>();

const mobileOpen = ref(false);
const visibleRows = computed(() =>
  props.captures.slice(0, props.visibleCaptures),
);

function onRowKeydown(e: KeyboardEvent, row: CompiledCapture) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    emit("selectCapture", row);
  }
}
</script>

<template>
  <section
    v-if="captures.length > 0"
    aria-label="Packet capture"
    class="mt-4"
  >
    <div class="mb-2 flex items-center justify-between md:hidden">
      <button
        type="button"
        class="min-h-[44px] cursor-pointer rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-4 text-sm font-medium text-[var(--color-primary)]"
        @click="mobileOpen = !mobileOpen"
      >
        {{
          mobileOpen
            ? "Hide captured packets"
            : `Show captured packets (${visibleRows.length})`
        }}
      </button>
    </div>

    <div
      :class="`${mobileOpen ? 'block' : 'hidden'} md:block overflow-hidden rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)]`"
    >
      <div class="max-h-[252px] overflow-auto">
        <table class="w-full border-collapse text-start text-[13px] leading-5">
          <thead class="sticky top-0 z-10 border-b border-[var(--color-hairline)] bg-[var(--color-raised)] text-[var(--color-secondary)]">
            <tr>
              <th class="px-3 py-2 text-start font-medium">No.</th>
              <th class="px-3 py-2 text-start font-medium">Time</th>
              <th class="px-3 py-2 text-start font-medium">Source</th>
              <th class="px-3 py-2 text-start font-medium">Destination</th>
              <th class="px-3 py-2 text-start font-medium">Protocol</th>
              <th class="px-3 py-2 text-start font-medium">Info</th>
              <th class="px-3 py-2 text-end font-medium">Size</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-hairline)]">
            <tr v-if="visibleRows.length === 0">
              <td
                colspan="7"
                class="px-3 py-4 text-center text-[var(--color-muted)]"
              >
                Play the first step to capture packets.
              </td>
            </tr>
            <tr
              v-for="row in visibleRows"
              v-else
              :key="row.packetKey"
              tabindex="0"
              :class="`cursor-pointer transition-colors duration-150 ${
                activePacketId === row.eventId
                  ? 'bg-[var(--color-raised)]'
                  : 'hover:bg-[var(--color-raised)]/60'
              }`"
              @click="emit('selectCapture', row)"
              @keydown="onRowKeydown($event, row)"
            >
              <td class="px-3 py-2 font-mono tabular-nums text-[var(--color-muted)]">
                {{ row.index + 1 }}
              </td>
              <td class="px-3 py-2 font-mono tabular-nums text-[var(--color-secondary)]">
                {{ row.capture.time.toFixed(3) }} s
              </td>
              <td class="px-3 py-2 font-mono text-[var(--color-primary)]">
                {{ row.capture.src }}
              </td>
              <td class="px-3 py-2 font-mono text-[var(--color-primary)]">
                {{ row.capture.dst }}
              </td>
              <td class="px-3 py-2 font-mono font-medium text-[var(--color-primary)]">
                {{ row.capture.protocol }}
              </td>
              <td class="px-3 py-2 text-[var(--color-secondary)]">
                {{ row.capture.info }}
              </td>
              <td class="px-3 py-2 text-end font-mono tabular-nums text-[var(--color-secondary)]">
                {{ row.capture.bytes }} B
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
