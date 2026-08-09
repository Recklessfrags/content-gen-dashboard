import { describe, expect, it } from "vitest";
import {
  DEFAULT_HUB,
  DEFAULT_TAB,
  parseScope,
  scopesEqual,
  scopeToSearch,
  scopeToUrl,
  isSameScope,
  type AppScope,
} from "@/lib/route";

const defaultHubScope: AppScope = { kind: "hub", hub: DEFAULT_HUB };

describe("parseScope", () => {
  it("canonicalizes bare searches to the channels hub", () => {
    expect(parseScope("")).toEqual({ scope: defaultHubScope, canonicalize: true });
    expect(parseScope("?")).toEqual({ scope: defaultHubScope, canonicalize: true });
  });

  it("redirects legacy view params to the channels hub", () => {
    expect(parseScope("?view=queue")).toEqual({ scope: defaultHubScope, canonicalize: true });
    expect(parseScope("?view=runs")).toEqual({ scope: defaultHubScope, canonicalize: true });
  });

  it("parses valid hubs and canonicalizes invalid hub values", () => {
    expect(parseScope("?hub=channels")).toEqual({
      scope: { kind: "hub", hub: "channels" },
      canonicalize: false,
    });
    expect(parseScope("?hub=actions")).toEqual({ scope: defaultHubScope, canonicalize: true });
    expect(parseScope("?hub=overview")).toEqual({
      scope: { kind: "hub", hub: "overview" },
      canonicalize: false,
    });
    expect(parseScope("?hub=characters")).toEqual({
      scope: { kind: "hub", hub: "characters" },
      canonicalize: false,
    });
    expect(parseScope("?hub=ideas")).toEqual({
      scope: { kind: "hub", hub: "ideas" },
      canonicalize: false,
    });
    expect(parseScope("?hub=runs")).toEqual({
      scope: { kind: "hub", hub: "runs" },
      canonicalize: false,
    });
    expect(parseScope("?hub=review")).toEqual({
      scope: { kind: "hub", hub: "review" },
      canonicalize: false,
    });
    expect(parseScope("?hub=reveal")).toEqual({
      scope: { kind: "hub", hub: "reveal" },
      canonicalize: false,
    });
    expect(parseScope("?hub=bogus")).toEqual({ scope: defaultHubScope, canonicalize: true });
  });

  it("defaults missing workspace tab to production and canonicalizes", () => {
    expect(parseScope("?channel=weird_food")).toEqual({
      scope: { kind: "workspace", channel: "weird_food", tab: DEFAULT_TAB },
      canonicalize: true,
    });
  });

  it("parses valid workspace tabs", () => {
    expect(parseScope("?channel=weird_food&tab=cost")).toEqual({
      scope: { kind: "workspace", channel: "weird_food", tab: "cost" },
      canonicalize: false,
    });
  });

  it("defaults invalid workspace tab to production and canonicalizes", () => {
    expect(parseScope("?channel=weird_food&tab=bogus")).toEqual({
      scope: { kind: "workspace", channel: "weird_food", tab: DEFAULT_TAB },
      canonicalize: true,
    });
  });

  it("redirects unknown channels to the channels hub when known channels are provided", () => {
    expect(parseScope("?channel=ghost&tab=cost", { knownChannels: ["weird_food"] })).toEqual({
      scope: defaultHubScope,
      canonicalize: true,
    });
  });
});

describe("scope serialization", () => {
  it("round-trips a channel codename with spaces and special characters", () => {
    const scope: AppScope = {
      kind: "workspace",
      channel: "weird food/tea & cake",
      tab: "guidelines",
    };

    const search = scopeToSearch(scope);

    expect(search).toBe("?channel=weird+food%2Ftea+%26+cake&tab=guidelines");
    expect(parseScope(search, { knownChannels: [scope.channel] })).toEqual({
      scope,
      canonicalize: false,
    });
  });

  it("is idempotent for canonical hub and workspace scopes", () => {
    const scopes: AppScope[] = [
      { kind: "hub", hub: "overview" },
      { kind: "hub", hub: "review" },
      { kind: "hub", hub: "reveal" },
      { kind: "workspace", channel: "weird_food", tab: "character" },
    ];

    for (const scope of scopes) {
      expect(parseScope(scopeToSearch(scope), { knownChannels: ["weird_food"] })).toEqual({
        scope,
        canonicalize: false,
      });
    }
  });

  it("builds a URL with pathname, canonical search, and optional hash", () => {
    expect(scopeToUrl({ kind: "hub", hub: "review" }, "/control", "#queue")).toBe(
      "/control?hub=review#queue",
    );
  });
});

describe("scope comparison helpers", () => {
  it("compares scopes deeply", () => {
    expect(scopesEqual({ kind: "hub", hub: "channels" }, { kind: "hub", hub: "channels" })).toBe(
      true,
    );
    expect(scopesEqual({ kind: "hub", hub: "channels" }, { kind: "hub", hub: "review" })).toBe(
      false,
    );
    expect(
      scopesEqual(
        { kind: "workspace", channel: "weird_food", tab: "production" },
        { kind: "workspace", channel: "weird_food", tab: "production" },
      ),
    ).toBe(true);
    expect(
      scopesEqual(
        { kind: "workspace", channel: "weird_food", tab: "production" },
        { kind: "workspace", channel: "weird_food", tab: "cost" },
      ),
    ).toBe(false);
  });

  it("detects when a search already exactly expresses a scope", () => {
    expect(isSameScope("?hub=channels", { kind: "hub", hub: "channels" })).toBe(true);
    expect(isSameScope("?hub=channels&extra=1", { kind: "hub", hub: "channels" })).toBe(false);
    expect(
      isSameScope("?channel=weird_food", {
        kind: "workspace",
        channel: "weird_food",
        tab: "production",
      }),
    ).toBe(false);
    expect(
      isSameScope("?channel=weird_food&tab=production", {
        kind: "workspace",
        channel: "weird_food",
        tab: "production",
      }),
    ).toBe(true);
  });
});
