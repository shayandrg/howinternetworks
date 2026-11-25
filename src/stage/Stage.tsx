"use client";

import type { Actor, Frame, Link } from "@/engine/types";
import { actorRegistry } from "./actors";
import { LinksLayer } from "./layers/Links";
import { PacketsLayer } from "./layers/Packets";
import { MarkersLayer } from "./layers/Markers";
import { NotesLayer } from "./layers/Notes";
import { BadgesLayer } from "./layers/Badges";
import { ScreensLayer } from "./layers/Screens";

interface StageProps {
  actors: Actor[];
  links: Link[];
  frame: Frame;
  stepTitle: string;
  hoveredPacketId?: string;
  selectedPacketId?: string;
  onSelectPacket?: (eventId: string) => void;
}

export function Stage({
  actors,
  links,
  frame,
  stepTitle,
  hoveredPacketId,
  selectedPacketId,
  onSelectPacket,
}: StageProps) {
  const actorMap = new Map(actors.map((a) => [a.id, a]));
  const frameActorMap = new Map(frame.actors.map((fa) => [fa.id, fa]));
  const viewBox = `${frame.camera.x} ${frame.camera.y} ${frame.camera.w} ${frame.camera.h}`;

  return (
    <div className="w-full overflow-hidden rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-stage)]">
      <svg
        viewBox={viewBox}
        role="img"
        aria-label={stepTitle}
        preserveAspectRatio="xMidYMid meet"
        className="block aspect-[4/3] w-full select-none md:aspect-[5/3]"
      >
        <LinksLayer
          links={links}
          frameLinks={frame.links}
          actorMap={actorMap}
        />

        <g>
          {actors.map((actor) => {
            const fa = frameActorMap.get(actor.id);
            const opacity = fa?.opacity ?? 0;
            if (opacity <= 0) return null;
            const entry = actorRegistry[actor.kind];
            const Icon = entry.Component;
            const pulse = fa?.pulse ?? 0;
            const highlight = fa?.highlight ?? 0;

            return (
              <g
                key={actor.id}
                transform={`translate(${actor.at.x}, ${actor.at.y})`}
                opacity={opacity}
              >
                {highlight > 0 && (
                  <circle
                    cx={0}
                    cy={0}
                    r={40}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    strokeOpacity={highlight * 0.8}
                  />
                )}
                {pulse > 0 && (
                  <circle
                    cx={0}
                    cy={0}
                    r={28 + pulse * 14}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth={1.75}
                    strokeOpacity={0.5 * (1 - pulse)}
                  />
                )}
                <Icon />
                <text
                  x={0}
                  y={42}
                  textAnchor="middle"
                  fontSize={13}
                  fontFamily="var(--font-sans), sans-serif"
                  fontWeight={500}
                  fill="var(--color-primary)"
                >
                  {actor.label}
                </text>
                {actor.sublabel && (
                  <text
                    x={0}
                    y={58}
                    textAnchor="middle"
                    fontSize={12}
                    fontFamily="var(--font-mono), monospace"
                    fill="var(--color-muted)"
                  >
                    {actor.sublabel}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        <ScreensLayer actors={actors} frameActors={frame.actors} />
        <BadgesLayer actors={actors} frameActors={frame.actors} />
        <PacketsLayer
          packets={frame.packets}
          hoveredPacketId={hoveredPacketId}
          selectedPacketId={selectedPacketId}
          onSelectPacket={onSelectPacket}
        />
        <MarkersLayer markers={frame.markers} />
        <NotesLayer notes={frame.notes} actorMap={actorMap} />
      </svg>
    </div>
  );
}
