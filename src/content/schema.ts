import { z } from "zod";
import type { StageEvent } from "@/engine/types";

export const GroupIdSchema = z.enum([
  "joining",
  "routing",
  "delivery",
  "names",
  "web",
  "security",
  "email",
  "files",
  "calls",
  "machines",
]);

export type GroupId = z.infer<typeof GroupIdSchema>;

export const ActorKindSchema = z.enum([
  "laptop",
  "phone",
  "desktop",
  "router",
  "switch",
  "access-point",
  "modem",
  "server",
  "dns-server",
  "web-server",
  "mail-server",
  "file-server",
  "vpn-server",
  "proxy",
  "load-balancer",
  "cloud",
  "camera",
  "tv-box",
  "plc",
  "person",
]);

export const ActorSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    kind: ActorKindSchema,
    label: z.string().min(1),
    sublabel: z.string().optional(),
    at: z
      .object({
        x: z.number(),
        y: z.number(),
      })
      .strict(),
  })
  .strict();

export const LinkMediumSchema = z.enum([
  "ethernet",
  "wifi",
  "fiber",
  "internet",
  "tunnel",
]);

export const LinkSchema = z
  .object({
    id: z.string().min(1),
    from: z.string().min(1),
    to: z.string().min(1),
    medium: LinkMediumSchema,
    hidden: z.boolean().optional(),
  })
  .strict();

export const ToneSchema = z.enum([
  "lookup",
  "handshake",
  "request",
  "response",
  "secure",
  "control",
  "data",
  "error",
]);

export const FieldSchema = z
  .object({
    name: z.string().min(1),
    value: z.string(),
    note: z.string().optional(),
  })
  .strict();

export const LayerSchema = z
  .object({
    name: z.string().min(1),
    fields: z.array(FieldSchema),
    encrypted: z.boolean().optional(),
    summary: z.string().optional(),
  })
  .strict();

export const CaptureSchema = z
  .object({
    time: z.number().nonnegative(),
    src: z.string().min(1),
    dst: z.string().min(1),
    protocol: z.string().min(1),
    info: z.string().min(1),
    bytes: z.number().int().positive(),
  })
  .strict();

export const ScreenSpecSchema = z.union([
  z
    .object({
      app: z.literal("browser"),
      url: z.string(),
      secure: z.boolean().optional(),
      state: z.enum(["typing", "loading", "page"]),
    })
    .strict(),
  z
    .object({
      app: z.literal("terminal"),
      lines: z.array(z.string()),
    })
    .strict(),
  z
    .object({
      app: z.literal("mail"),
      state: z.enum(["compose", "sent", "inbox"]),
      subject: z.string().optional(),
    })
    .strict(),
]);

export const StageEventSchema: z.ZodType<StageEvent> = z.lazy(() =>
  z.union([
    z
      .object({
        type: z.literal("packet"),
        id: z.string().min(1),
        from: z.string().min(1),
        to: z.string().min(1),
        via: z.array(z.string().min(1)).optional(),
        tone: ToneSchema,
        label: z.string().min(1),
        lines: z.array(z.string()).optional(),
        locked: z.boolean().optional(),
        lost: z.boolean().optional(),
        fast: z.boolean().optional(),
        layers: z.array(LayerSchema).optional(),
        capture: CaptureSchema.optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("stream"),
        id: z.string().min(1),
        from: z.string().min(1),
        to: z.string().min(1),
        via: z.array(z.string().min(1)).optional(),
        tone: ToneSchema,
        label: z.string().min(1),
        count: z.number().int().positive(),
        locked: z.boolean().optional(),
        lostIndexes: z.array(z.number().int().nonnegative()).optional(),
        layers: z.array(LayerSchema).optional(),
        captures: z.array(CaptureSchema).optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("reveal"),
        actors: z.array(z.string().min(1)).optional(),
        links: z.array(z.string().min(1)).optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("hide"),
        actors: z.array(z.string().min(1)).optional(),
        links: z.array(z.string().min(1)).optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("focus"),
        actors: z.array(z.string().min(1)).min(1),
      })
      .strict(),
    z
      .object({
        type: z.literal("highlight"),
        actors: z.array(z.string().min(1)).min(1),
      })
      .strict(),
    z
      .object({
        type: z.literal("note"),
        id: z.string().min(1),
        at: z.string().min(1),
        text: z.string().min(1),
        tone: ToneSchema.optional(),
        persist: z.boolean().optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("badge"),
        at: z.string().min(1),
        text: z.string().min(1),
        tone: ToneSchema.optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("screen"),
        at: z.string().min(1),
        screen: ScreenSpecSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("wait"),
        ms: z.number().nonnegative(),
      })
      .strict(),
    z
      .object({
        type: z.literal("together"),
        events: z.array(StageEventSchema).min(1),
      })
      .strict(),
  ]),
);

export const FactSchema = z
  .object({
    label: z.string().min(1),
    value: z.string().min(1),
  })
  .strict();

export const StepSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    simple: z.string().min(1),
    technical: z.string().min(1),
    facts: z.array(FactSchema).optional(),
    events: z.array(StageEventSchema).min(1),
  })
  .strict();

export const TopicMetaSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    kind: z.literal("flow"),
    collection: z.literal("protocols"),
    group: GroupIdSchema,
    title: z.string().min(1),
    fullName: z.string().optional(),
    tagline: z.string().min(1),
    layer: z
      .object({
        tcpip: z.enum(["link", "internet", "transport", "application"]),
        osi: z
          .union([
            z.literal(1),
            z.literal(2),
            z.literal(3),
            z.literal(4),
            z.literal(5),
            z.literal(6),
            z.literal(7),
          ])
          .optional(),
        note: z.string().optional(),
      })
      .strict()
      .optional(),
    prerequisites: z.array(z.string()),
    related: z.array(z.string()),
    tags: z.array(z.string()),
    sources: z
      .array(
        z
          .object({
            label: z.string().min(1),
            url: z.string().url(),
          })
          .strict(),
      )
      .min(1),
    status: z.enum(["draft", "reviewed"]),
    lastVerified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reviewNotes: z.array(z.string()).optional(),
  })
  .strict();

export const TryItSchema = z
  .object({
    title: z.string().min(1),
    explain: z.string().min(1),
    commands: z
      .array(
        z
          .object({
            os: z.enum(["windows", "macos", "linux"]),
            cmd: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const FlowSchema = z
  .object({
    meta: TopicMetaSchema,
    intro: z
      .object({
        simple: z.string().min(1),
        technical: z.string().min(1),
      })
      .strict(),
    facts: z.array(FactSchema),
    scene: z
      .object({
        actors: z.array(ActorSchema).min(1),
        links: z.array(LinkSchema),
        start: z
          .object({
            visible: z.array(z.string()),
            focus: z.array(z.string()),
          })
          .strict(),
      })
      .strict(),
    legend: z
      .array(
        z
          .object({
            tone: ToneSchema,
            label: z.string().min(1),
          })
          .strict(),
      )
      .optional(),
    steps: z.array(StepSchema).min(1),
    outro: z
      .object({
        title: z.string().min(1),
        simple: z.string().min(1),
        technical: z.string().min(1),
        facts: z.array(FactSchema),
      })
      .strict(),
    tryIt: z.array(TryItSchema).optional(),
  })
  .strict();

export const GlossaryTermSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    term: z.string().min(1),
    short: z.string().min(1).max(160),
    long: z.string().max(600).optional(),
    aka: z.array(z.string()).optional(),
  })
  .strict();

export type TopicMeta = z.infer<typeof TopicMetaSchema>;
export type TryIt = z.infer<typeof TryItSchema>;
export type Flow = z.infer<typeof FlowSchema>;
export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;

export function defineFlow(flow: Flow): Flow {
  return flow;
}
