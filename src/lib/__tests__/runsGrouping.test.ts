import { describe, expect, it } from "vitest";
import { JOB_STATUSES, type JobStatus } from "@/lib/jobs";
import { groupRunCards, runGroupKeyFor, type RunGroupKey } from "@/lib/runsGrouping";

type TestCard = {
  id: string;
  status: JobStatus;
  needsAttention: boolean;
};

function card(id: string, status: JobStatus, needsAttention = false): TestCard {
  return { id, status, needsAttention };
}

describe("runGroupKeyFor", () => {
  it.each([
    ["queued", false, "in_progress"],
    ["running", false, "in_progress"],
    ["done", false, "done"],
    ["no_op", false, "done"],
    ["ready_for_review", true, "attention"],
    ["error", true, "attention"],
    ["stale", true, "attention"],
  ] satisfies Array<[JobStatus, boolean, RunGroupKey]>)(
    "maps %s with needsAttention=%s to %s",
    (status, needsAttention, expected) => {
      expect(runGroupKeyFor({ status, needsAttention })).toBe(expected);
    },
  );

  it("gives needsAttention precedence over status", () => {
    expect(runGroupKeyFor({ status: "done", needsAttention: true })).toBe("attention");
  });

  it.each(["done", "no_op", "ready_for_review", "error", "stale"] satisfies JobStatus[])(
    "falls back to done for non-in-flight %s cards without attention",
    (status) => {
      expect(runGroupKeyFor({ status, needsAttention: false })).toBe("done");
    },
  );

  it("maps every JobStatus to exactly one group", () => {
    const cards = JOB_STATUSES.map((status) =>
      card(status, status, ["ready_for_review", "error", "stale"].includes(status)),
    );
    const groups = groupRunCards(cards);
    const groupedIds = groups.flatMap((group) => group.cards.map(({ id }) => id));

    expect(groupedIds).toHaveLength(JOB_STATUSES.length);
    for (const status of JOB_STATUSES) {
      expect(groupedIds.filter((id) => id === status)).toHaveLength(1);
    }
  });
});

describe("groupRunCards", () => {
  it("returns groups in fixed order with labels and default-open states", () => {
    const groups = groupRunCards([
      card("done", "done"),
      card("attention", "error", true),
      card("running", "running"),
    ]);

    expect(groups.map(({ key, label, defaultOpen }) => ({ key, label, defaultOpen }))).toEqual([
      { key: "attention", label: "Needs attention", defaultOpen: true },
      { key: "in_progress", label: "In progress", defaultOpen: true },
      { key: "done", label: "Done", defaultOpen: false },
    ]);
  });

  it("omits empty groups", () => {
    expect(groupRunCards([card("done", "no_op")])).toEqual([
      {
        key: "done",
        label: "Done",
        defaultOpen: false,
        cards: [card("done", "no_op")],
      },
    ]);
  });

  it("preserves input order within each group", () => {
    const groups = groupRunCards([
      card("done-1", "done"),
      card("attention-1", "stale", true),
      card("progress-1", "queued"),
      card("attention-2", "error", true),
      card("done-2", "no_op"),
      card("progress-2", "running"),
    ]);

    expect(groups.map((group) => [group.key, group.cards.map(({ id }) => id)])).toEqual([
      ["attention", ["attention-1", "attention-2"]],
      ["in_progress", ["progress-1", "progress-2"]],
      ["done", ["done-1", "done-2"]],
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(groupRunCards([])).toEqual([]);
  });
});
