import { computed, onUnmounted, shallowRef, watch, type Ref } from "vue";
import type { FlowPlayerStore, PlayerState } from "@/engine/player";

/**
 * Subscribe a Vue component to a slice of a `FlowPlayerStore`, updating only
 * when the selected value changes according to `Object.is`.
 */
export function usePlayerSelector<T>(
  storeRef: FlowPlayerStore | Ref<FlowPlayerStore>,
  selector: (state: PlayerState) => T,
): Ref<T> {
  const getStore = () =>
    "subscribe" in storeRef ? storeRef : storeRef.value;

  const value = shallowRef<T>(selector(getStore().getState()));
  let unsubscribe: (() => void) | null = null;

  const attach = (store: FlowPlayerStore) => {
    unsubscribe?.();
    value.value = selector(store.getState());
    unsubscribe = store.subscribe(() => {
      const next = selector(store.getState());
      if (!Object.is(next, value.value)) {
        value.value = next;
      }
    });
  };

  if ("subscribe" in storeRef) {
    attach(storeRef);
  } else {
    watch(
      storeRef,
      (nextStore) => {
        attach(nextStore);
      },
      { immediate: true },
    );
  }

  onUnmounted(() => {
    unsubscribe?.();
  });

  return computed(() => value.value);
}
