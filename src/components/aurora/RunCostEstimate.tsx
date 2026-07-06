"use client";

import { useMemo, useState } from "react";
import { estimateRunCost } from "@/lib/costEstimate";

const DEFAULT_CAP = 5;

function formatUsd(value: number, maxFractionDigits = 2): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

export type EstimateEpisode = { cost: number; characterId: string | null };

/**
 * Empirical run-cost estimate ("runs like this cost $X–$Y") derived purely from
 * the dashboard's own historical per-episode spend. Read-only decision lever;
 * no pipeline dependency. Optionally filter the history by character (channel
 * filtering waits on the jobs.channel tagging gap).
 */
export function RunCostEstimate({
  episodeCosts,
  characters,
}: {
  episodeCosts: EstimateEpisode[];
  characters: { id: string; label: string }[];
}) {
  // Raw string so the user can clear/retype the field; estimateRunCost() safely
  // falls back to a cap of 1 for empty/invalid input, so no forced clamp needed.
  const [capInput, setCapInput] = useState(String(DEFAULT_CAP));
  const [characterId, setCharacterId] = useState("");

  const availableCharacters = useMemo(() => {
    const present = new Set(
      episodeCosts.map((entry) => entry.characterId).filter((id): id is string => id !== null),
    );
    return characters.filter((character) => present.has(character.id));
  }, [characters, episodeCosts]);

  // If a previously-selected character no longer has any episodes, fall back to All.
  const activeCharacterId =
    characterId !== "" && availableCharacters.some((character) => character.id === characterId)
      ? characterId
      : "";

  const filteredCosts = useMemo(
    () =>
      (activeCharacterId === ""
        ? episodeCosts
        : episodeCosts.filter((entry) => entry.characterId === activeCharacterId)
      ).map((entry) => entry.cost),
    [episodeCosts, activeCharacterId],
  );

  const estimate = useMemo(
    () => estimateRunCost(filteredCosts, Number(capInput)),
    [filteredCosts, capInput],
  );

  return (
    <section className="glass-panel run-cost-estimate" aria-labelledby="run-cost-estimate-title">
      <div className="run-cost-estimate__head">
        <div>
          <h3 id="run-cost-estimate-title" className="text-title">
            Estimate a run
          </h3>
          <p className="dim" style={{ fontSize: "0.875rem" }}>
            From your own history — an estimate, not a quote.
          </p>
        </div>
        <div className="run-cost-estimate__controls">
          {availableCharacters.length > 0 ? (
            <label className="run-cost-estimate__cap">
              Character
              <select
                value={activeCharacterId}
                onChange={(event) => setCharacterId(event.target.value)}
              >
                <option value="">All characters</option>
                {availableCharacters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.label || "Untitled"}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="run-cost-estimate__cap">
            Episodes per run
            <input
              type="number"
              min={1}
              max={50}
              step={1}
              inputMode="numeric"
              value={capInput}
              onChange={(event) => setCapInput(event.target.value)}
            />
          </label>
        </div>
      </div>

      {estimate.perEpisode === null || estimate.run === null ? (
        <p className="dim">Not enough spend history yet to estimate. Estimates appear once runs record spend.</p>
      ) : (
        <div className="run-cost-estimate__body">
          <div className="run-cost-estimate__headline">
            <span className="run-cost-estimate__range">
              {formatUsd(estimate.run.low)} – {formatUsd(estimate.run.high)}
            </span>
            <span className="dim">
              typical {formatUsd(estimate.run.typical)} for a {estimate.episodeCap}-episode run
            </span>
          </div>
          <dl className="run-cost-estimate__grid">
            <div>
              <dt className="dim">Per episode (median)</dt>
              <dd>{formatUsd(estimate.perEpisode.p50, 3)}</dd>
            </div>
            <div>
              <dt className="dim">Per episode (typical range)</dt>
              <dd>
                {formatUsd(estimate.perEpisode.p50, 3)} – {formatUsd(estimate.perEpisode.p90, 3)}
              </dd>
            </div>
            <div>
              <dt className="dim">Seen range</dt>
              <dd>
                {formatUsd(estimate.perEpisode.min, 3)} – {formatUsd(estimate.perEpisode.max, 3)}
              </dd>
            </div>
          </dl>
          <p className="dim run-cost-estimate__note">
            Based on {estimate.sampleSize} past episode{estimate.sampleSize === 1 ? "" : "s"}. Range is
            the median-to-90th-percentile spread; render is the dominant cost, so a run that leans on
            generation trends toward the high end.
          </p>
        </div>
      )}
    </section>
  );
}
