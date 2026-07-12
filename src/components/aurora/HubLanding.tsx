"use client";

import type { ComponentProps } from "react";

import { AuroraShell } from "@/components/aurora/AuroraShell";
import { ChannelsHub } from "@/components/aurora/ChannelsHub";
import type { ChannelsHubProps } from "@/components/aurora/ChannelsHub";

export type HubLandingProps = {
  channels: ChannelsHubProps;
  glance: {
    activeChannels: number;
    activeRuns: number;
    spend30d: string | null;
  };
  actions: {
    pendingCount: number;
    items: { id: number; title: string; detail: string }[];
    onReviewAll: () => void;
    onOpenLegacyConsole: () => void;
  };
  operatorInitials?: string;
  nav: ComponentProps<typeof AuroraShell>["nav"];
};

export function HubLanding({
  channels,
  glance,
  actions,
  operatorInitials,
  nav,
}: HubLandingProps) {
  return (
    <AuroraShell operatorInitials={operatorInitials} nav={nav}>
      <section className="hero-grid" aria-label="System Overview">
        <article className="glass-panel action-center">
          <div className="action-header">
            <div>
              <p className="text-mono dim" style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                // ACTION CENTER
              </p>
              {actions.pendingCount > 0 ? (
                <h2 className="text-display" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
                  <span className="au-pulse-dot" />
                  {actions.pendingCount} Approvals Awaiting
                </h2>
              ) : (
                <h2 className="text-display" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
                  All clear
                </h2>
              )}
              <p className="dim">
                {actions.pendingCount > 0
                  ? "Review generated scripts and approve daily compute budgets to unblock production."
                  : "No scripts or budgets are waiting for review."}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button type="button" className="action-button" onClick={actions.onReviewAll}>
                Review All
              </button>
              <button type="button" className="btn-secondary" onClick={actions.onOpenLegacyConsole}>
                Legacy console
              </button>
            </div>
          </div>

          {actions.pendingCount > 0 ? (
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "2rem" }}>
              {actions.items.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "var(--surface-2)",
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-soft)",
                    fontSize: "0.875rem",
                  }}
                >
                  <strong className="text-title">{item.title}</strong>: {item.detail}
                </div>
              ))}
            </div>
          ) : null}
        </article>

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
