"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BIBLE_FIELDS,
  CHANNELS,
  STATUS_CYCLE,
  STATUS_LABEL,
  type Bible,
  type Character,
  type Episode,
  type Idea,
  type IdeaStatus,
  type Receipt,
} from "@/lib/types";

// A flattened, editable view of a character: scalar columns + bible keys hoisted
// to the top level so the editor can address every section as `c[field]`.
type FlatChar = {
  id: string;
  codename: string;
  concept: string;
  status: string;
  created_at: string;
} & { [K in (typeof BIBLE_FIELDS)[number]]: string };

function flatten(row: Character): FlatChar {
  const bible = row.bible || {};
  const flat: Record<string, string> = {
    id: row.id,
    codename: row.codename ?? "",
    concept: row.concept ?? "",
    status: row.status ?? "draft",
    created_at: row.created_at,
  };
  for (const f of BIBLE_FIELDS) flat[f] = bible[f] ?? "";
  return flat as FlatChar;
}

function toBible(c: FlatChar): Bible {
  const bible: Bible = {};
  for (const f of BIBLE_FIELDS) bible[f] = c[f] ?? "";
  return bible;
}

function Icon({ name }: { name: string }) {
  const p =
    {
      roster: "M4 20v-2a4 4 0 014-4h0M16 14a4 4 0 014 4v2M12 4a4 4 0 100 8 4 4 0 000-8z",
      wire: "M4 6h16M4 12h16M4 18h10",
      runs: "M5 12l4 4 10-10",
      exit: "M14 8V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h7a2 2 0 002-2v-2M9 12h12m0 0l-3-3m3 3l-3 3",
    }[name] || "";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={p} />
    </svg>
  );
}

// Module-level so editing a textarea does not remount the input (focus-safe).
function Field({
  label,
  hint,
  value,
  onChange,
  rows = 3,
  mono,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
}) {
  return (
    <div className="field">
      <label>
        <span className="eyebrow">{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={mono ? { fontFamily: "var(--mono)", fontSize: "12.5px" } : undefined}
      />
    </div>
  );
}

type DrillDownProps = {
  episode: Episode;
  receipts: Receipt[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
};

function hasJson(value: unknown) {
  return value !== null && value !== undefined;
}

function receiptVerdictClass(verdict: string | null) {
  const normalized = (verdict || "").toLowerCase();
  if (["pass", "cleared", "approved", "success"].includes(normalized)) return "pass";
  if (["warning", "pass_with_warning"].includes(normalized)) return "warning";
  if (["fail", "rejected", "error", "failed"].includes(normalized)) return "fail";
  return "none";
}

function DrillDownPanel({
  episode,
  receipts,
  loading,
  error,
  onClose,
  onRetry,
}: DrillDownProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not(:disabled), summary, [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (!panel.contains(activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="drilldown-panel"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail for run ${episode.food}`}
    >
      <div className="col-head">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            ref={closeButtonRef}
            className="btn ghost close-btn"
            onClick={onClose}
            aria-label="Close run detail"
          >
            ← Back
          </button>
          <h2>Run Detail</h2>
        </div>
        <span className="count">ID: {episode.episode_id.slice(0, 8).toUpperCase()}</span>
      </div>

      <div className="detail-cap">
        <div className="topic-title">{episode.food}</div>
        <div className="detail-meta">
          <span className="rmeta stat">{episode.status}</span>
          {episode.final_stage && <span className="rmeta">stage · {episode.final_stage}</span>}
          {typeof episode.spend === "number" && episode.spend > 0 && (
            <span className="rmeta spend-total">Total Spend: ${episode.spend.toFixed(2)}</span>
          )}
          <span className="rmeta">{new Date(episode.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="drilldown-content">
        {loading ? (
          <div className="loading">
            <span className="spin" /> Loading run receipts…
          </div>
        ) : error ? (
          <div className="empty">
            <h3>Comms Down</h3>
            <p>Couldn&apos;t reach the pipeline receipts database: {error}</p>
            <button className="btn" onClick={onRetry} style={{ marginTop: "12px" }}>
              Retry Connection
            </button>
          </div>
        ) : receipts.length === 0 ? (
          <div className="empty">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12l4 4 10-10" />
            </svg>
            <h3>No receipts logged</h3>
            <p>This episode finished without producing step-by-step pipeline receipts.</p>
          </div>
        ) : (
          <div className="timeline">
            {receipts.map((receipt) => {
              const resolvedClass = receiptVerdictClass(receipt.verdict);
              return (
                <div key={receipt.id} className="timeline-item">
                  <div className={`timeline-node ${resolvedClass}`} aria-hidden="true" />
                  <div className={`receipt-card ${resolvedClass}`}>
                    <div className="receipt-card-header">
                      <div className="receipt-stage-title">
                        {receipt.stage || "unknown-stage"}
                        <span className="receipt-seq">seq · {receipt.seq}</span>
                      </div>
                      <span className="receipt-timestamp">
                        {receipt.ts
                          ? new Date(receipt.ts).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "no timestamp"}
                      </span>
                    </div>

                    <div className="receipt-meta-row">
                      <span className="rmeta model-badge">
                        {receipt.provider || "unknown"} · {receipt.model || "no-model"}
                      </span>
                      {receipt.effort_requested && (
                        <span className="rmeta effort-badge">
                          Effort: {receipt.effort_used || "0"}/{receipt.effort_requested}
                          {receipt.clamped && <span className="clamped-text"> (clamped)</span>}
                        </span>
                      )}
                      {typeof receipt.spend_so_far === "number" && (
                        <span className="rmeta spend-so-far-badge">
                          Accumulated Spend: ${receipt.spend_so_far.toFixed(3)}
                        </span>
                      )}
                    </div>

                    <div className="receipt-verdict-banner">
                      <span className={`receipt-verdict-label ${resolvedClass}`}>
                        {receipt.verdict || "UNKNOWN"}
                      </span>
                      <p className="receipt-reason-text">
                        {receipt.reason || "No written justification logged."}
                      </p>
                    </div>

                    <div className="receipt-json-disclosures">
                      {hasJson(receipt.evidence) && (
                        <details className="receipt-json-details">
                          <summary
                            className="receipt-json-summary"
                            role="button"
                            aria-label="Toggle raw evidence JSON"
                          >
                            Evidence JSON
                          </summary>
                          <pre className="receipt-json-content">
                            <code>{JSON.stringify(receipt.evidence, null, 2)}</code>
                          </pre>
                        </details>
                      )}

                      {hasJson(receipt.result) && (
                        <details className="receipt-json-details">
                          <summary
                            className="receipt-json-summary"
                            role="button"
                            aria-label="Toggle raw result JSON"
                          >
                            Result JSON
                          </summary>
                          <pre className="receipt-json-content">
                            <code>{JSON.stringify(receipt.result, null, 2)}</code>
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ControlRoom({ userEmail }: { userEmail: string }) {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [chars, setChars] = useState<FlatChar[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"roster" | "wire" | "runs">("roster");
  const [draftIdea, setDraftIdea] = useState("");
  const [flash, setFlash] = useState<{ msg: string; err?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastRunTriggerRef = useRef<string | null>(null);
  const receiptRequestRef = useRef(0);
  const showFlash = (msg: string, err = false) => {
    setFlash({ msg, err });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2200);
  };

  // ── initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [c, i, e] = await Promise.all([
        supabase.from("characters").select("*").order("created_at", { ascending: true }),
        supabase.from("ideas").select("*").order("created_at", { ascending: false }),
        supabase.from("episodes").select("*").order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      const firstErr = c.error || i.error || e.error;
      if (firstErr) {
        setLoadError(firstErr.message);
        setLoading(false);
        return;
      }
      const flat = (c.data as Character[]).map(flatten);
      setChars(flat);
      setIdeas((i.data as Idea[]) ?? []);
      setEpisodes((e.data as Episode[]) ?? []);
      setActiveId(flat[0]?.id ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const active = chars.find((c) => c.id === activeId) ?? null;
  const activeEpisode = episodes.find((e) => e.episode_id === activeEpisodeId) ?? null;

  const set = (field: keyof FlatChar, val: string) =>
    setChars((cs) =>
      cs.map((c) => (c.id === activeId ? { ...c, [field]: val } : c)),
    );

  const fetchReceipts = useCallback(
    async (episodeId: string) => {
      const requestId = receiptRequestRef.current + 1;
      receiptRequestRef.current = requestId;
      setReceiptsLoading(true);
      setReceiptsError(null);
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("episode_id", episodeId)
        .order("seq", { ascending: true })
        .returns<Receipt[]>();
      if (receiptRequestRef.current !== requestId) return;
      setReceiptsLoading(false);
      if (error) {
        setReceipts([]);
        setReceiptsError(error.message);
        return;
      }
      setReceipts(data ?? []);
    },
    [supabase],
  );

  const openRunDetail = (episodeId: string) => {
    lastRunTriggerRef.current = episodeId;
    setActiveEpisodeId(episodeId);
    setReceipts([]);
    void fetchReceipts(episodeId);
  };

  const closeRunDetail = useCallback(() => {
    const triggerId = lastRunTriggerRef.current;
    receiptRequestRef.current += 1;
    setActiveEpisodeId(null);
    setReceipts([]);
    setReceiptsError(null);
    setReceiptsLoading(false);
    window.requestAnimationFrame(() => {
      if (triggerId) runButtonRefs.current.get(triggerId)?.focus();
    });
  }, []);

  // ── persist character ───────────────────────────────────────────────────
  const save = async () => {
    if (!active || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("characters")
      .update({
        codename: active.codename,
        concept: active.concept,
        status: active.status,
        bible: toBible(active),
      })
      .eq("id", active.id);
    setSaving(false);
    if (error) showFlash("Save failed — " + error.message, true);
    else showFlash("✓ Saved · the writer reads this on every run");
  };

  const addChar = async () => {
    if (adding) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("characters")
      .insert({ codename: "New character", status: "draft", bible: {} })
      .select("*")
      .single();
    setAdding(false);
    if (error || !data) {
      showFlash("Could not create character — " + (error?.message ?? ""), true);
      return;
    }
    const flat = flatten(data as Character);
    setChars((cs) => [...cs, flat]);
    setActiveId(flat.id);
    setView("roster");
  };

  const toggleStatus = () => {
    if (!active) return;
    set("status", active.status === "active" ? "draft" : "active");
  };

  // ── ideas (the wire) ──────────────────────────────────────────────────────
  const logIdea = async () => {
    const t = draftIdea.trim();
    if (!t) return;
    setDraftIdea("");
    const { data, error } = await supabase
      .from("ideas")
      .insert({
        title: t,
        note: "",
        character_id: activeId,
        channel: CHANNELS[0],
        status: "backlog",
      })
      .select("*")
      .single();
    if (error || !data) {
      showFlash("Could not log idea — " + (error?.message ?? ""), true);
      setDraftIdea(t);
      return;
    }
    setIdeas((xs) => [data as Idea, ...xs]);
  };

  const cycleStatus = async (id: string) => {
    const idea = ideas.find((x) => x.id === id);
    if (!idea) return;
    const next: IdeaStatus = STATUS_CYCLE[idea.status];
    setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, status: next } : x)));
    const { error } = await supabase.from("ideas").update({ status: next }).eq("id", id);
    if (error) {
      // revert on failure
      setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, status: idea.status } : x)));
      showFlash("Status update failed", true);
    }
  };

  const setIdeaField = async (id: string, f: "character_id" | "channel", v: string) => {
    const prev = ideas.find((x) => x.id === id);
    setIdeas((xs) => xs.map((x) => (x.id === id ? { ...x, [f]: v } : x)));
    const { error } = await supabase.from("ideas").update({ [f]: v }).eq("id", id);
    if (error && prev) {
      setIdeas((xs) => xs.map((x) => (x.id === id ? prev : x)));
      showFlash("Tag update failed", true);
    }
  };

  const openIdeas = ideas.filter((i) => i.status !== "used").length;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="cr">
      <nav className="rail">
        <div className="brand">
          CONTROL<b>·</b>ROOM
        </div>
        {(
          [
            ["roster", "Roster"],
            ["wire", "The Wire"],
            ["runs", "Runs"],
          ] as const
        ).map(([k, lbl]) => (
          <button
            key={k}
            className={"navbtn" + (view === k ? " on" : "")}
            onClick={() => setView(k)}
            aria-pressed={view === k}
          >
            <Icon name={k} />
            <span>{lbl}</span>
            <div className="dot" />
          </button>
        ))}
        <form action="/auth/signout" method="post" className="railspacer">
          <button className="navbtn" type="submit" title={`Sign out · ${userEmail}`}>
            <Icon name="exit" />
            <span>Exit</span>
            <div className="dot" />
          </button>
        </form>
      </nav>

      {loading ? (
        <div className="loading">
          <span className="spin" /> Loading field manuals…
        </div>
      ) : loadError ? (
        <div className="empty">
          <h3>Comms down</h3>
          <p>Couldn&apos;t reach the database: {loadError}</p>
        </div>
      ) : (
        <>
          {view === "roster" && (
            <div className="main">
              <aside className="roster">
                <div className="col-head">
                  <h2>Roster</h2>
                  <span className="count">{chars.length} on file</span>
                </div>
                <div className="roster-list">
                  {chars.map((c) => (
                    <button
                      key={c.id}
                      className={"pcard" + (c.id === activeId ? " on" : "")}
                      onClick={() => setActiveId(c.id)}
                    >
                      <div className="codename">{c.codename || "Untitled"}</div>
                      <div className="concept">
                        {c.concept || "No concept logged yet."}
                      </div>
                      <div className="meta">
                        {c.id === activeId && (
                          <span className="chip active">● Casting</span>
                        )}
                        {c.status === "draft" && (
                          <span className="chip draft">Draft</span>
                        )}
                      </div>
                    </button>
                  ))}
                  <button className="addbtn" onClick={addChar} disabled={adding}>
                    {adding ? "Creating…" : "+ New character"}
                  </button>
                </div>
              </aside>

              {active ? (
                <section className="dossier">
                  <header className="dossier-head">
                    <div className="filecode">
                      <span>FILE · {active.id.slice(0, 8).toUpperCase()}</span>
                      <span className="live">
                        ● {active.status === "active" ? "ACTIVE FIELD MANUAL" : "DRAFT FIELD MANUAL"}
                      </span>
                    </div>
                    <h1>{active.codename || "Untitled"}</h1>
                    <p className="sub">
                      {active.concept ||
                        "Add a one-line concept below to anchor this character."}
                    </p>
                    <div className="stamp">Casting</div>
                  </header>

                  <div className="sheet">
                    <Field
                      label="Codename"
                      value={active.codename}
                      onChange={(v) => set("codename", v)}
                      rows={1}
                    />
                    <Field
                      label="One-line concept"
                      hint="The logline the writer reads first"
                      value={active.concept}
                      onChange={(v) => set("concept", v)}
                      rows={2}
                    />
                    <Field
                      label="Voice & identity"
                      hint="Who they are — keep it original, never a real person"
                      value={active.voice}
                      onChange={(v) => set("voice", v)}
                      rows={4}
                    />
                    <div className="grid2">
                      <Field
                        label="Cadence & delivery"
                        value={active.cadence}
                        onChange={(v) => set("cadence", v)}
                        rows={5}
                      />
                      <Field
                        label="Vocabulary & catchphrases"
                        value={active.vocab}
                        onChange={(v) => set("vocab", v)}
                        rows={5}
                      />
                    </div>
                    <Field
                      label="Off-limits"
                      hint="Hard rules — what they never say (keeps you monetizable & on-brand)"
                      value={active.offlimits}
                      onChange={(v) => set("offlimits", v)}
                      rows={3}
                    />
                    <Field
                      label="Gold-standard lines"
                      hint="2–4 example lines — the writer imitates these more than any instruction"
                      value={active.lines}
                      onChange={(v) => set("lines", v)}
                      rows={5}
                      mono
                    />
                    <div className="grid2">
                      <Field
                        label="Beat template"
                        value={active.beats}
                        onChange={(v) => set("beats", v)}
                        rows={6}
                        mono
                      />
                      <Field
                        label="Runtime target"
                        hint="Enforced at script + render"
                        value={active.runtime}
                        onChange={(v) => set("runtime", v)}
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="savebar">
                    <button className="btn" onClick={save} disabled={saving}>
                      {saving ? "Saving…" : "Save dossier"}
                    </button>
                    <button className="btn ghost" onClick={toggleStatus}>
                      {active.status === "active" ? "● Active" : "○ Draft"}
                    </button>
                    <button className="btn ghost" onClick={() => setView("wire")}>
                      Log an idea →
                    </button>
                    <span className={"flash" + (flash ? " show" : "") + (flash?.err ? " err" : "")}>
                      {flash?.msg}
                    </span>
                  </div>
                </section>
              ) : (
                <section className="dossier">
                  <div className="empty">
                    <Icon name="roster" />
                    <h3>No characters yet</h3>
                    <p>Create your first character to start building a field manual.</p>
                    <button className="btn" onClick={addChar} disabled={adding}>
                      {adding ? "Creating…" : "+ New character"}
                    </button>
                  </div>
                </section>
              )}
            </div>
          )}

          {view === "wire" && (
            <div className="wire">
              <div className="col-head">
                <h2>The Wire</h2>
                <span className="count">
                  {ideas.length} logged · {openIdeas} open
                </span>
              </div>
              <div className="cap">
                <span className="eyebrow">
                  Inspiration just hit — get it down before it&apos;s gone
                </span>
                <div className="row" style={{ marginTop: 9 }}>
                  <input
                    value={draftIdea}
                    placeholder="An idea, a headline, a half-thought…"
                    onChange={(e) => setDraftIdea(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && logIdea()}
                    aria-label="New idea"
                  />
                  <button className="btn" onClick={logIdea}>
                    Log it
                  </button>
                </div>
              </div>
              {ideas.length === 0 ? (
                <div className="empty">
                  <h3>The wire&apos;s quiet</h3>
                  <p>Nothing logged yet. Drop the next idea above the moment it lands.</p>
                </div>
              ) : (
                <div className="wire-list">
                  {ideas.map((i) => (
                    <div
                      key={i.id}
                      className="icard"
                      style={{
                        borderLeftColor:
                          i.status === "active"
                            ? "var(--brass)"
                            : i.status === "used"
                              ? "var(--cleared)"
                              : "var(--line)",
                      }}
                    >
                      <div className="body">
                        <div className="title">{i.title}</div>
                        {i.note && <div className="note">{i.note}</div>}
                        <div className="tags">
                          <button
                            className={"statusbtn s-" + i.status}
                            onClick={() => cycleStatus(i.id)}
                          >
                            {STATUS_LABEL[i.status]}
                          </button>
                          <select
                            className="tag-select"
                            value={i.character_id ?? ""}
                            onChange={(e) =>
                              setIdeaField(i.id, "character_id", e.target.value)
                            }
                            aria-label="Assign character"
                          >
                            {chars.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.codename || "Untitled"}
                              </option>
                            ))}
                          </select>
                          <select
                            className="tag-select"
                            value={i.channel}
                            onChange={(e) =>
                              setIdeaField(i.id, "channel", e.target.value)
                            }
                            aria-label="Assign channel"
                          >
                            {CHANNELS.map((ch) => (
                              <option key={ch} value={ch}>
                                {ch}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "runs" && (
            <div className="wire">
              <div className="col-head">
                <h2>Runs</h2>
                <span className="count">
                  pipeline output · {episodes.length} episode
                  {episodes.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="cap"><span className="eyebrow">Operation-wide pipeline output — every character&apos;s finished episodes.</span></div>
              {episodes.length === 0 ? (
                <div className="empty">
                  <Icon name="runs" />
                  <h3>No runs yet</h3>
                  <p>
                    Finished episodes land here — each with its fact-check verdict
                    and the provider that gated it. The content pipeline writes them
                    to the same Supabase this dashboard reads.
                  </p>
                </div>
              ) : (
                <div className="wire-list">
                  {episodes.map((e) => {
                    const gate = e.sentinels?.[e.sentinels.length - 1];
                    return (
                      <button
                        key={e.episode_id}
                        ref={(node) => {
                          if (node) runButtonRefs.current.set(e.episode_id, node);
                          else runButtonRefs.current.delete(e.episode_id);
                        }}
                        className="runcard"
                        onClick={() => openRunDetail(e.episode_id)}
                        aria-haspopup="dialog"
                        aria-expanded={activeEpisodeId === e.episode_id}
                      >
                        <div className="topic">{e.food}</div>
                        <div className="runmeta">
                          <span className="rmeta stat">{e.status}</span>
                          {e.final_stage && (
                            <span className="rmeta">stage · {e.final_stage}</span>
                          )}
                          {gate?.provider && (
                            <span className="rmeta gate">
                              gated by {gate.provider}
                              {gate.verdict ? ` · ${gate.verdict}` : ""}
                            </span>
                          )}
                          {typeof e.spend === "number" && e.spend > 0 && (
                            <span className="rmeta">${e.spend.toFixed(2)}</span>
                          )}
                          <span className="rmeta">
                            {new Date(e.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {activeEpisode && (
                <DrillDownPanel
                  episode={activeEpisode}
                  receipts={receipts}
                  loading={receiptsLoading}
                  error={receiptsError}
                  onClose={closeRunDetail}
                  onRetry={() => {
                    void fetchReceipts(activeEpisode.episode_id);
                  }}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
