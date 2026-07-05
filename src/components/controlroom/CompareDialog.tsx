import React, { useMemo, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import { BIBLE_FIELDS, type CharacterBibleRevision, type CharacterStatus } from "@/lib/types";
import { FIELD_LABELS, flattenRevision, formatRevisionDate, type FlatChar } from "./shared";

type CompareFieldKey = "codename" | "concept" | "status" | (typeof BIBLE_FIELDS)[number];
type CompareFieldStatus = "unchanged" | "modified" | "added" | "removed";
type CompareLayout = "split" | "inline";
type DiffState = "same" | "inserted" | "deleted";

type CompareFieldDefinition = {
  key: CompareFieldKey;
  label: string;
};

type DiffToken = {
  value: string;
  state: DiffState;
};

type FieldComparison = {
  field: CompareFieldDefinition;
  currentValue: string;
  revisionValue: string;
  status: CompareFieldStatus;
  currentDiff: DiffToken[];
  revisionDiff: DiffToken[];
};

const COMPARE_FIELDS: CompareFieldDefinition[] = [
  { key: "codename", label: "Name" },
  { key: "concept", label: "One-line concept" },
  { key: "status", label: "Status" },
  ...BIBLE_FIELDS.map((field) => ({ key: field, label: FIELD_LABELS[field] })),
];

function statusLabel(status: CharacterStatus): string {
  return status === "active" ? "Active" : "Draft";
}

function compareValue(character: FlatChar, key: CompareFieldKey): string {
  if (key === "status") return statusLabel(character.status);
  return character[key] ?? "";
}

function fieldStatus(currentValue: string, revisionValue: string): CompareFieldStatus {
  if (currentValue === revisionValue) return "unchanged";
  if (currentValue.trim() !== "" && revisionValue.trim() === "") return "added";
  if (currentValue.trim() === "" && revisionValue.trim() !== "") return "removed";
  return "modified";
}

function tokenizeDiffValue(value: string): string[] {
  return value.match(/\s+|[^\s]+/g) ?? [];
}

function diffText(revisionValue: string, currentValue: string) {
  const revisionTokens = tokenizeDiffValue(revisionValue);
  const currentTokens = tokenizeDiffValue(currentValue);
  const table = Array.from({ length: revisionTokens.length + 1 }, () =>
    Array.from({ length: currentTokens.length + 1 }, () => 0),
  );

  for (let revisionIndex = 1; revisionIndex <= revisionTokens.length; revisionIndex += 1) {
    for (let currentIndex = 1; currentIndex <= currentTokens.length; currentIndex += 1) {
      if (revisionTokens[revisionIndex - 1] === currentTokens[currentIndex - 1]) {
        table[revisionIndex][currentIndex] = table[revisionIndex - 1][currentIndex - 1] + 1;
      } else {
        table[revisionIndex][currentIndex] = Math.max(
          table[revisionIndex - 1][currentIndex],
          table[revisionIndex][currentIndex - 1],
        );
      }
    }
  }

  const revisionDiff: DiffToken[] = [];
  const currentDiff: DiffToken[] = [];
  let revisionIndex = revisionTokens.length;
  let currentIndex = currentTokens.length;

  while (revisionIndex > 0 || currentIndex > 0) {
    if (
      revisionIndex > 0 &&
      currentIndex > 0 &&
      revisionTokens[revisionIndex - 1] === currentTokens[currentIndex - 1]
    ) {
      const value = revisionTokens[revisionIndex - 1];
      revisionDiff.push({ value, state: "same" });
      currentDiff.push({ value, state: "same" });
      revisionIndex -= 1;
      currentIndex -= 1;
    } else if (
      currentIndex > 0 &&
      (revisionIndex === 0 ||
        table[revisionIndex][currentIndex - 1] >= table[revisionIndex - 1][currentIndex])
    ) {
      currentDiff.push({ value: currentTokens[currentIndex - 1], state: "inserted" });
      currentIndex -= 1;
    } else if (revisionIndex > 0) {
      revisionDiff.push({ value: revisionTokens[revisionIndex - 1], state: "deleted" });
      revisionIndex -= 1;
    }
  }

  return {
    currentDiff: currentDiff.reverse(),
    revisionDiff: revisionDiff.reverse(),
  };
}

function buildComparisons(current: FlatChar, revision: CharacterBibleRevision): FieldComparison[] {
  const revisionFlat = flattenRevision(revision, current);
  return COMPARE_FIELDS.map((field) => {
    const currentValue = compareValue(current, field.key);
    const revisionValue = compareValue(revisionFlat, field.key);
    const { currentDiff, revisionDiff } = diffText(revisionValue, currentValue);

    return {
      field,
      currentValue,
      revisionValue,
      status: fieldStatus(currentValue, revisionValue),
      currentDiff,
      revisionDiff,
    };
  });
}

function renderDiff(tokens: DiffToken[], emptyLabel: string) {
  if (tokens.length === 0) return <span>{emptyLabel}</span>;

  return tokens.map((token, index) => {
    if (token.state === "same") {
      return <React.Fragment key={`${index}-${token.state}`}>{token.value}</React.Fragment>;
    }

    return (
      <span
        key={`${index}-${token.state}`}
        className={token.state === "inserted" ? "diff-ins" : "diff-del"}
      >
        {token.value}
      </span>
    );
  });
}

type CompareDialogProps = {
  current: FlatChar;
  revision: CharacterBibleRevision;
  onClose: () => void;
  onRestore: (revision: CharacterBibleRevision) => void;
  restoreFocusRef: React.RefObject<HTMLButtonElement | null>;
};

export function CompareDialog({
  current,
  revision,
  onClose,
  onRestore,
  restoreFocusRef,
}: CompareDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnButtonRef = useRef<HTMLButtonElement>(null);
  const [layout, setLayout] = useState<CompareLayout>("split");
  const comparisons = useMemo(() => buildComparisons(current, revision), [current, revision]);
  const hasDifferences = comparisons.some((comparison) => comparison.status !== "unchanged");
  const formattedDate = formatRevisionDate(revision.created_at);

  useScrollLock();

  useFocusTrap({
    active: true,
    containerRef: dialogRef,
    onEscape: onClose,
    initialFocusRef: returnButtonRef,
    restoreFocusRef,
  });

  const handleLayerMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="compare-layer" role="presentation" onMouseDown={handleLayerMouseDown}>
      <div
        ref={dialogRef}
        className="compare-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Compare character profile versions"
      >
        <div className="compare-head">
          <h2>Compare versions</h2>
          <p>
            Comparing the current profile for {current.codename || "Untitled"} against the
            saved version from {formattedDate}
          </p>
        </div>

        <div className="compare-toolbar">
          <div role="tablist" aria-label="Comparison layout">
            <button
              className="btn ghost"
              type="button"
              role="tab"
              aria-selected={layout === "split"}
              onClick={() => setLayout("split")}
            >
              Side-by-Side Layout
            </button>
            <button
              className="btn ghost"
              type="button"
              role="tab"
              aria-selected={layout === "inline"}
              onClick={() => setLayout("inline")}
            >
              Inline Diff Layout
            </button>
          </div>
          <span className="count">
            {hasDifferences
              ? `${comparisons.filter((comparison) => comparison.status !== "unchanged").length} modified`
              : "No differences"}
          </span>
        </div>

        <div className="compare-body">
          {!hasDifferences && (
            <div className="compare-field unchanged" role="status">
              <div className="compare-field-header">
                <label>No differences</label>
                <span className="chip">[ UNCHANGED ]</span>
              </div>
              <div className="compare-column">
                The current profile matches this saved version across every compared field.
              </div>
            </div>
          )}

          {comparisons.map((comparison) => {
            const changed = comparison.status !== "unchanged";
            const chip = changed ? "[ MODIFIED ]" : "[ UNCHANGED ]";
            const currentColumnClass =
              "compare-column" +
              (comparison.status === "added" || comparison.status === "modified" ? " added" : "");
            const revisionColumnClass =
              "compare-column" +
              (comparison.status === "removed" || comparison.status === "modified"
                ? " removed"
                : "");

            return (
              <section
                key={comparison.field.key}
                className={"compare-field" + (!changed ? " unchanged" : "")}
                aria-label={`${comparison.field.label}: ${comparison.status}`}
              >
                <div className="compare-field-header">
                  <label>{comparison.field.label}</label>
                  <span className="chip">{chip}</span>
                </div>

                {layout === "split" ? (
                  <div className="compare-split">
                    <div className={currentColumnClass}>
                      <strong>Current</strong>
                      {"\n"}
                      {renderDiff(comparison.currentDiff, "Empty")}
                    </div>
                    <div className={revisionColumnClass}>
                      <strong>Revision</strong>
                      {"\n"}
                      {renderDiff(comparison.revisionDiff, "Empty")}
                    </div>
                  </div>
                ) : (
                  <div className="compare-split" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="compare-column">
                      <strong>Current</strong>
                      {"\n"}
                      {renderDiff(comparison.currentDiff, "Empty")}
                      {"\n\n"}
                      <strong>Revision</strong>
                      {"\n"}
                      {renderDiff(comparison.revisionDiff, "Empty")}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className="compare-foot">
          <button className="btn" type="button" onClick={() => onRestore(revision)}>
            RESTORE THIS VERSION
          </button>
          <button ref={returnButtonRef} className="btn ghost" type="button" onClick={onClose}>
            BACK TO HISTORY
          </button>
        </div>
      </div>
    </div>
  );
}
