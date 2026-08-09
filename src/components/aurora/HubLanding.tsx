"use client";

import type { ComponentProps } from "react";

import { AuroraShell } from "@/components/aurora/AuroraShell";
import { ActionCenter } from "@/components/aurora/ActionCenter";
import type { ActionCenterProps } from "@/components/aurora/ActionCenter";
import { ChannelsHub } from "@/components/aurora/ChannelsHub";
import type { ChannelsHubProps } from "@/components/aurora/ChannelsHub";
import { RenderProgress } from "@/components/aurora/RenderProgress";
import { useRenderProgress } from "@/lib/hooks/useRenderProgress";

export type HubLandingProps = {
  channels: ChannelsHubProps;
  glance: {
    activeChannels: number;
    activeRuns: number;
    spend30d: string | null;
    inFlightRuns: { id: string; episodeId: string | null; title: string }[];
  };
  actions: ActionCenterProps;
  operatorInitials?: string;
  signOutSlot: ComponentProps<typeof AuroraShell>["signOutSlot"];
  nav: ComponentProps<typeof AuroraShell>["nav"];
};

export function HubLanding({
  channels,
  glance,
  actions,
  operatorInitials,
  signOutSlot,
  nav,
}: HubLandingProps) {
  const inFlightEpisodeIds = glance.inFlightRuns.flatMap((run) => run.episodeId ? [run.episodeId] : []);
  const latestStageByEpisode = useRenderProgress(inFlightEpisodeIds);

  return (
    <AuroraShell operatorInitials={operatorInitials} signOutSlot={signOutSlot} nav={nav}>
      <section className="hero-grid" aria-label="System Overview">
        <ActionCenter {...actions} headingLevel={2} />

        <article className="glass-panel system-glance">
          <div>
            <p className="text-mono dim" style={{ fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              // SYSTEM GLANCE
            </p>
            <div className="stat-row">
              <span className="dim">Active Channels</span>
              <span className="stat-value text-mono">{glance.activeChannels}</span>
            </div>
            <div className="stat-row" style={{ marginTop: "1rem" }}>
              <span className="dim">Active Runs</span>
              <span className="stat-value text-mono">{glance.activeRuns}</span>
            </div>
            {glance.inFlightRuns.length > 0 ? (
              <div className="system-glance__runs" aria-label="Active run progress">
                {glance.inFlightRuns.map((run) => (
                  <div key={run.id} className="system-glance__run">
                    <p className="system-glance__run-title">{run.title}</p>
                    <RenderProgress
                      latestStage={run.episodeId ? latestStageByEpisode[run.episodeId] : undefined}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: "2rem" }}>
            <p className="metric-label dim">30-Day Spend</p>
            <p className="text-display accent text-mono" style={{ fontSize: "2.5rem" }}>
              {glance.spend30d ?? "--"}
            </p>
          </div>
        </article>
      </section>

      <ChannelsHub {...channels} />
    </AuroraShell>
  );
}
