import React, { useMemo, useRef, useState } from "react";
import type { ChannelProfile } from "@/lib/channelProfiles";
import type { Json } from "@/lib/database.types";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import {
  EPISODE_CAP_MAX,
  EPISODE_CAP_MIN,
  idempotencyKeyFor,
  isValidEpisodeCap,
  RECIPES,
  type JobEnqueueInput,
  type RecipeKey,
} from "@/lib/jobs";
import { isCast } from "@/lib/casting";
import type { EnqueueSubmitResult, FlatChar, WireIdea } from "./shared";

const ENFORCE_CASTING = false; // warn-only now; flip true to hard-block enqueue of uncast characters.
const UNCAST_ENQUEUE_WARNING =
  "This character has no voice cast — the render will use a fallback voice. Cast a voice in the Casting Studio first.";

type EnqueueIdeaPanelProps = {
  idea: WireIdea;
  character: FlatChar | null;
  characters: FlatChar[];
  channelProfiles: ChannelProfile[];
  onClose: () => void;
  onSubmit: (input: JobEnqueueInput) => Promise<EnqueueSubmitResult>;
  restoreFocusRef: React.RefObject<HTMLButtonElement | null>;
};

type JsonValidation<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

function parseJsonText(text: string, label: string): JsonValidation<Json> {
  try {
    return { ok: true, value: JSON.parse(text) as Json };
  } catch {
    return { ok: false, message: `${label} must be valid JSON.` };
  }
}

function parseInjectClaims(text: string): JsonValidation<Json[]> {
  const parsed = parseJsonText(text, "Inject claims");
  if (!parsed.ok) return parsed;
  if (!Array.isArray(parsed.value)) {
    return { ok: false, message: "Inject claims must be a JSON array." };
  }
  if (parsed.value.some((item) => typeof item !== "string")) {
    return { ok: false, message: "Inject claims must be a JSON array of strings." };
  }
  return { ok: true, value: parsed.value };
}

function parseRoutes(text: string): JsonValidation<Json> {
  const parsed = parseJsonText(text, "Routing config");
  if (!parsed.ok) return parsed;
  if (
    parsed.value === null ||
    Array.isArray(parsed.value) ||
    typeof parsed.value !== "object"
  ) {
    return { ok: false, message: "Routing config must be a JSON object." };
  }
  return { ok: true, value: parsed.value };
}

function parseLiveAdapters(text: string): JsonValidation<Json | null> {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  return parseJsonText(trimmed, "Live adapters");
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function channelProfileValueForIdea(
  ideaChannel: string,
  channelProfiles: ChannelProfile[],
): string {
  const normalizedIdeaChannel = ideaChannel.trim().toLowerCase();
  const match = channelProfiles.find(
    (profile) =>
      profile.channel.trim().toLowerCase() === normalizedIdeaChannel ||
      profile.display_name.trim().toLowerCase() === normalizedIdeaChannel,
  );

  return match?.channel.trim().toLowerCase() === "default" ? "" : (match?.channel ?? "");
}

export function EnqueueIdeaPanel({
  idea,
  character,
  characters,
  channelProfiles,
  onClose,
  onSubmit,
  restoreFocusRef,
}: EnqueueIdeaPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const characterInputRef = useRef<HTMLInputElement>(null);
  const sortedChannelProfiles = useMemo(
    () =>
      channelProfiles
        .filter((profile) => profile.channel.trim().toLowerCase() !== "default")
        .sort((left, right) => {
          const byName = left.display_name.localeCompare(right.display_name, undefined, {
            sensitivity: "base",
          });
          return byName || left.channel.localeCompare(right.channel);
        }),
    [channelProfiles],
  );
  const [recipeKey, setRecipeKey] = useState<RecipeKey>("provenRender");
  const [characterName, setCharacterName] = useState(
    idea.character_id && character ? character.codename : "",
  );
  const [channelProfile, setChannelProfile] = useState(() =>
    channelProfileValueForIdea(idea.channel, sortedChannelProfiles),
  );
  const [episodeCap, setEpisodeCap] = useState(String(RECIPES.provenRender.episode_cap));
  const [anchorCitation, setAnchorCitation] = useState("");
  const [anchorUrl, setAnchorUrl] = useState("");
  const [injectClaims, setInjectClaims] = useState("[]");
  const [routes, setRoutes] = useState("{}");
  const [liveAdapters, setLiveAdapters] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const recipe = RECIPES[recipeKey];
  const isFullEpisode = recipeKey === "fullEpisode";
  const capNumber = Number(episodeCap);
  const capError =
    episodeCap.trim().length === 0 || !Number.isInteger(capNumber) || !isValidEpisodeCap(capNumber)
      ? `Episode cap must be an integer from ${EPISODE_CAP_MIN + 1} to ${EPISODE_CAP_MAX}.`
      : null;
  const injectClaimsResult = parseInjectClaims(injectClaims);
  const routesResult = parseRoutes(routes);
  const liveAdaptersResult = parseLiveAdapters(liveAdapters);
  const jsonError =
    (!injectClaimsResult.ok && injectClaimsResult.message) ||
    (!routesResult.ok && routesResult.message) ||
    (!liveAdaptersResult.ok && liveAdaptersResult.message) ||
    null;
  const trimmedAnchorCitation = anchorCitation.trim();
  const trimmedAnchorUrl = anchorUrl.trim();
  const anchorError = isFullEpisode
    ? trimmedAnchorCitation.length === 0
      ? "Anchor citation is required for Full episode."
      : trimmedAnchorUrl.length === 0
        ? "Anchor URL is required for Full episode."
        : !isHttpUrl(trimmedAnchorUrl)
          ? "Anchor URL must start with http:// or https://."
          : null
    : trimmedAnchorUrl.length > 0 && !isHttpUrl(trimmedAnchorUrl)
      ? "Anchor URL must start with http:// or https://."
      : null;
  const normalizedCharacterName = characterName.trim().toLowerCase();
  const normalizedLinkedCodename = character?.codename.trim().toLowerCase() ?? "";
  // NOTE: the cast check resolves the free-text character name against the
  // roster by exact codename. A non-matching name (typo / ad-hoc character)
  // yields null and shows no warning. Acceptable while warn-only; before
  // flipping ENFORCE_CASTING to a hard block, tighten this so an unresolved
  // name doesn't silently bypass the gate.
  const selectedCharacter =
    normalizedCharacterName.length > 0
      ? (characters.find((c) => c.codename.trim().toLowerCase() === normalizedCharacterName) ?? null)
      : null;
  const castingWarning = selectedCharacter && !isCast(selectedCharacter) ? UNCAST_ENQUEUE_WARNING : null;
  const castingBlockError = ENFORCE_CASTING ? castingWarning : null;
  const showBrandWarning =
    (normalizedCharacterName === normalizedLinkedCodename ||
      normalizedCharacterName === "maddog" ||
      normalizedCharacterName === "mad-dog") &&
    normalizedLinkedCodename.includes("mad dog") &&
    idea.channel !== "Dark history";
  const canSubmit = !submitting && !capError && !jsonError && !anchorError && !castingBlockError;

  useScrollLock();

  useFocusTrap({
    active: true,
    containerRef: panelRef,
    onEscape: onClose,
    initialFocusRef: characterInputRef,
    restoreFocusRef,
  });

  const selectRecipe = (nextRecipeKey: RecipeKey) => {
    setRecipeKey(nextRecipeKey);
    setEpisodeCap(String(RECIPES[nextRecipeKey].episode_cap));
    setFormError(null);
  };

  const handleLayerMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);

    if (capError || anchorError || castingBlockError || !injectClaimsResult.ok || !routesResult.ok || !liveAdaptersResult.ok) {
      setFormError(capError ?? anchorError ?? castingBlockError ?? jsonError ?? "Resolve form errors before enqueueing.");
      return;
    }

    const input: JobEnqueueInput = {
      food: idea.title,
      character: characterName.trim().length > 0 ? characterName.trim() : null,
      channel: channelProfile.length > 0 ? channelProfile : null,
      anchor_citation: isFullEpisode ? trimmedAnchorCitation : null,
      anchor_url: isFullEpisode ? trimmedAnchorUrl : null,
      inject_claims: injectClaimsResult.value,
      episode_cap: capNumber,
      routes: routesResult.value,
      live_adapters: liveAdaptersResult.value,
      stub_upstream: recipe.stub_upstream,
      spend_approved: false,
    };

    setSubmitting(true);
    const result = await onSubmit({
      ...input,
      idempotency_key: idempotencyKeyFor(input),
    });
    setSubmitting(false);

    if (result.kind === "error") {
      setFormError(`Couldn't queue this run: ${result.message}`);
      return;
    }

    onClose();
  };

  return (
    <div className="history-layer" role="presentation" onMouseDown={handleLayerMouseDown}>
      <aside
        ref={panelRef}
        className="drilldown-panel enqueue-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="enqueue-panel-title"
        aria-busy={submitting}
      >
        <div className="col-head">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              className="btn ghost close-btn"
              type="button"
              onClick={onClose}
              disabled={submitting}
            >
              ← Back
            </button>
            <h2 id="enqueue-panel-title">Turn Idea Into Run</h2>
          </div>
          <span className="count">{recipe.stub_upstream ? "proven render" : "full episode"}</span>
        </div>

        <div className="detail-cap">
          <div>
            <span className="eyebrow">Topic</span>
            <div className="topic-title">{idea.title}</div>
          </div>
          <span className="chip">{idea.channel}</span>
        </div>

        <form className="drilldown-content enqueue-form" onSubmit={handleSubmit} aria-busy={submitting}>
          <div className="field">
            <label htmlFor="enqueue-food">
              <span className="eyebrow">Topic</span>
              <span className="field-label-side">
                <span className="hint">Read-only from the idea</span>
              </span>
            </label>
            <input id="enqueue-food" type="text" value={idea.title} readOnly disabled />
          </div>

          <div className="field">
            <label htmlFor="enqueue-character">
              <span className="eyebrow">CHARACTER</span>
              <span className="field-label-side">
                <span className="hint">Codename sent verbatim. Blank uses default.</span>
              </span>
            </label>
            <input
              ref={characterInputRef}
              id="enqueue-character"
              type="text"
              value={characterName}
              onChange={(event) => setCharacterName(event.target.value)}
              disabled={submitting}
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label htmlFor="enqueue-channel-profile">
              <span className="eyebrow">CHANNEL PROFILE</span>
              <span className="field-label-side">
                <span className="hint">Worker routing profile</span>
              </span>
            </label>
            <select
              id="enqueue-channel-profile"
              value={channelProfile}
              onChange={(event) => setChannelProfile(event.target.value)}
              disabled={submitting}
            >
              <option value="">(default profile)</option>
              {sortedChannelProfiles.map((profile) => (
                <option key={profile.channel} value={profile.channel}>
                  {profile.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
            <span className="eyebrow">EXECUTION RECIPE</span>
            <div
              className="status-segmented-control"
              role="group"
              aria-label="Execution recipe"
            >
              <button
                className={"segment-btn" + (recipeKey === "provenRender" ? " active-segment" : "")}
                type="button"
                aria-pressed={recipeKey === "provenRender"}
                onClick={() => selectRecipe("provenRender")}
                disabled={submitting}
              >
                Proven render
              </button>
              <button
                className={"segment-btn" + (recipeKey === "fullEpisode" ? " active-segment" : "")}
                type="button"
                aria-pressed={recipeKey === "fullEpisode"}
                onClick={() => selectRecipe("fullEpisode")}
                disabled={submitting}
              >
                Full episode
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="enqueue-episode-cap">
              <span className="eyebrow">EPISODE RUN CAP</span>
              <span className="field-label-side">
                <span className="hint">
                  Range {EPISODE_CAP_MIN + 1}-{EPISODE_CAP_MAX}
                </span>
              </span>
            </label>
            <input
              id="enqueue-episode-cap"
              type="number"
              min={EPISODE_CAP_MIN + 1}
              max={EPISODE_CAP_MAX}
              step={1}
              inputMode="numeric"
              value={episodeCap}
              onChange={(event) => setEpisodeCap(event.target.value)}
              disabled={submitting}
              aria-invalid={capError ? "true" : "false"}
            />
            {capError && <div className="enqueue-error" role="alert">{capError}</div>}
          </div>

          {isFullEpisode && (
            <>
              <div className="field">
                <label htmlFor="enqueue-anchor-citation">
                  <span className="eyebrow">ANCHOR CITATION *</span>
                </label>
                <input
                  id="enqueue-anchor-citation"
                  type="text"
                  value={anchorCitation}
                  onChange={(event) => setAnchorCitation(event.target.value)}
                  disabled={submitting}
                  aria-invalid={
                    anchorError === "Anchor citation is required for Full episode." ? "true" : "false"
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="enqueue-anchor-url">
                  <span className="eyebrow">ANCHOR URL *</span>
                </label>
                <input
                  id="enqueue-anchor-url"
                  type="url"
                  value={anchorUrl}
                  onChange={(event) => setAnchorUrl(event.target.value)}
                  disabled={submitting}
                  aria-invalid={anchorError?.startsWith("Anchor URL") ? "true" : "false"}
                />
                {anchorError && <div className="enqueue-error" role="alert">{anchorError}</div>}
              </div>
            </>
          )}

          <details className="advanced-job-details">
            <summary>ADVANCED PIPELINE PARAMETERS</summary>
            <div className="field">
              <label htmlFor="enqueue-inject-claims">
                <span className="eyebrow">INJECT CLAIMS (JSON ARRAY)</span>
              </label>
              <textarea
                id="enqueue-inject-claims"
                rows={4}
                value={injectClaims}
                onChange={(event) => setInjectClaims(event.target.value)}
                disabled={submitting}
                className={!injectClaimsResult.ok ? "enqueue-json-invalid" : undefined}
                aria-invalid={!injectClaimsResult.ok}
              />
            </div>
            <div className="field">
              <label htmlFor="enqueue-routes">
                <span className="eyebrow">ROUTING CONFIG (JSON OBJECT)</span>
              </label>
              <textarea
                id="enqueue-routes"
                rows={4}
                value={routes}
                onChange={(event) => setRoutes(event.target.value)}
                disabled={submitting}
                className={!routesResult.ok ? "enqueue-json-invalid" : undefined}
                aria-invalid={!routesResult.ok}
              />
            </div>
            <div className="field">
              <label htmlFor="enqueue-live-adapters">
                <span className="eyebrow">LIVE ADAPTERS (JSON OR BLANK)</span>
              </label>
              <textarea
                id="enqueue-live-adapters"
                rows={4}
                value={liveAdapters}
                onChange={(event) => setLiveAdapters(event.target.value)}
                disabled={submitting}
                className={!liveAdaptersResult.ok ? "enqueue-json-invalid" : undefined}
                aria-invalid={!liveAdaptersResult.ok}
                placeholder="blank = null"
              />
            </div>
            {jsonError && <div className="enqueue-error" role="alert">{jsonError}</div>}
          </details>

          {showBrandWarning && (
            <div className="brand-warning-banner" role="note">
              Heads up: the character &apos;Mad Dog&apos; is set up for the &apos;Dark history&apos;
              channel, but this idea is tagged &apos;{idea.channel}&apos;. Double-check the channel
              before you queue this run.
            </div>
          )}

          {castingWarning && (
            <div className="casting-enqueue-warning" role="status">
              <span aria-hidden="true">⚠ </span>
              {castingWarning}
            </div>
          )}

          {formError && <div className="enqueue-error" role="alert">{formError}</div>}

          <div className="enqueue-actions">
            <button className="btn ghost" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button className="btn" type="submit" disabled={!canSubmit}>
              {submitting ? (
                <>
                  <span className="spin" /> Queuing…
                </>
              ) : (
                "Queue as run"
              )}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
