import { useEffect, useMemo, useState } from "react";
import {
  calculateSpendEfficiency,
  DEFAULT_REPEAT_LINEAGE_THRESHOLD,
  isAbChannel,
  type SpendEfficiencyJob,
  type SpendEfficiencyWindow,
} from "@/lib/spendEfficiency";
import { formatUsd } from "./shared";

const ALL_CHANNELS = "__all_channels__";
const UNASSIGNED_CHANNEL = "__unassigned_channel__";

function formatRatio(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

function formatShare(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export function SpendEfficiencyReadout({
  jobs,
  loading,
  error,
}: {
  jobs: readonly SpendEfficiencyJob[];
  loading: boolean;
  error: string | null;
}) {
  const [includeAbChannels, setIncludeAbChannels] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(ALL_CHANNELS);
  const [window, setWindow] = useState<SpendEfficiencyWindow>("all");
  const [repeatThreshold, setRepeatThreshold] = useState(
    DEFAULT_REPEAT_LINEAGE_THRESHOLD,
  );

  const channels = useMemo(
    () =>
      [...new Set(jobs.map((job) => job.channel))]
        .filter(
          (channel) =>
            includeAbChannels || channel === null || !isAbChannel(channel),
        )
        .sort((left, right) => (left ?? "").localeCompare(right ?? "")),
    [includeAbChannels, jobs],
  );

  useEffect(() => {
    if (
      !includeAbChannels &&
      selectedChannel !== ALL_CHANNELS &&
      selectedChannel !== UNASSIGNED_CHANNEL &&
      isAbChannel(selectedChannel)
    ) {
      setSelectedChannel(ALL_CHANNELS);
    }
  }, [includeAbChannels, selectedChannel]);

  const channelFilter =
    selectedChannel === ALL_CHANNELS
      ? undefined
      : selectedChannel === UNASSIGNED_CHANNEL
        ? null
        : selectedChannel;
  const stats = useMemo(
    () =>
      calculateSpendEfficiency(jobs, {
        includeAbChannels,
        channel: channelFilter,
        window,
        repeatThreshold,
      }),
    [channelFilter, includeAbChannels, jobs, repeatThreshold, window],
  );

  return (
    <section className="spend-efficiency" aria-labelledby="spend-efficiency-title">
      <div className="spend-efficiency__head">
        <div>
          <span className="metric-eyebrow">Repeat-spend readout</span>
          <h3 id="spend-efficiency-title">Spend efficiency</h3>
          <p>
            One run can stay within its cap while the same topic is purchased repeatedly.
          </p>
        </div>
        <span className="metric-badge">Read-only</span>
      </div>

      <div className="spend-efficiency__controls" aria-label="Spend efficiency filters">
        <label>
          <span>Channel</span>
          <select
            value={selectedChannel}
            onChange={(event) => setSelectedChannel(event.target.value)}
          >
            <option value={ALL_CHANNELS}>All channels</option>
            {channels.map((channel) => (
              <option
                key={channel ?? UNASSIGNED_CHANNEL}
                value={channel ?? UNASSIGNED_CHANNEL}
              >
                {channel ?? "Unassigned"}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Window</span>
          <select
            value={window}
            onChange={(event) => setWindow(event.target.value as SpendEfficiencyWindow)}
          >
            <option value="all">All time</option>
            <option value="7d">Last 7 days</option>
          </select>
        </label>

        <label>
          <span>Repeat line</span>
          <span className="spend-efficiency__threshold">
            More than
            <input
              aria-label="Repeat-lineage run threshold"
              type="number"
              min="1"
              step="1"
              value={repeatThreshold}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                if (Number.isFinite(next) && next >= 1) setRepeatThreshold(next);
              }}
            />
            runs
          </span>
        </label>

        <label className="spend-efficiency__toggle">
          <input
            type="checkbox"
            checked={includeAbChannels}
            onChange={(event) => setIncludeAbChannels(event.target.checked)}
          />
          Include deliberate ab_* experiments
        </label>
      </div>

      <p className="spend-efficiency__definition" role="note">
        <strong>Delivered terminal state:</strong> <code>status = done</code>. Every other
        current status is counted as not delivered. The headline ratios do not divide by
        delivered jobs. Null spend is omitted from spend sums while its run and topic still
        count.
      </p>

      {loading ? (
        <div className="spend-efficiency__state" role="status">
          Loading job spend…
        </div>
      ) : error ? (
        <div className="spend-efficiency__state" role="alert">
          Job spend is unavailable: {error}
        </div>
      ) : stats.runCount === 0 ? (
        <div className="spend-efficiency__state">
          No jobs match this channel and window.
        </div>
      ) : (
        <>
          <div className="spend-efficiency__metrics">
            <article className="spend-efficiency__metric is-headline">
              <span>Spend per topic</span>
              <strong>{stats.spendPerTopic === null ? "—" : formatUsd(stats.spendPerTopic)}</strong>
              <small>Total recorded spend ÷ distinct topics</small>
            </article>
            <article className="spend-efficiency__metric is-headline">
              <span>Runs per topic</span>
              <strong>{formatRatio(stats.runsPerTopic)}</strong>
              <small>All runs ÷ distinct topics</small>
            </article>
            <article className="spend-efficiency__metric">
              <span>Spend that never delivered</span>
              <strong>{formatShare(stats.undeliveredSpendShare)}</strong>
              <small>
                {formatUsd(stats.undeliveredSpend)} of {formatUsd(stats.totalSpend)} recorded
                spend
              </small>
            </article>
          </div>

          <p className="spend-efficiency__scope">
            {stats.runCount} {stats.runCount === 1 ? "run" : "runs"} · {stats.topicCount}{" "}
            {stats.topicCount === 1 ? "topic" : "topics"}
            {!includeAbChannels ? " · ab_* experiments excluded" : " · ab_* experiments included"}
          </p>

          <div className="repeat-lineages">
            <div className="repeat-lineages__head">
              <h4>Repeat lineages</h4>
              <span>
                More than {repeatThreshold} {repeatThreshold === 1 ? "run" : "runs"}
              </span>
            </div>
            {stats.repeatLineages.length === 0 ? (
              <p className="repeat-lineages__empty">
                No topics cross this repeat threshold in the selected scope.
              </p>
            ) : (
              <div className="repeat-lineages__list" role="list">
                {stats.repeatLineages.map((lineage) => (
                  <article className="repeat-lineage" role="listitem" key={lineage.topic}>
                    <h5>{lineage.topic}</h5>
                    <dl>
                      <div>
                        <dt>Runs</dt>
                        <dd>{lineage.runCount}</dd>
                      </div>
                      <div>
                        <dt>Total spend</dt>
                        <dd>{formatUsd(lineage.totalSpend)}</dd>
                      </div>
                      <div>
                        <dt>Distinct episodes</dt>
                        <dd>{lineage.distinctEpisodeCount}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
