import type { Tone } from "@/engine/types";

export const TONE_VARS: Record<Tone, string> = {
  lookup: "var(--color-tone-lookup)",
  handshake: "var(--color-tone-handshake)",
  request: "var(--color-tone-request)",
  response: "var(--color-tone-response)",
  secure: "var(--color-tone-secure)",
  control: "var(--color-tone-control)",
  data: "var(--color-tone-data)",
  error: "var(--color-tone-error)",
};

export const TONE_LABELS: Record<Tone, string> = {
  lookup: "Lookup",
  handshake: "Handshake",
  request: "Request",
  response: "Response",
  secure: "Encrypted",
  control: "Control",
  data: "Data",
  error: "Lost or refused",
};

export function measureChipWidth(label: string, locked?: boolean): number {
  return Math.max(48, 16 + 6 + 5 + (locked ? 13 : 0) + label.length * 6.7);
}
