"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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

export default function ControlRoom({ userEmail }: { userEmail: string }) {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [chars, setChars] = useState<FlatChar[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"roster" | "wire" | "runs">("roster");
  const [draftIdea, setDraftIdea] = useState("");
  const [flash, setFlash] = useState<{ msg: string; err?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const set = (field: keyof FlatChar, val: string) =>
    setChars((cs) =>
      cs.map((c) => (c.id === activeId ? { ...c, [field]: val } : c)),
    );

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
                      <div key={e.episode_id} className="runcard">
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
