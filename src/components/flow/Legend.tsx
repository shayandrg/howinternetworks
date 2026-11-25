import type { Flow } from "@/content/schema";
import type { StageEvent, Tone } from "@/engine/types";
import { TONE_LABELS, TONE_VARS } from "@/stage/PacketChip";

function collectUsedTones(events: StageEvent[], out: Set<Tone>): void {
  for (const ev of events) {
    if (ev.type === "packet" || ev.type === "stream") {
      out.add(ev.tone);
    } else if (ev.type === "together") {
      collectUsedTones(ev.events, out);
    }
  }
}

export function Legend({ flow }: { flow: Flow }) {
  const items =
    flow.legend ??
    (() => {
      const used = new Set<Tone>();
      for (const s of flow.steps) {
        collectUsedTones(s.events, used);
      }
      return Array.from(used).map((tone) => ({
        tone,
        label: TONE_LABELS[tone],
      }));
    })();

  if (items.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--color-secondary)]">
      {items.map((item) => (
        <span key={`${item.tone}-${item.label}`} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: TONE_VARS[item.tone] }}
          />
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}
