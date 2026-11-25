"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink } from "lucide-react";
import type { Flow } from "@/content/schema";
import type { StageEvent, Step } from "@/engine/types";
import { compileFlow, type CompiledTimeline } from "@/engine/compile";
import { frameAt } from "@/engine/frame";
import { createPlayer, usePlayerSelector } from "@/engine/player";
import { shouldIgnoreKeyEvent } from "@/lib/keyboard";
import { stripMarkup } from "@/lib/rich-text";
import {
  readUrlState,
  writeUrlState,
  type StageViewMode,
  type TextMode,
} from "@/lib/url-state";
import { siteConfig } from "@/site.config";
import { Stage } from "@/stage/Stage";
import { SequenceView } from "@/stage/SequenceView";
import { CaptureTable } from "@/stage/CaptureTable";
import type { InspectedPacket } from "@/stage/Inspector";
import { StepRail } from "./StepRail";
import { StepPanel } from "./StepPanel";
import { Transport } from "./Transport";
import { Legend } from "./Legend";
import { RichText, type PacketChipMeta } from "./RichText";
import { Facts } from "./Facts";
import { TryIt } from "./TryIt";
import { Sources } from "./Sources";
import { ShortcutsDialog } from "./ShortcutsDialog";

function collectStepPackets(
  step: Step | undefined,
): Map<string, PacketChipMeta> {
  const map = new Map<string, PacketChipMeta>();
  if (!step) return map;
  const walk = (events: StageEvent[]) => {
    for (const ev of events) {
      if (ev.type === "packet" || ev.type === "stream") {
        map.set(ev.id, {
          id: ev.id,
          label: ev.label,
          tone: ev.tone,
          locked: ev.locked,
        });
      } else if (ev.type === "together") {
        walk(ev.events);
      }
    }
  };
  walk(step.events);
  return map;
}

function findInspectedPacket(
  timeline: CompiledTimeline,
  activeId: string | undefined,
): InspectedPacket | undefined {
  if (!activeId) return undefined;
  for (const ce of timeline.flatEvents) {
    const ev = ce.event;
    if ((ev.type === "packet" || ev.type === "stream") && ev.id === activeId) {
      const cap = ev.type === "packet" ? ev.capture : ev.captures?.[0];
      return {
        id: ev.id,
        label: ev.label,
        tone: ev.tone,
        locked: ev.locked,
        bytes: cap?.bytes,
        layers: ev.layers,
      };
    }
  }
  return undefined;
}

function findEventStart(
  timeline: CompiledTimeline,
  eventId: string,
): number | undefined {
  const found = timeline.flatEvents.find(
    (ce) =>
      (ce.event.type === "packet" || ce.event.type === "stream") &&
      ce.event.id === eventId,
  );
  return found?.startMs;
}

export interface RelatedTopicLink {
  slug: string;
  title: string;
  tagline: string;
}

interface FlowPlayerProps {
  flow: Flow;
  relatedTopics: RelatedTopicLink[];
}

export function FlowPlayer({ flow, relatedTopics }: FlowPlayerProps) {
  const timeline = useMemo(() => compileFlow(flow), [flow]);
  const player = useMemo(
    () => createPlayer(timeline, { mode: "step" }),
    [timeline],
  );

  const t = usePlayerSelector(player, (s) => s.t);
  const playing = usePlayerSelector(player, (s) => s.playing);
  const speed = usePlayerSelector(player, (s) => s.speed);
  const stepIndex = usePlayerSelector(player, (s) => s.stepIndex);

  const [mode, setMode] = useState<TextMode>("simple");
  const [view, setView] = useState<StageViewMode>("network");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [selectedPacketId, setSelectedPacketId] = useState<string | undefined>();
  const [hoveredPacketId, setHoveredPacketId] = useState<string | undefined>();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const urlInitialized = useRef(false);

  useEffect(() => {
    const initial = readUrlState();
    if (initial.step !== undefined) {
      player.goTo(initial.step - 1);
    }
    if (initial.mode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(initial.mode);
    }
    if (initial.view) {
      setView(initial.view);
    }
    urlInitialized.current = true;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);

    return () => {
      mq.removeEventListener("change", onChange);
      player.destroy();
    };
  }, [player]);

  useEffect(() => {
    if (!urlInitialized.current) return;
    writeUrlState({ step: stepIndex + 1, mode, view });
  }, [stepIndex, mode, view]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (shouldIgnoreKeyEvent(e.target)) return;

      if (e.key === " ") {
        e.preventDefault();
        player.toggle();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedPacketId(undefined);
        player.next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedPacketId(undefined);
        player.prev();
      } else if (e.key === "Home") {
        e.preventDefault();
        setSelectedPacketId(undefined);
        player.goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setSelectedPacketId(undefined);
        player.goTo(flow.steps.length - 1);
      } else if (e.key >= "1" && e.key <= "9") {
        const idx = Number(e.key) - 1;
        if (idx < flow.steps.length) {
          e.preventDefault();
          setSelectedPacketId(undefined);
          player.goTo(idx);
        }
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        setMode((m) => (m === "simple" ? "technical" : "simple"));
      } else if (e.key.toLowerCase() === "v") {
        e.preventDefault();
        setView((v) => (v === "network" ? "sequence" : "network"));
      } else if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [player, flow.steps.length]);

  const frame = frameAt(timeline, t, { reducedMotion });
  const currentStep = flow.steps[stepIndex] ?? flow.steps[0];
  const packetsById = collectStepPackets(currentStep);
  const activePacketId = selectedPacketId ?? frame.currentPacketId;
  const inspectedPacket = findInspectedPacket(timeline, activePacketId);
  const finished = t >= timeline.totalMs - 1;

  const editUrl = siteConfig.editPattern.replace("{slug}", flow.meta.slug);
  const issueTitle = `[${flow.meta.slug}/${currentStep.id}] `;
  const reportUrl = `${siteConfig.newIssueUrl}?template=report-an-error.yml&title=${encodeURIComponent(issueTitle)}`;

  return (
    <div>
      {/* Live announcement for assistive tech */}
      <div aria-live="polite" className="sr-only">
        {`Step ${stepIndex + 1} of ${flow.steps.length}: ${currentStep.title}. ${stripMarkup(currentStep.simple)}`}
      </div>

      {/* Main 3-column player */}
      <div className="flex flex-col items-start gap-4 min-[1100px]:flex-row">
        <StepRail
          steps={flow.steps}
          stepIndex={stepIndex}
          finished={finished}
          onSelectStep={(idx) => {
            setSelectedPacketId(undefined);
            player.goTo(idx);
          }}
        />

        <div className="w-full min-w-0 flex-1">
          <div className="sticky top-0 z-10 bg-[var(--color-page-bg)] pb-2 md:static md:pb-0">
            {/* View switch above stage */}
            <div className="mb-2 flex items-center justify-between gap-2">
              <div
                role="tablist"
                aria-label="Stage view"
                className="inline-flex rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-0.5"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "network"}
                  onClick={() => setView("network")}
                  className={`cursor-pointer rounded-[6px] px-3 py-1 text-[13px] transition-colors duration-150 ${
                    view === "network"
                      ? "bg-[var(--color-raised)] font-medium text-[var(--color-primary)]"
                      : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                  }`}
                >
                  Network
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "sequence"}
                  onClick={() => setView("sequence")}
                  className={`cursor-pointer rounded-[6px] px-3 py-1 text-[13px] transition-colors duration-150 ${
                    view === "sequence"
                      ? "bg-[var(--color-raised)] font-medium text-[var(--color-primary)]"
                      : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                  }`}
                >
                  Sequence
                </button>
              </div>

              <span className="font-mono text-[12px] tabular-nums text-[var(--color-muted)]">
                {(t / 1000).toFixed(1)} s / {(timeline.totalMs / 1000).toFixed(1)} s
              </span>
            </div>

            {view === "network" ? (
              <Stage
                actors={flow.scene.actors}
                links={flow.scene.links}
                frame={frame}
                stepTitle={currentStep.title}
                hoveredPacketId={hoveredPacketId}
                selectedPacketId={activePacketId}
                onSelectPacket={(id) => setSelectedPacketId(id)}
              />
            ) : (
              <SequenceView
                timeline={timeline}
                t={t}
                playing={playing}
                hoveredPacketId={hoveredPacketId}
                selectedPacketId={activePacketId}
                onSelectPacket={(id) => setSelectedPacketId(id)}
              />
            )}
          </div>

          <Transport
            timeline={timeline}
            t={t}
            playing={playing}
            speed={speed}
            stepIndex={stepIndex}
            mode={mode}
            onPrev={() => {
              setSelectedPacketId(undefined);
              player.prev();
            }}
            onTogglePlay={() => player.toggle()}
            onNext={() => {
              setSelectedPacketId(undefined);
              player.next();
            }}
            onReplay={() => {
              setSelectedPacketId(undefined);
              player.replay();
            }}
            onSeek={(nextT) => {
              setSelectedPacketId(undefined);
              player.seek(nextT);
            }}
            onSetSpeed={(s) => player.setSpeed(s)}
            onSetMode={(m) => setMode(m)}
            onOpenShortcuts={() => setShortcutsOpen(true)}
          />

          <Legend flow={flow} />
        </div>

        <StepPanel
          step={currentStep}
          stepIndex={stepIndex}
          totalSteps={flow.steps.length}
          mode={mode}
          packetsById={packetsById}
          hoveredPacketId={hoveredPacketId}
          onHoverPacket={setHoveredPacketId}
          onSelectPacket={(id) => {
            setSelectedPacketId(id);
            const start = findEventStart(timeline, id);
            if (start !== undefined) {
              player.seek(start);
            }
          }}
          inspectedPacket={inspectedPacket}
          onPrev={() => {
            setSelectedPacketId(undefined);
            player.prev();
          }}
          onNext={() => {
            setSelectedPacketId(undefined);
            player.next();
          }}
        />
      </div>

      {/* Full-width capture table */}
      <CaptureTable
        captures={timeline.captures}
        visibleCaptures={frame.visibleCaptures}
        activePacketId={activePacketId}
        onSelectCapture={(cap) => {
          player.seek(cap.startMs);
          setSelectedPacketId(cap.eventId);
        }}
      />

      {/* Outro highlight shown right after last step finishes */}
      {finished && (
        <div className="mt-6 rounded-[12px] border border-[var(--color-positive)]/35 bg-[var(--color-card)] p-4">
          <div className="text-[12px] font-medium text-[var(--color-positive)]">
            Completed
          </div>
          <h3 className="mt-0.5 text-[18px] font-medium text-[var(--color-primary)]">
            {flow.outro.title}
          </h3>
          <p className="mt-1.5 text-[15px] leading-[22px] text-[var(--color-secondary)]">
            {mode === "technical" ? flow.outro.technical : flow.outro.simple}
          </p>
        </div>
      )}

      {/* Lower reference sections */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          {flow.meta.status === "draft" && flow.meta.reviewNotes?.length ? (
            <div className="rounded-[12px] border border-[var(--color-tone-request)]/40 bg-[var(--color-card)] p-4">
              <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--color-primary)]">
                <AlertCircle size={16} strokeWidth={1.5} />
                <span>Draft topic: verification notes</span>
              </div>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-[13px] text-[var(--color-secondary)]">
                {flow.meta.reviewNotes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <section aria-labelledby="intro-heading">
            <h2
              id="intro-heading"
              className="text-[18px] font-medium text-[var(--color-primary)]"
            >
              Overview
            </h2>
            <p className="mt-2 text-[15px] leading-[22px] text-[var(--color-primary)]">
              <RichText text={flow.intro.simple} />
            </p>
            <p className="mt-3 text-[14px] leading-[21px] text-[var(--color-secondary)]">
              <RichText text={flow.intro.technical} />
            </p>
          </section>

          <Facts facts={flow.facts} title="Key facts" />

          <section aria-labelledby="outro-heading">
            <h2
              id="outro-heading"
              className="text-[18px] font-medium text-[var(--color-primary)]"
            >
              {flow.outro.title}
            </h2>
            <p className="mt-2 text-[15px] leading-[22px] text-[var(--color-primary)]">
              {flow.outro.simple}
            </p>
            <p className="mt-2 text-[14px] leading-[21px] text-[var(--color-secondary)]">
              {flow.outro.technical}
            </p>
            <div className="mt-3">
              <Facts facts={flow.outro.facts} />
            </div>
          </section>

          <TryIt items={flow.tryIt} />
        </div>

        <aside className="space-y-8">
          <Sources sources={flow.meta.sources} />

          {relatedTopics.length > 0 && (
            <section aria-labelledby="related-heading">
              <h2
                id="related-heading"
                className="text-[18px] font-medium text-[var(--color-primary)]"
              >
                Related topics
              </h2>
              <ul className="mt-2.5 space-y-2">
                {relatedTopics.map((rel) => (
                  <li key={rel.slug}>
                    <Link
                      href={`/learn/${rel.slug}/`}
                      className="block rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-3 py-2.5 transition-colors duration-150 hover:bg-[var(--color-raised)]"
                    >
                      <div className="text-[14px] font-medium text-[var(--color-primary)]">
                        {rel.title}
                      </div>
                      <div className="text-[12px] text-[var(--color-secondary)]">
                        {rel.tagline}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-4 text-[13px] text-[var(--color-secondary)]">
            <div>
              Last verified:{" "}
              <span className="font-mono">{flow.meta.lastVerified}</span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <a
                href={editUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[var(--color-accent)] hover:underline"
              >
                <span>Edit this topic on GitHub</span>
                <ExternalLink size={14} strokeWidth={1.5} />
              </a>
              <a
                href={reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[var(--color-accent)] hover:underline"
              >
                <span>Report an error in this step</span>
                <ExternalLink size={14} strokeWidth={1.5} />
              </a>
            </div>
          </section>
        </aside>
      </div>

      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}
