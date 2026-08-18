// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpendEfficiencyReadout } from "./SpendEfficiencyReadout";
import type { SpendEfficiencyJob } from "@/lib/spendEfficiency";

const jobs: SpendEfficiencyJob[] = [
  {
    channel: "history",
    created_at: "2026-08-18T00:00:00.000Z",
    episode_id: "episode-1",
    food: "Molasses Flood",
    spend: 2,
  },
  {
    channel: "ab_hook_a",
    created_at: "2026-08-18T00:00:00.000Z",
    episode_id: "episode-2",
    food: "Hook experiment",
    spend: 10,
  },
];

afterEach(cleanup);

describe("SpendEfficiencyReadout", () => {
  it("keeps ab_* jobs out of the headline until the operator includes them", async () => {
    const user = userEvent.setup();
    render(<SpendEfficiencyReadout jobs={jobs} loading={false} error={null} />);

    expect(screen.getByText("1 run · 1 topic · ab_* experiments excluded")).toBeInTheDocument();
    expect(
      within(screen.getByText("Spend per topic").closest("article")!).getByText("$2.00 USD"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Spend that never delivered")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("checkbox", { name: "Include deliberate ab_* experiments" }),
    );

    expect(screen.getByText("2 runs · 2 topics · ab_* experiments included")).toBeInTheDocument();
    expect(
      within(screen.getByText("Spend per topic").closest("article")!).getByText("$6.00 USD"),
    ).toBeInTheDocument();
  });
});
