export type HubKey =
  | "channels"
  | "actions"
  | "overview"
  | "characters"
  | "ideas"
  | "runs"
  | "review"
  | "reveal";
export type WorkspaceTab = "production" | "character" | "guidelines" | "cost";
export type AppScope =
  | { kind: "hub"; hub: HubKey }
  | { kind: "workspace"; channel: string; tab: WorkspaceTab };

export const HUB_KEYS = [
  "channels",
  "actions",
  "overview",
  "characters",
  "ideas",
  "runs",
  "review",
  "reveal",
] as const satisfies readonly HubKey[];
export const WORKSPACE_TABS = [
  "production",
  "character",
  "guidelines",
  "cost",
] as const satisfies readonly WorkspaceTab[];
export const DEFAULT_HUB: HubKey = "channels";
export const DEFAULT_TAB: WorkspaceTab = "production";

type ParseScopeOptions = {
  knownChannels?: string[];
};

export function isHubKey(value: string | null): value is HubKey {
  return value !== null && HUB_KEYS.includes(value as HubKey);
}

export function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return value !== null && WORKSPACE_TABS.includes(value as WorkspaceTab);
}

export function parseScope(
  search: string,
  opts: ParseScopeOptions = {},
): { scope: AppScope; canonicalize: boolean } {
  const query = normalizeSearch(search);
  const params = new URLSearchParams(query);
  const defaultScope: AppScope = { kind: "hub", hub: DEFAULT_HUB };

  if (params.has("view")) {
    return { scope: defaultScope, canonicalize: true };
  }

  if (query === "") {
    return { scope: defaultScope, canonicalize: true };
  }

  const hasHub = params.has("hub");
  const hasChannel = params.has("channel");

  if (!hasHub && !hasChannel) {
    return { scope: defaultScope, canonicalize: true };
  }

  const channel = params.get("channel");
  if (channel !== null && channel !== "") {
    if (opts.knownChannels !== undefined && !opts.knownChannels.includes(channel)) {
      return { scope: defaultScope, canonicalize: true };
    }

    const tabParam = params.get("tab");
    const tab = isWorkspaceTab(tabParam) ? tabParam : DEFAULT_TAB;
    const scope: AppScope = { kind: "workspace", channel, tab };

    return {
      scope,
      canonicalize: params.toString() !== canonicalQuery(scope),
    };
  }

  const hub = params.get("hub");
  if (hub !== null) {
    if (!isHubKey(hub)) {
      return { scope: defaultScope, canonicalize: true };
    }

    const scope: AppScope = { kind: "hub", hub };
    return {
      scope,
      canonicalize: params.toString() !== canonicalQuery(scope),
    };
  }

  return { scope: defaultScope, canonicalize: true };
}

export function scopeToSearch(scope: AppScope): string {
  const params = new URLSearchParams();

  if (scope.kind === "hub") {
    params.set("hub", scope.hub);
  } else {
    params.set("channel", scope.channel);
    params.set("tab", scope.tab);
  }

  return `?${params.toString()}`;
}

export function scopeToUrl(scope: AppScope, pathname: string, hash?: string): string {
  return `${pathname}${scopeToSearch(scope)}${hash ?? ""}`;
}

export function scopesEqual(a: AppScope, b: AppScope): boolean {
  if (a.kind === "hub" && b.kind === "hub") {
    return a.hub === b.hub;
  }

  if (a.kind === "workspace" && b.kind === "workspace") {
    return a.channel === b.channel && a.tab === b.tab;
  }

  return false;
}

export function isSameScope(search: string, scope: AppScope): boolean {
  const parsed = parseScope(search);
  return !parsed.canonicalize && scopesEqual(parsed.scope, scope);
}

function normalizeSearch(search: string): string {
  return search.startsWith("?") ? search.slice(1) : search;
}

function canonicalQuery(scope: AppScope): string {
  return scopeToSearch(scope).slice(1);
}
