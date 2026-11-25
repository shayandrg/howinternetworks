import type { ActorKind } from "@/engine/types";

export interface SvgShapeSpec {
  tag: "rect" | "circle" | "ellipse" | "line" | "path" | "polygon";
  attrs: Record<string, string | number>;
}

export interface ActorSpec {
  width: number;
  height: number;
  shapes: SvgShapeSpec[];
}

const strokeSecondary = "var(--color-secondary)";
const fillCard = "var(--color-card)";
const fillRaised = "var(--color-raised)";
const toneHandshake = "var(--color-tone-handshake)";
const toneSecure = "var(--color-tone-secure)";
const toneData = "var(--color-tone-data)";
const toneLookup = "var(--color-tone-lookup)";
const toneRequest = "var(--color-tone-request)";

export const actorSpecs: Record<ActorKind, ActorSpec> = {
  laptop: {
    width: 72,
    height: 52,
    shapes: [
      { tag: "rect", attrs: { x: -28, y: -22, width: 56, height: 36, rx: 4, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -22, y: -17, width: 44, height: 26, rx: 2, fill: fillRaised, stroke: strokeSecondary, "stroke-width": 1.2 } },
      { tag: "path", attrs: { d: "M-34 16 H34 L30 23 H-30 Z", fill: fillRaised, stroke: strokeSecondary, "stroke-width": 1.75, "stroke-linejoin": "round" } },
      { tag: "circle", attrs: { cx: 0, cy: -4, r: 2.2, fill: toneData } },
    ],
  },
  phone: {
    width: 40,
    height: 60,
    shapes: [
      { tag: "rect", attrs: { x: -16, y: -28, width: 32, height: 56, rx: 5, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -12, y: -21, width: 24, height: 40, rx: 2, fill: fillRaised, stroke: strokeSecondary, "stroke-width": 1.2 } },
      { tag: "line", attrs: { x1: -5, y1: -24.5, x2: 5, y2: -24.5, stroke: strokeSecondary, "stroke-width": 1.5, "stroke-linecap": "round" } },
      { tag: "circle", attrs: { cx: 0, cy: 23, r: 2, fill: toneData } },
    ],
  },
  desktop: {
    width: 68,
    height: 54,
    shapes: [
      { tag: "rect", attrs: { x: -30, y: -25, width: 60, height: 38, rx: 4, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -24, y: -20, width: 48, height: 28, rx: 2, fill: fillRaised, stroke: strokeSecondary, "stroke-width": 1.2 } },
      { tag: "rect", attrs: { x: -6, y: 13, width: 12, height: 8, fill: fillRaised, stroke: strokeSecondary, "stroke-width": 1.5 } },
      { tag: "line", attrs: { x1: -18, y1: 22, x2: 18, y2: 22, stroke: strokeSecondary, "stroke-width": 2, "stroke-linecap": "round" } },
      { tag: "circle", attrs: { cx: 21, cy: 10, r: 1.8, fill: toneData } },
    ],
  },
  router: {
    width: 70,
    height: 52,
    shapes: [
      { tag: "line", attrs: { x1: -18, y1: -10, x2: -18, y2: -26, stroke: strokeSecondary, "stroke-width": 2, "stroke-linecap": "round" } },
      { tag: "line", attrs: { x1: 18, y1: -10, x2: 18, y2: -26, stroke: strokeSecondary, "stroke-width": 2, "stroke-linecap": "round" } },
      { tag: "circle", attrs: { cx: -18, cy: -27, r: 2, fill: strokeSecondary } },
      { tag: "circle", attrs: { cx: 18, cy: -27, r: 2, fill: strokeSecondary } },
      { tag: "rect", attrs: { x: -32, y: -10, width: 64, height: 28, rx: 5, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -26, y: -2, width: 52, height: 12, rx: 2, fill: fillRaised } },
      { tag: "circle", attrs: { cx: -18, cy: 4, r: 2.2, fill: toneHandshake } },
      { tag: "circle", attrs: { cx: -10, cy: 4, r: 2.2, fill: toneHandshake } },
      { tag: "circle", attrs: { cx: -2, cy: 4, r: 2.2, fill: toneHandshake } },
      { tag: "rect", attrs: { x: 8, y: 1, width: 6, height: 6, rx: 1, fill: "none", stroke: strokeSecondary, "stroke-width": 1.2 } },
      { tag: "rect", attrs: { x: 17, y: 1, width: 6, height: 6, rx: 1, fill: "none", stroke: strokeSecondary, "stroke-width": 1.2 } },
    ],
  },
  switch: {
    width: 74,
    height: 34,
    shapes: [
      { tag: "rect", attrs: { x: -34, y: -14, width: 68, height: 28, rx: 4, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -28, y: -7, width: 56, height: 14, rx: 2, fill: fillRaised } },
      ...[-22, -13, -4, 5, 14].map((x): SvgShapeSpec => ({
        tag: "rect",
        attrs: { x, y: -3, width: 6, height: 6, rx: 1, fill: "none", stroke: strokeSecondary, "stroke-width": 1.2 },
      })),
      { tag: "circle", attrs: { cx: 23, cy: 0, r: 2, fill: toneHandshake } },
    ],
  },
  "access-point": {
    width: 58,
    height: 48,
    shapes: [
      { tag: "path", attrs: { d: "M-16 -14 A 22 22 0 0 1 16 -14", fill: "none", stroke: strokeSecondary, "stroke-width": 1.75, "stroke-linecap": "round" } },
      { tag: "path", attrs: { d: "M-24 -20 A 32 32 0 0 1 24 -20", fill: "none", stroke: strokeSecondary, "stroke-width": 1.5, "stroke-linecap": "round" } },
      { tag: "rect", attrs: { x: -26, y: -4, width: 52, height: 22, rx: 11, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -16, y: 2, width: 32, height: 10, rx: 5, fill: fillRaised } },
      { tag: "circle", attrs: { cx: 0, cy: 7, r: 2.5, fill: toneData } },
    ],
  },
  modem: {
    width: 58,
    height: 42,
    shapes: [
      { tag: "rect", attrs: { x: -26, y: -18, width: 52, height: 34, rx: 4, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -20, y: -11, width: 40, height: 20, rx: 2, fill: fillRaised } },
      { tag: "line", attrs: { x1: -14, y1: -4, x2: -4, y2: -4, stroke: strokeSecondary, "stroke-width": 1.5 } },
      { tag: "line", attrs: { x1: -14, y1: 2, x2: -4, y2: 2, stroke: strokeSecondary, "stroke-width": 1.5 } },
      { tag: "circle", attrs: { cx: 8, cy: -4, r: 2, fill: toneHandshake } },
      { tag: "circle", attrs: { cx: 14, cy: -4, r: 2, fill: toneHandshake } },
      { tag: "circle", attrs: { cx: 8, cy: 3, r: 2, fill: strokeSecondary } },
    ],
  },
  server: {
    width: 54,
    height: 58,
    shapes: [
      { tag: "rect", attrs: { x: -24, y: -26, width: 48, height: 52, rx: 4, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      ...[-18, -2, 14].flatMap((y): SvgShapeSpec[] => [
        { tag: "rect", attrs: { x: -19, y, width: 38, height: 11, rx: 2, fill: fillRaised, stroke: strokeSecondary, "stroke-width": 1.2 } },
        { tag: "line", attrs: { x1: -14, y1: y + 5.5, x2: 4, y2: y + 5.5, stroke: strokeSecondary, "stroke-width": 1.4 } },
        { tag: "circle", attrs: { cx: 13, cy: y + 5.5, r: 1.8, fill: toneData } },
      ]),
    ],
  },
  "dns-server": {
    width: 54,
    height: 58,
    shapes: [
      { tag: "rect", attrs: { x: -24, y: -26, width: 48, height: 52, rx: 4, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -19, y: -20, width: 38, height: 24, rx: 2, fill: fillRaised } },
      { tag: "circle", attrs: { cx: -6, cy: -9, r: 6, fill: "none", stroke: toneLookup, "stroke-width": 1.6 } },
      { tag: "line", attrs: { x1: -1.5, y1: -4.5, x2: 4, y2: 1, stroke: toneLookup, "stroke-width": 1.6, "stroke-linecap": "round" } },
      { tag: "line", attrs: { x1: -14, y1: 12, x2: 14, y2: 12, stroke: strokeSecondary, "stroke-width": 1.4 } },
      { tag: "line", attrs: { x1: -14, y1: 18, x2: 6, y2: 18, stroke: strokeSecondary, "stroke-width": 1.4 } },
    ],
  },
  "web-server": {
    width: 58,
    height: 58,
    shapes: [
      { tag: "rect", attrs: { x: -26, y: -26, width: 52, height: 52, rx: 4, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -20, y: -20, width: 40, height: 30, rx: 2, fill: fillRaised } },
      { tag: "circle", attrs: { cx: 0, cy: -5, r: 10, fill: "none", stroke: toneData, "stroke-width": 1.4 } },
      { tag: "ellipse", attrs: { cx: 0, cy: -5, rx: 4.5, ry: 10, fill: "none", stroke: toneData, "stroke-width": 1.2 } },
      { tag: "line", attrs: { x1: -10, y1: -5, x2: 10, y2: -5, stroke: toneData, "stroke-width": 1.2 } },
      { tag: "line", attrs: { x1: -14, y1: 18, x2: 14, y2: 18, stroke: strokeSecondary, "stroke-width": 1.5 } },
    ],
  },
  "mail-server": {
    width: 58,
    height: 54,
    shapes: [
      { tag: "rect", attrs: { x: -26, y: -24, width: 52, height: 48, rx: 4, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -18, y: -14, width: 36, height: 24, rx: 2, fill: fillRaised, stroke: strokeSecondary, "stroke-width": 1.3 } },
      { tag: "path", attrs: { d: "M-18 -14 L0 -1 L18 -14", fill: "none", stroke: toneRequest, "stroke-width": 1.6, "stroke-linejoin": "round" } },
      { tag: "line", attrs: { x1: -12, y1: 17, x2: 12, y2: 17, stroke: strokeSecondary, "stroke-width": 1.4 } },
    ],
  },
  "file-server": {
    width: 54,
    height: 58,
    shapes: [
      { tag: "rect", attrs: { x: -24, y: -26, width: 48, height: 52, rx: 4, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "path", attrs: { d: "M-17 -14 H-3 L0 -10 H17 V14 H-17 Z", fill: fillRaised, stroke: strokeSecondary, "stroke-width": 1.4, "stroke-linejoin": "round" } },
      { tag: "line", attrs: { x1: -10, y1: 0, x2: 10, y2: 0, stroke: toneData, "stroke-width": 1.5 } },
      { tag: "line", attrs: { x1: -10, y1: 6, x2: 5, y2: 6, stroke: strokeSecondary, "stroke-width": 1.4 } },
    ],
  },
  "vpn-server": {
    width: 54,
    height: 58,
    shapes: [
      { tag: "rect", attrs: { x: -24, y: -26, width: 48, height: 52, rx: 4, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -18, y: -20, width: 36, height: 40, rx: 2, fill: fillRaised } },
      { tag: "path", attrs: { d: "M-6 -4 V-9 A 6 6 0 0 1 6 -9 V-4", fill: "none", stroke: toneSecure, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -9, y: -4, width: 18, height: 14, rx: 2, fill: fillCard, stroke: toneSecure, "stroke-width": 1.6 } },
      { tag: "circle", attrs: { cx: 0, cy: 3, r: 2, fill: toneSecure } },
    ],
  },
  proxy: {
    width: 58,
    height: 50,
    shapes: [
      { tag: "rect", attrs: { x: -26, y: -22, width: 52, height: 44, rx: 5, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -20, y: -16, width: 40, height: 32, rx: 2, fill: fillRaised } },
      { tag: "line", attrs: { x1: 0, y1: -13, x2: 0, y2: 13, stroke: strokeSecondary, "stroke-width": 1.5, "stroke-dasharray": "3 3" } },
      { tag: "path", attrs: { d: "M-13 -4 H-4 M-7 -7 L-4 -4 L-7 -1", fill: "none", stroke: toneLookup, "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" } },
      { tag: "path", attrs: { d: "M4 4 H13 M10 1 L13 4 L10 7", fill: "none", stroke: toneLookup, "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" } },
    ],
  },
  "load-balancer": {
    width: 62,
    height: 50,
    shapes: [
      { tag: "rect", attrs: { x: -28, y: -22, width: 56, height: 44, rx: 5, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -22, y: -16, width: 44, height: 32, rx: 2, fill: fillRaised } },
      { tag: "line", attrs: { x1: -16, y1: 0, x2: -2, y2: 0, stroke: toneData, "stroke-width": 1.75 } },
      { tag: "path", attrs: { d: "M-2 0 L14 -9 M-2 0 L14 0 M-2 0 L14 9", fill: "none", stroke: toneData, "stroke-width": 1.5 } },
      { tag: "circle", attrs: { cx: 15, cy: -9, r: 2, fill: toneData } },
      { tag: "circle", attrs: { cx: 15, cy: 0, r: 2, fill: toneData } },
      { tag: "circle", attrs: { cx: 15, cy: 9, r: 2, fill: toneData } },
    ],
  },
  cloud: {
    width: 84,
    height: 46,
    shapes: [
      { tag: "path", attrs: { d: "M-22 14 H22 A 12 12 0 0 0 24 -9 A 16 16 0 0 0 -7 -16 A 14 14 0 0 0 -24 -4 A 10 10 0 0 0 -22 14 Z", fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75, "stroke-linejoin": "round" } },
      { tag: "path", attrs: { d: "M-15 8 H16 A 7 7 0 0 0 17 -5 A 10 10 0 0 0 -4 -9 A 8 8 0 0 0 -15 8 Z", fill: fillRaised } },
    ],
  },
  camera: {
    width: 60,
    height: 44,
    shapes: [
      { tag: "rect", attrs: { x: -26, y: -16, width: 38, height: 26, rx: 4, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "path", attrs: { d: "M12 -8 L26 -14 V8 L12 2 Z", fill: fillRaised, stroke: strokeSecondary, "stroke-width": 1.75, "stroke-linejoin": "round" } },
      { tag: "circle", attrs: { cx: -7, cy: -3, r: 7, fill: fillRaised, stroke: strokeSecondary, "stroke-width": 1.4 } },
      { tag: "circle", attrs: { cx: -7, cy: -3, r: 2.5, fill: toneData } },
      { tag: "line", attrs: { x1: -8, y1: 10, x2: -16, y2: 20, stroke: strokeSecondary, "stroke-width": 1.75, "stroke-linecap": "round" } },
    ],
  },
  "tv-box": {
    width: 66,
    height: 54,
    shapes: [
      { tag: "rect", attrs: { x: -30, y: -24, width: 60, height: 38, rx: 4, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -24, y: -18, width: 48, height: 26, rx: 2, fill: fillRaised } },
      { tag: "polygon", attrs: { points: "-4,-11 -4,1 7,-5", fill: toneData } },
      { tag: "rect", attrs: { x: -20, y: 16, width: 40, height: 8, rx: 2, fill: fillRaised, stroke: strokeSecondary, "stroke-width": 1.5 } },
    ],
  },
  plc: {
    width: 62,
    height: 50,
    shapes: [
      { tag: "rect", attrs: { x: -28, y: -22, width: 56, height: 44, rx: 3, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "rect", attrs: { x: -22, y: -16, width: 44, height: 14, rx: 2, fill: fillRaised, stroke: strokeSecondary, "stroke-width": 1.2 } },
      { tag: "circle", attrs: { cx: -15, cy: -9, r: 2, fill: toneHandshake } },
      { tag: "circle", attrs: { cx: -8, cy: -9, r: 2, fill: toneHandshake } },
      { tag: "line", attrs: { x1: 0, y1: -9, x2: 16, y2: -9, stroke: strokeSecondary, "stroke-width": 1.4 } },
      ...[-18, -9, 0, 9, 18].map((x): SvgShapeSpec => ({
        tag: "rect",
        attrs: { x: x - 2.5, y: 5, width: 5, height: 10, rx: 1, fill: fillRaised, stroke: strokeSecondary, "stroke-width": 1.2 },
      })),
    ],
  },
  person: {
    width: 48,
    height: 52,
    shapes: [
      { tag: "circle", attrs: { cx: 0, cy: -14, r: 11, fill: fillCard, stroke: strokeSecondary, "stroke-width": 1.75 } },
      { tag: "path", attrs: { d: "M-20 22 C-20 6 -12 0 0 0 C12 0 20 6 20 22 Z", fill: fillRaised, stroke: strokeSecondary, "stroke-width": 1.75, "stroke-linejoin": "round" } },
    ],
  },
};
