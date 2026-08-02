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

describe("ChannelProfilesPanel saves", () => {
  it("refuses an existing channel before any write, then inserts a new channel", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn();
    const from = vi.fn(() => ({ insert, upsert }));
    const user = userEvent.setup();

    render(
      <ChannelProfilesPanel
        supabase={{ from, rpc } as never}
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
    expect(rpc).not.toHaveBeenCalled();

    await user.clear(channelInput);
    await user.type(channelInput, "science");
    await user.click(screen.getByRole("button", { name: "Save channel" }));

    await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    const insertPayload = insert.mock.calls[0][0];
    expect(insertPayload).toEqual(expect.objectContaining({ channel: "science" }));
    expect(insertPayload).not.toHaveProperty("sourcing");
    expect(insertPayload).not.toHaveProperty("research_profile");
    expect(upsert).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects an edited channel identity before any RPC or upsert", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn();
    const from = vi.fn(() => ({ insert, upsert }));
    const user = userEvent.setup();
    const selected = { ...existingProfile };

    render(
      <ChannelProfilesPanel
        supabase={{ from, rpc } as never}
        profiles={[selected]}
        loading={false}
        error={null}
        onRefetch={vi.fn()}
      />,
    );

    await screen.findByRole("textbox", { name: "Channel" });
    // Simulate the selected row changing underneath an already-hydrated form.
    selected.channel = "renamed";
    await user.click(screen.getByRole("button", { name: "Save channel" }));

    expect(await screen.findByText(/channel identity cannot be changed/i)).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("shallow-merges only edited sourcing keys without sending a stale stored snapshot", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: [existingProfile], error: null });
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
        supabase={{ from, rpc } as never}
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

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    expect(rpc).toHaveBeenCalledWith("merge_channel_profile_patch", {
      p_channel: "history",
      p_sourcing_patch: {
        escalation_ladder: ["archival"],
        archival_providers: ["wikimedia_commons"],
      },
    });
    expect(JSON.stringify(rpc.mock.calls[0])).not.toContain(
      "assembly_max_spend",
    );
    expect(JSON.stringify(rpc.mock.calls[0])).not.toContain("7.5");

    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    const upsertPayload = upsert.mock.calls[0][0];
    expect(upsertPayload).not.toHaveProperty("sourcing");
    expect(upsertPayload).not.toHaveProperty("research_profile");
    expect(upsert).toHaveBeenCalledWith(upsertPayload, {
      onConflict: "channel",
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("surfaces an RPC failure and does not continue to the profile upsert", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "merge failed" },
    });
    const from = vi.fn(() => ({ insert, upsert }));
    const user = userEvent.setup();

    render(
      <ChannelProfilesPanel
        supabase={{ from, rpc } as never}
        profiles={[existingProfile]}
        loading={false}
        error={null}
        onRefetch={vi.fn()}
      />,
    );

    const routing = await screen.findByRole("textbox", {
      name: /Footage routing/i,
    });
    await user.clear(routing);
    await user.type(routing, "pixabay");
    await user.click(screen.getByRole("button", { name: "Save channel" }));

    expect(await screen.findByText("merge failed")).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(upsert).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("treats an empty RPC result as an error and does not upsert", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const from = vi.fn(() => ({ insert, upsert }));
    const user = userEvent.setup();

    render(
      <ChannelProfilesPanel
        supabase={{ from, rpc } as never}
        profiles={[existingProfile]}
        loading={false}
        error={null}
        onRefetch={vi.fn()}
      />,
    );

    const routing = await screen.findByRole("textbox", {
      name: /Footage routing/i,
    });
    await user.clear(routing);
    await user.type(routing, "pixabay");
    await user.click(screen.getByRole("button", { name: "Save channel" }));

    expect(
      await screen.findByText(/Channel "history" no longer exists/),
    ).toBeInTheDocument();
    expect(upsert).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
