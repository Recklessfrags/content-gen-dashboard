import { isInFlightStatus, type JobStatus } from "@/lib/jobs";

type RunGroupCard = {
  status: JobStatus;
  rawStatus?: string;
  needsAttention: boolean;
};

export type RunGroupKey = "attention" | "in_progress" | "done";

export type RunGroup<T extends RunGroupCard = RunGroupCard> = {
  key: RunGroupKey;
  label: string;
  defaultOpen: boolean;
  cards: T[];
};

const RUN_GROUPS: ReadonlyArray<Omit<RunGroup, "cards">> = [
  { key: "attention", label: "Needs attention", defaultOpen: true },
  { key: "in_progress", label: "In progress", defaultOpen: true },
  { key: "done", label: "Done", defaultOpen: false },
];

export function runGroupKeyFor(card: RunGroupCard): RunGroupKey {
  if (card.needsAttention) return "attention";
  if (isInFlightStatus(card.rawStatus ?? card.status)) return "in_progress";
  return "done";
}

export function groupRunCards<T extends RunGroupCard>(cards: T[]): RunGroup<T>[] {
  const cardsByGroup: Record<RunGroupKey, T[]> = {
    attention: [],
    in_progress: [],
    done: [],
  };

  for (const card of cards) {
    cardsByGroup[runGroupKeyFor(card)].push(card);
  }

  return RUN_GROUPS.flatMap((group) => {
    const groupCards = cardsByGroup[group.key];
    return groupCards.length > 0 ? [{ ...group, cards: groupCards }] : [];
  });
}
