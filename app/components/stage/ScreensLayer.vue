<script setup lang="ts">
import { computed } from "vue";
import type { Actor, Frame } from "@/engine/types";

const props = defineProps<{
  actors: Actor[];
  frameActors: Frame["actors"];
}>();

const visibleScreens = computed(() => {
  const actorMap = new Map(props.actors.map((a) => [a.id, a]));
  const out: Array<{
    id: string;
    opacity: number;
    x: number;
    y: number;
    w: number;
    h: number;
    app: "browser" | "terminal" | "mail";
    shownUrl?: string;
    secure?: boolean;
    browserState?: "typing" | "loading" | "page";
    progress: number;
    terminalLines?: string[];
    mailText?: string;
    mailSubject?: string;
  }> = [];

  for (const fa of props.frameActors) {
    if (!fa.screen || fa.opacity <= 0) continue;
    const actor = actorMap.get(fa.id);
    if (!actor) continue;

    const screen = fa.screen;
    const w = 128;
    const h = 42;
    const x = Math.max(12, Math.min(1000 - w - 12, actor.at.x - w / 2));
    const y = Math.max(12, actor.at.y - 78);

    if (screen.app === "browser") {
      const shownUrl =
        screen.state === "typing"
          ? screen.url.slice(
              0,
              Math.max(1, Math.ceil(screen.url.length * screen.progress)),
            )
          : screen.url;

      out.push({
        id: fa.id,
        opacity: fa.opacity,
        x,
        y,
        w,
        h,
        app: "browser",
        shownUrl: shownUrl.slice(0, 18),
        secure: screen.secure,
        browserState: screen.state,
        progress: screen.progress,
      });
    } else if (screen.app === "terminal") {
      const visibleLines = Math.max(
        1,
        Math.ceil(screen.lines.length * screen.progress),
      );
      out.push({
        id: fa.id,
        opacity: fa.opacity,
        x,
        y,
        w,
        h,
        app: "terminal",
        progress: screen.progress,
        terminalLines: screen.lines
          .slice(0, visibleLines)
          .slice(-2)
          .map((l) => l.slice(0, 19)),
      });
    } else {
      const mailText =
        screen.state === "compose"
          ? "Composing mail"
          : screen.state === "sent"
            ? "Mail sent"
            : "Inbox: 1 new";

      out.push({
        id: fa.id,
        opacity: fa.opacity,
        x,
        y,
        w,
        h,
        app: "mail",
        progress: screen.progress,
        mailText,
        mailSubject: screen.subject?.slice(0, 19),
      });
    }
  }

  return out;
});
</script>

<template>
  <g aria-hidden="true">
    <template v-for="scr in visibleScreens" :key="`scr-${scr.id}`">
      <g v-if="scr.app === 'browser'" :opacity="scr.opacity">
        <rect
          :x="scr.x"
          :y="scr.y"
          :width="scr.w"
          :height="scr.h"
          :rx="5"
          fill="var(--color-card)"
          stroke="var(--color-secondary)"
          :stroke-width="1.2"
        />
        <rect
          :x="scr.x + 5"
          :y="scr.y + 5"
          :width="scr.w - 10"
          :height="15"
          :rx="3"
          fill="var(--color-raised)"
        />
        <circle
          v-if="scr.secure"
          :cx="scr.x + 12"
          :cy="scr.y + 12.5"
          :r="2.5"
          fill="var(--color-tone-secure)"
        />
        <text
          :x="scr.x + (scr.secure ? 18 : 9)"
          :y="scr.y + 15.5"
          :font-size="9"
          font-family="var(--font-mono), monospace"
          fill="var(--color-primary)"
        >
          {{ scr.shownUrl }}
        </text>
        <rect
          v-if="scr.browserState === 'loading'"
          :x="scr.x + 6"
          :y="scr.y + 26"
          :width="(scr.w - 12) * Math.max(0.15, scr.progress)"
          :height="4"
          :rx="2"
          fill="var(--color-accent)"
        />
        <g v-else-if="scr.browserState === 'page'">
          <rect
            :x="scr.x + 6"
            :y="scr.y + 25"
            :width="52"
            :height="5"
            :rx="1.5"
            fill="var(--color-tone-data)"
            :fill-opacity="0.5"
          />
          <rect
            :x="scr.x + 6"
            :y="scr.y + 33"
            :width="96"
            :height="4"
            :rx="1.5"
            fill="var(--color-secondary)"
            :fill-opacity="0.35"
          />
        </g>
      </g>

      <g v-else-if="scr.app === 'terminal'" :opacity="scr.opacity">
        <rect
          :x="scr.x"
          :y="scr.y"
          :width="scr.w"
          :height="scr.h"
          :rx="5"
          fill="var(--color-raised)"
          stroke="var(--color-secondary)"
          :stroke-width="1.2"
        />
        <text
          v-for="(line, i) in scr.terminalLines"
          :key="i"
          :x="scr.x + 7"
          :y="scr.y + 16 + i * 14"
          :font-size="9"
          font-family="var(--font-mono), monospace"
          fill="var(--color-primary)"
        >
          {{ line }}
        </text>
      </g>

      <g v-else :opacity="scr.opacity">
        <rect
          :x="scr.x"
          :y="scr.y"
          :width="scr.w"
          :height="scr.h"
          :rx="5"
          fill="var(--color-card)"
          stroke="var(--color-secondary)"
          :stroke-width="1.2"
        />
        <text
          :x="scr.x + 8"
          :y="scr.y + 17"
          :font-size="9.5"
          font-family="var(--font-sans), sans-serif"
          :font-weight="500"
          fill="var(--color-primary)"
        >
          {{ scr.mailText }}
        </text>
        <text
          v-if="scr.mailSubject"
          :x="scr.x + 8"
          :y="scr.y + 31"
          :font-size="8.5"
          font-family="var(--font-mono), monospace"
          fill="var(--color-muted)"
        >
          {{ scr.mailSubject }}
        </text>
      </g>
    </template>
  </g>
</template>
