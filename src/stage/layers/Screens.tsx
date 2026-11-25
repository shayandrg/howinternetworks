import type { Actor, Frame } from "@/engine/types";

interface ScreensLayerProps {
  actors: Actor[];
  frameActors: Frame["actors"];
}

export function ScreensLayer({ actors, frameActors }: ScreensLayerProps) {
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  return (
    <g aria-hidden="true">
      {frameActors.map((fa) => {
        if (!fa.screen || fa.opacity <= 0) return null;
        const actor = actorMap.get(fa.id);
        if (!actor) return null;

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

          return (
            <g key={`scr-${fa.id}`} opacity={fa.opacity}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={5}
                fill="var(--color-card)"
                stroke="var(--color-secondary)"
                strokeWidth={1.2}
              />
              <rect
                x={x + 5}
                y={y + 5}
                width={w - 10}
                height={15}
                rx={3}
                fill="var(--color-raised)"
              />
              {screen.secure && (
                <circle
                  cx={x + 12}
                  cy={y + 12.5}
                  r={2.5}
                  fill="var(--color-tone-secure)"
                />
              )}
              <text
                x={x + (screen.secure ? 18 : 9)}
                y={y + 15.5}
                fontSize={9}
                fontFamily="var(--font-mono), monospace"
                fill="var(--color-primary)"
              >
                {shownUrl.slice(0, 18)}
              </text>
              {screen.state === "loading" && (
                <rect
                  x={x + 6}
                  y={y + 26}
                  width={(w - 12) * Math.max(0.15, screen.progress)}
                  height={4}
                  rx={2}
                  fill="var(--color-accent)"
                />
              )}
              {screen.state === "page" && (
                <g>
                  <rect
                    x={x + 6}
                    y={y + 25}
                    width={52}
                    height={5}
                    rx={1.5}
                    fill="var(--color-tone-data)"
                    fillOpacity={0.5}
                  />
                  <rect
                    x={x + 6}
                    y={y + 33}
                    width={96}
                    height={4}
                    rx={1.5}
                    fill="var(--color-secondary)"
                    fillOpacity={0.35}
                  />
                </g>
              )}
            </g>
          );
        }

        if (screen.app === "terminal") {
          const visibleLines = Math.max(
            1,
            Math.ceil(screen.lines.length * screen.progress),
          );
          const shown = screen.lines.slice(0, visibleLines).slice(-2);

          return (
            <g key={`scr-${fa.id}`} opacity={fa.opacity}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={5}
                fill="var(--color-raised)"
                stroke="var(--color-secondary)"
                strokeWidth={1.2}
              />
              {shown.map((line, i) => (
                <text
                  key={i}
                  x={x + 7}
                  y={y + 16 + i * 14}
                  fontSize={9}
                  fontFamily="var(--font-mono), monospace"
                  fill="var(--color-primary)"
                >
                  {line.slice(0, 19)}
                </text>
              ))}
            </g>
          );
        }

        // mail
        const mailText =
          screen.state === "compose"
            ? "Composing mail"
            : screen.state === "sent"
              ? "Mail sent"
              : "Inbox: 1 new";

        return (
          <g key={`scr-${fa.id}`} opacity={fa.opacity}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={5}
              fill="var(--color-card)"
              stroke="var(--color-secondary)"
              strokeWidth={1.2}
            />
            <text
              x={x + 8}
              y={y + 17}
              fontSize={9.5}
              fontFamily="var(--font-sans), sans-serif"
              fontWeight={500}
              fill="var(--color-primary)"
            >
              {mailText}
            </text>
            {screen.subject && (
              <text
                x={x + 8}
                y={y + 31}
                fontSize={8.5}
                fontFamily="var(--font-mono), monospace"
                fill="var(--color-muted)"
              >
                {screen.subject.slice(0, 19)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
