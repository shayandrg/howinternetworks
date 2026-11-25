export type ActorKind =
  | "laptop"
  | "phone"
  | "desktop"
  | "router"
  | "switch"
  | "access-point"
  | "modem"
  | "server"
  | "dns-server"
  | "web-server"
  | "mail-server"
  | "file-server"
  | "vpn-server"
  | "proxy"
  | "load-balancer"
  | "cloud"
  | "camera"
  | "tv-box"
  | "plc"
  | "person";

export interface Actor {
  id: string;
  kind: ActorKind;
  label: string;
  sublabel?: string;
  at: { x: number; y: number };
}

export type LinkMedium = "ethernet" | "wifi" | "fiber" | "internet" | "tunnel";

export interface Link {
  id: string;
  from: string;
  to: string;
  medium: LinkMedium;
  hidden?: boolean;
}

export type Tone =
  | "lookup"
  | "handshake"
  | "request"
  | "response"
  | "secure"
  | "control"
  | "data"
  | "error";

export interface Field {
  name: string;
  value: string;
  note?: string;
}

export interface Layer {
  name: string;
  fields: Field[];
  encrypted?: boolean;
  summary?: string;
}

export interface Capture {
  time: number;
  src: string;
  dst: string;
  protocol: string;
  info: string;
  bytes: number;
}

export type ScreenSpec =
  | {
      app: "browser";
      url: string;
      secure?: boolean;
      state: "typing" | "loading" | "page";
    }
  | { app: "terminal"; lines: string[] }
  | {
      app: "mail";
      state: "compose" | "sent" | "inbox";
      subject?: string;
    };

export type StageEvent =
  | {
      type: "packet";
      id: string;
      from: string;
      to: string;
      via?: string[];
      tone: Tone;
      label: string;
      lines?: string[];
      locked?: boolean;
      lost?: boolean;
      fast?: boolean;
      layers?: Layer[];
      capture?: Capture;
    }
  | {
      type: "stream";
      id: string;
      from: string;
      to: string;
      via?: string[];
      tone: Tone;
      label: string;
      count: number;
      locked?: boolean;
      lostIndexes?: number[];
      layers?: Layer[];
      captures?: Capture[];
    }
  | { type: "reveal"; actors?: string[]; links?: string[] }
  | { type: "hide"; actors?: string[]; links?: string[] }
  | { type: "focus"; actors: string[] }
  | { type: "highlight"; actors: string[] }
  | {
      type: "note";
      id: string;
      at: string;
      text: string;
      tone?: Tone;
      persist?: boolean;
    }
  | { type: "badge"; at: string; text: string; tone?: Tone }
  | { type: "screen"; at: string; screen: ScreenSpec }
  | { type: "wait"; ms: number }
  | { type: "together"; events: StageEvent[] };

export interface Fact {
  label: string;
  value: string;
}

export interface Step {
  id: string;
  title: string;
  simple: string;
  technical: string;
  facts?: Fact[];
  events: StageEvent[];
}

export interface Frame {
  t: number;
  stepIndex: number;
  stepProgress: number;
  camera: { x: number; y: number; w: number; h: number };
  actors: Array<{
    id: string;
    opacity: number;
    highlight: number;
    pulse: number;
    badge?: { text: string; tone?: Tone };
    screen?: ScreenSpec & { progress: number };
  }>;
  links: Array<{ id: string; opacity: number }>;
  packets: Array<{
    key: string;
    eventId: string;
    tone: Tone;
    label: string;
    locked: boolean;
    x: number;
    y: number;
    opacity: number;
    lost: boolean;
    trail: Array<[number, number]>;
    trailOpacity: number;
  }>;
  markers: Array<{ key: string; x: number; y: number; kind: "lost" }>;
  notes: Array<{
    id: string;
    at: string;
    text: string;
    tone?: Tone;
    opacity: number;
    rise: number;
  }>;
  visibleCaptures: number;
  currentPacketId?: string;
}
