// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChannelProfilesPanel } from "@/components/controlroom/ChannelProfilesPanel";
import type { ChannelProfile } from "@/lib/channelProfiles";

const existingProfile: ChannelProfile = {
  channel: "history",
  character: null,
  character_id: null,
  created_at: "2026-08-01T00:00:00.000Z",
  description: "Primary-source history",
  display_name: "History",
  engagement_posture: {
    claim_discipline: "fact_first",
    arousal_ceiling: "conservative",
  },
  fact_anchor: "declassified_primary_doc",
  length_target: { short_s: 75 },
  packaging: {},
  platforms: [],
  research_profile: {
    anchor_type: "declassified_primary_doc",
    thesis: "pipeline-owned",
  },
  source_ladder: ["archival"],
  sourcing: {
    escalation_ladder: ["archival"],
    assembly_max_spend: 7.5,
  },
  treatment: "archival_documentary",
  updated_at: "2026-08-01T00:00:00.000Z",
  voice_archetype: null,
};

afterEach(cleanup);

describe("ChannelProfilesPanel create saves", () => {
  it("refuses an existing channel before any write, then inserts a new channel", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert, upsert }));
    const user = userEvent.setup();

    render(
      <ChannelProfilesPanel
        supabase={{ from } as never}
        profiles={[existingProfile]}
        loading={false}
        error={null}
        onRefetch={vi.fn()}
        createOnly
      />,
    );

    const channelInput = await screen.findByRole("textbox", { name: "Channel" });
    await user.type(channelInput, existingProfile.channel);
    await user.click(screen.getByRole("button", { name: "Save channel" }));

    const refusal = await screen.findByText(
      new RegExp(`channel named.*${existingProfile.channel}`, "i"),
    );
    expect(refusal).not.toHaveTextContent(/^\s*$/);
    expect(refusal).toHaveTextContent(existingProfile.channel);
    expect(from).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();

    await user.clear(channelInput);
    await user.type(channelInput, "science");
    await user.click(screen.getByRole("button", { name: "Save channel" }));

    await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "science" }),
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it("normalizes stored pipeline lists and explains the archival default", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert, upsert }));
    const user = userEvent.setup();
    const mixedCaseProfile: ChannelProfile = {
      ...existingProfile,
      sourcing: {
        escalation_ladder: [" Archival "],
        assembly_max_spend: 7.5,
      },
    };

    render(
      <ChannelProfilesPanel
        supabase={{ from } as never}
        profiles={[mixedCaseProfile]}
        loading={false}
        error={null}
        onRefetch={vi.fn()}
      />,
    );

    const routing = await screen.findByRole("textbox", {
      name: /Footage routing/i,
    });
    const providers = screen.getByRole("textbox", {
      name: /Archival providers/i,
    });
    expect(routing).toHaveValue("archival");
    expect(providers).toHaveValue("");
    expect(
      screen.getByText(
        /Pipeline default: internet_archive, wikimedia_commons\./,
      ),
    ).toBeInTheDocument();

    await user.clear(routing);
    await user.type(routing, "Archival");
    await user.type(providers, "Wikimedia_Commons");
    await user.click(screen.getByRole("button", { name: "Save channel" }));

    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcing: {
          escalation_ladder: ["archival"],
          archival_providers: ["wikimedia_commons"],
          assembly_max_spend: 7.5,
        },
      }),
      { onConflict: "channel" },
    );
    expect(insert).not.toHaveBeenCalled();
  });
});
