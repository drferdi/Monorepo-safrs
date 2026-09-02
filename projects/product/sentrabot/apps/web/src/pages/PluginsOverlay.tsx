import { Trans, useLingui } from "@lingui/react/macro";
import type {
  AgentSkill,
  CapabilityInstall,
  ConnectionCatalogItem,
  McpServer,
} from "@sentrabot/contracts";
import {
  abortableDelay,
  buildFeaturedConnectorTiles,
  deriveMcpSlug,
  EMPTY_PLUGIN_CATALOG_MESSAGE,
  matchFeaturedConnectorId,
} from "@sentrabot/core";
import { Button } from "@sentrabot/ui-web";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORY_ORDER,
  CONNECTOR_META,
  type DirectoryCategory,
  MCP_DIRECTORY,
  type McpDirectoryEntry,
  normalizeDirectoryKey,
  SKILL_LIBRARY,
  type SkillLibraryEntry,
} from "../lib/integration-directory";
import { connectMcpOauth, MCP_OAUTH_CHANNEL } from "../lib/mcp-connect";
import { rpc } from "../lib/rpc";

type SourceKind = "treg" | "mcp" | "api";

type SkillRow = Pick<AgentSkill, "id" | "name" | "description" | "source" | "readOnly">;

function itemKey(item: Pick<ConnectionCatalogItem, "connectorId" | "slug">) {
  return `${item.connectorId}:${item.slug}`;
}

function markConnected(
  items: ConnectionCatalogItem[],
  connectorId: string,
  slug: string,
  connected: boolean,
) {
  return items.map((entry) =>
    entry.connectorId === connectorId && entry.slug === slug ? { ...entry, connected } : entry,
  );
}

function normalizeEndpoint(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\/+$/, "");
}

function connectorMeta(item: ConnectionCatalogItem) {
  return (
    CONNECTOR_META[normalizeDirectoryKey(item.slug)] ??
    CONNECTOR_META[normalizeDirectoryKey(item.name)]
  );
}

const AVATAR_COLORS = ["#30356A", "#4A2E5C", "#2E4A3C", "#5C452E", "#2E3F5C", "#5C2E33"];

function avatarColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? "#30356A";
}

type Tile =
  | { kind: "connector"; key: string; item: ConnectionCatalogItem; description?: string }
  | { kind: "mcp"; key: string; entry: McpDirectoryEntry; server?: McpServer }
  | { kind: "skill"; key: string; entry: SkillLibraryEntry; installed?: SkillRow };

function TileAvatar({ name, logo }: { name: string; logo?: string | null }) {
  if (logo) {
    return (
      <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-xl bg-[#2C2C30] object-contain" />
    );
  }
  return (
    <div
      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-semibold text-[#ECECEE]"
      style={{ backgroundColor: avatarColor(name) }}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}

export function PluginsOverlay({
  onClose,
  onOpenMcp,
  activeBotId,
}: {
  onClose: () => void;
  onOpenMcp?: () => void;
  activeBotId?: string;
}) {
  const { t } = useLingui();
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<ConnectionCatalogItem[]>([]);
  const [sources, setSources] = useState<CapabilityInstall[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [sourceKind, setSourceKind] = useState<SourceKind | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [credential, setCredential] = useState("");
  const [authType, setAuthType] = useState<"none" | "bearer" | "header">("bearer");
  const [authName, setAuthName] = useState("x-api-key");
  const [pending, setPending] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const connectionAttempt = useRef<AbortController | null>(null);

  async function refresh() {
    const [items, installs, servers, skillRows] = await Promise.all([
      rpc.connections.catalog({}),
      rpc.capabilities.list(),
      rpc.mcp.servers.list().catch(() => [] as McpServer[]),
      rpc.agentSkills.list().catch(() => [] as SkillRow[]),
    ]);
    setCatalog(items);
    setSources(installs.filter((install) => install.kind === "mcp" || install.kind === "api"));
    setMcpServers(servers);
    setSkills(skillRows);
    return items;
  }

  useEffect(() => {
    void refresh()
      .catch((err: unknown) =>
        setCatalogError(err instanceof Error ? err.message : t`Could not load integrations`),
      )
      .finally(() => setLoading(false));
    return () => connectionAttempt.current?.abort();
  }, []);

  useEffect(() => {
    // BroadcastChannel instead of window.opener messaging: provider login
    // pages with COOP sever the opener link, but the channel is origin-scoped
    // and unaffected.
    const channel = new BroadcastChannel(MCP_OAUTH_CHANNEL);
    channel.onmessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | null)?.type !== "mcp-oauth-complete") return;
      setPending(null);
      void refresh().catch(() => undefined);
    };
    return () => channel.close();
  }, []);

  const featuredTiles = useMemo(() => buildFeaturedConnectorTiles(catalog), [catalog]);
  const showFeatured = !query.trim();

  const catalogNameKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of catalog) {
      keys.add(normalizeDirectoryKey(item.slug));
      keys.add(normalizeDirectoryKey(item.name));
    }
    return keys;
  }, [catalog]);

  const connectorTiles = useMemo<Extract<Tile, { kind: "connector" }>[]>(
    () =>
      catalog
        .filter(
          (item) =>
            matchFeaturedConnectorId(item.slug) === null &&
            matchFeaturedConnectorId(item.name) === null,
        )
        .map((item) => ({
          kind: "connector" as const,
          key: itemKey(item),
          item,
          description: connectorMeta(item)?.description,
        })),
    [catalog],
  );

  const mcpTiles = useMemo<Extract<Tile, { kind: "mcp" }>[]>(
    () =>
      MCP_DIRECTORY.filter((entry) => !catalogNameKeys.has(normalizeDirectoryKey(entry.name))).map(
        (entry) => {
          const wanted = normalizeEndpoint(entry.endpoint);
          const slug = deriveMcpSlug(entry.name);
          const server =
            mcpServers.find((row) => normalizeEndpoint(row.endpoint) === wanted) ??
            mcpServers.find((row) => row.slug === slug);
          return { kind: "mcp" as const, key: `mcp:${entry.id}`, entry, server };
        },
      ),
    [catalogNameKeys, mcpServers],
  );

  const skillTiles = useMemo<Extract<Tile, { kind: "skill" }>[]>(
    () =>
      SKILL_LIBRARY.map((entry) => ({
        kind: "skill" as const,
        key: `skill:${entry.id}`,
        entry,
        installed: skills.find((row) => row.name.toLowerCase() === entry.name.toLowerCase()),
      })),
    [skills],
  );

  const needle = query.trim().toLowerCase();

  const searchResults = useMemo<Tile[]>(() => {
    if (!needle) return [];
    const connectorMatches: Tile[] = catalog
      .filter(
        (item) =>
          item.name.toLowerCase().includes(needle) ||
          item.slug.toLowerCase().includes(needle) ||
          item.connectorId.toLowerCase().includes(needle),
      )
      .map((item) => ({
        kind: "connector" as const,
        key: itemKey(item),
        item,
        description: connectorMeta(item)?.description,
      }));
    const mcpMatches = mcpTiles.filter(
      (tile) =>
        tile.entry.name.toLowerCase().includes(needle) ||
        tile.entry.description.toLowerCase().includes(needle),
    );
    const skillMatches = skillTiles.filter(
      (tile) =>
        tile.entry.name.toLowerCase().includes(needle) ||
        tile.entry.description.toLowerCase().includes(needle),
    );
    return [...connectorMatches, ...mcpMatches, ...skillMatches];
  }, [needle, catalog, mcpTiles, skillTiles]);

  const categorySections = useMemo(() => {
    const byCategory = new Map<DirectoryCategory | "apps", Tile[]>();
    const push = (category: DirectoryCategory | "apps", tile: Tile) => {
      const list = byCategory.get(category) ?? [];
      list.push(tile);
      byCategory.set(category, list);
    };
    for (const tile of connectorTiles) {
      push(connectorMeta(tile.item)?.category ?? "apps", tile);
    }
    for (const tile of mcpTiles) push(tile.entry.category, tile);
    return byCategory;
  }, [connectorTiles, mcpTiles]);

  async function notifyAppConnected(item: ConnectionCatalogItem) {
    if (!activeBotId) return;
    await rpc.onboarding
      .appConnected({ botId: activeBotId, provider: item.slug })
      .catch(() => undefined);
  }

  function setItemConnected(item: ConnectionCatalogItem, connected: boolean) {
    setCatalog((prev) => markConnected(prev, item.connectorId, item.slug, connected));
  }

  async function connect(item: ConnectionCatalogItem) {
    connectionAttempt.current?.abort();
    const controller = new AbortController();
    connectionAttempt.current = controller;
    setCatalogError(null);
    const key = itemKey(item);
    setPending(key);
    try {
      const started = await rpc.connections.begin({
        connectorId: item.connectorId,
        provider: item.slug,
        displayName: item.name,
      });
      if (started.authorizationUrl)
        window.open(started.authorizationUrl, "_blank", "noopener,noreferrer");
      if (item.noAuth && !started.authorizationUrl) {
        if (controller.signal.aborted) return;
        setItemConnected(item, true);
        void notifyAppConnected(item);
        return;
      }
      for (let i = 0; i < 45; i += 1) {
        if (controller.signal.aborted) return;
        const row = await rpc.connections
          .complete({ connectionId: started.connectionId })
          .catch(() => undefined);
        if (row?.status === "connected") {
          if (controller.signal.aborted) return;
          setItemConnected(item, true);
          void notifyAppConnected(item);
          return;
        }
        await abortableDelay(2_000, controller.signal);
      }
      if (controller.signal.aborted) return;
      setCatalogError(
        t`Connection to ${item.name} is still pending. You can close this and check again.`,
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      setCatalogError(err instanceof Error ? err.message : t`Could not connect`);
    } finally {
      if (connectionAttempt.current === controller) {
        connectionAttempt.current = null;
        setPending(null);
      }
    }
  }

  async function revoke(item: ConnectionCatalogItem) {
    setCatalogError(null);
    const key = itemKey(item);
    setPending(key);
    try {
      const rows = await rpc.connections.list();
      const matches = rows.filter(
        (entry) => entry.connectorId === item.connectorId && entry.provider === item.slug,
      );
      const row =
        matches.find((entry) => entry.status === "connected") ??
        matches.find((entry) => entry.status === "pending") ??
        matches.find((entry) => entry.status === "error");
      if (!row) throw new Error(t`No connection record found for ${item.name}.`);
      await rpc.connections.revoke({ connectionId: row.id });
      setItemConnected(item, false);
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : t`Could not revoke connection`);
    } finally {
      setPending(null);
    }
  }

  async function installMcp(tile: Extract<Tile, { kind: "mcp" }>) {
    setCatalogError(null);
    setPending(tile.key);
    try {
      const base = {
        slug: deriveMcpSlug(tile.entry.name),
        name: tile.entry.name,
        endpoint: tile.entry.endpoint,
        headers: {},
        enabled: true,
      };
      const created =
        tile.entry.transport === "sse"
          ? await rpc.mcp.servers.create({ ...base, transport: "sse" })
          : await rpc.mcp.servers.create({ ...base, transport: "streamable_http" });
      if (activeBotId) {
        // replace() overwrites the bot's whole list, so merge with what it already has.
        const assignments = await rpc.mcp.assignments.all();
        const existing = assignments.filter(
          (entry) => entry.botId === activeBotId && entry.serverId !== created.id,
        );
        await rpc.mcp.assignments
          .replace({
            botId: activeBotId,
            assignments: [
              ...existing.map((entry) => ({
                serverId: entry.serverId,
                allowAllTools: entry.allowAllTools,
                allowedTools: entry.allowedTools,
              })),
              { serverId: created.id, allowAllTools: true, allowedTools: [] },
            ],
          })
          .catch(() => undefined);
      }
      await refresh();
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : t`Could not install MCP server`);
    } finally {
      setPending(null);
    }
  }

  async function connectMcp(server: McpServer, key: string) {
    setCatalogError(null);
    setPending(key);
    try {
      const result = await connectMcpOauth(server.id);
      if (result !== "cancelled") setPending(null);
      await refresh();
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : t`Could not start OAuth`);
      setPending(null);
    }
  }

  async function removeMcp(server: McpServer, key: string) {
    setCatalogError(null);
    setPending(key);
    try {
      await rpc.mcp.servers.remove({ id: server.id });
      await refresh();
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : t`Could not remove MCP server`);
    } finally {
      setPending(null);
    }
  }

  async function installSkill(tile: Extract<Tile, { kind: "skill" }>) {
    setCatalogError(null);
    setPending(tile.key);
    try {
      await rpc.agentSkills.create({ content: tile.entry.content });
      await refresh();
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : t`Could not install skill`);
    } finally {
      setPending(null);
    }
  }

  async function removeSkill(tile: Extract<Tile, { kind: "skill" }>) {
    if (!tile.installed || tile.installed.readOnly) return;
    setCatalogError(null);
    setPending(tile.key);
    try {
      await rpc.agentSkills.remove({ skillId: tile.installed.id });
      await refresh();
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : t`Could not remove skill`);
    } finally {
      setPending(null);
    }
  }

  function renderConnectorTile(tile: Extract<Tile, { kind: "connector" }>) {
    const { item } = tile;
    const key = tile.key;
    return (
      <div key={key} className="flex min-w-0 items-center gap-3 rounded-[13px] px-2.5 py-2">
        <TileAvatar name={item.name} logo={item.logo} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium text-[#ECECEE]">{item.name}</div>
          {tile.description ? (
            <div className="truncate text-[12.5px] text-[#85858B]">{tile.description}</div>
          ) : null}
        </div>
        <Button
          type="button"
          variant="pill"
          size="sm"
          disabled={pending === key}
          onClick={() => void (item.connected ? revoke(item) : connect(item))}
        >
          {pending === key ? (
            item.connected ? (
              <Trans>Removing…</Trans>
            ) : (
              <Trans>Adding…</Trans>
            )
          ) : item.connected ? (
            <Trans>Remove</Trans>
          ) : (
            <Trans>Add</Trans>
          )}
        </Button>
      </div>
    );
  }

  function renderMcpTile(tile: Extract<Tile, { kind: "mcp" }>) {
    const { entry, server, key } = tile;
    const needsOauth = server && entry.auth === "oauth" && server.oauthStatus !== "connected";
    return (
      <div key={key} className="flex min-w-0 items-center gap-3 rounded-[13px] px-2.5 py-2">
        <TileAvatar name={entry.name} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium text-[#ECECEE]">{entry.name}</div>
          <div className="truncate text-[12.5px] text-[#85858B]">{entry.description}</div>
        </div>
        {!server ? (
          <Button
            type="button"
            variant="pill"
            size="sm"
            disabled={pending === key}
            onClick={() => void installMcp(tile)}
          >
            {pending === key ? <Trans>Installing…</Trans> : <Trans>Install</Trans>}
          </Button>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5">
            {needsOauth ? (
              <Button
                type="button"
                variant="pill"
                size="sm"
                disabled={pending === key}
                onClick={() => void connectMcp(server, key)}
              >
                {pending === key ? <Trans>Connecting…</Trans> : <Trans>Connect</Trans>}
              </Button>
            ) : (
              <span className="text-[12px] text-[#7BAF7F]">
                <Trans>Installed</Trans>
              </span>
            )}
            <Button
              type="button"
              variant="pill"
              size="sm"
              disabled={pending === key}
              onClick={() => void removeMcp(server, key)}
            >
              <Trans>Remove</Trans>
            </Button>
          </div>
        )}
      </div>
    );
  }

  function renderSkillTile(tile: Extract<Tile, { kind: "skill" }>) {
    const { entry, installed, key } = tile;
    return (
      <div key={key} className="flex min-w-0 items-center gap-3 rounded-[13px] px-2.5 py-2">
        <TileAvatar name={entry.name} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium text-[#ECECEE]">{entry.name}</div>
          <div className="truncate text-[12.5px] text-[#85858B]">{entry.description}</div>
        </div>
        {!installed ? (
          <Button
            type="button"
            variant="pill"
            size="sm"
            disabled={pending === key}
            onClick={() => void installSkill(tile)}
          >
            {pending === key ? <Trans>Installing…</Trans> : <Trans>Install</Trans>}
          </Button>
        ) : installed.readOnly ? (
          <span className="text-[12px] text-[#7BAF7F]">
            <Trans>Installed</Trans>
          </span>
        ) : (
          <Button
            type="button"
            variant="pill"
            size="sm"
            disabled={pending === key}
            onClick={() => void removeSkill(tile)}
          >
            {pending === key ? <Trans>Removing…</Trans> : <Trans>Remove</Trans>}
          </Button>
        )}
      </div>
    );
  }

  function renderTile(tile: Tile) {
    if (tile.kind === "connector") return renderConnectorTile(tile);
    if (tile.kind === "mcp") return renderMcpTile(tile);
    return renderSkillTile(tile);
  }

  function sectionHeader(category: DirectoryCategory | "apps") {
    switch (category) {
      case "productivity":
        return <Trans>Productivity</Trans>;
      case "developer":
        return <Trans>Developer</Trans>;
      case "payments":
        return <Trans>Payments</Trans>;
      case "creativity":
        return <Trans>Creativity</Trans>;
      case "knowledge":
        return <Trans>Knowledge</Trans>;
      default:
        return <Trans>More apps</Trans>;
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(4,4,5,.62)] p-10">
      <div className="flex h-[760px] w-[1080px] max-w-full flex-col overflow-hidden rounded-[26px] border border-[#232326] bg-[#141416] shadow-[0_40px_90px_rgba(0,0,0,.55)]">
        <div className="flex items-start justify-between px-8 pt-7">
          <div className="text-2xl font-medium text-[#F1F1F2]">
            <Trans>Integrations</Trans>
          </div>
          <button
            type="button"
            aria-label={t`Close integrations`}
            onClick={onClose}
            className="text-[#85858A]"
          >
            ✕
          </button>
        </div>

        <div className="px-8 pt-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t`Search apps`}
            placeholder={t`Search apps`}
            className="w-full rounded-full border border-[#26262A] bg-[#101012] px-5 py-3 text-[15px] text-[#ECECEE] outline-none"
          />
        </div>

        <div id="integration-list" className="rk-scroll flex-1 overflow-y-auto px-8 py-6">
          {catalogError ? <p className="mb-4 text-sm text-[#C94244]">{catalogError}</p> : null}
          {loading ? (
            <p className="text-[#6C6C70]">
              <Trans>Loading integrations…</Trans>
            </p>
          ) : null}

          {showFeatured ? (
            <div className="mb-8" data-testid="featured-connectors">
              <div className="mb-2 text-[13px] font-medium text-[#85858B]">
                <Trans>Popular</Trans>
              </div>
              {!loading && catalog.length === 0 ? (
                <p className="text-[13.5px] leading-6 text-[#6C6C70]">
                  {EMPTY_PLUGIN_CATALOG_MESSAGE}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {featuredTiles.map((tile) => {
                    const item = tile.item;
                    const key = item ? itemKey(item) : tile.id;
                    const disabled = tile.missing || !item;
                    const connected = item?.connected ?? false;
                    const description =
                      CONNECTOR_META[normalizeDirectoryKey(tile.label)]?.description;
                    return (
                      <div
                        key={key}
                        className={`flex min-w-0 items-center gap-3 rounded-[13px] px-2.5 py-2 ${
                          disabled ? "opacity-70" : ""
                        }`}
                      >
                        <TileAvatar name={tile.label} logo={item?.logo} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-medium text-[#ECECEE]">
                            {tile.label}
                          </div>
                          {disabled ? (
                            <div className="truncate text-[12.5px] text-[#707077]">
                              <Trans>Not in the plugin catalog</Trans>
                            </div>
                          ) : description ? (
                            <div className="truncate text-[12.5px] text-[#85858B]">
                              {description}
                            </div>
                          ) : null}
                        </div>
                        {item && !tile.missing ? (
                          <Button
                            type="button"
                            variant="pill"
                            size="sm"
                            disabled={pending === key}
                            onClick={() => void (connected ? revoke(item) : connect(item))}
                          >
                            {pending === key ? (
                              connected ? (
                                <Trans>Removing…</Trans>
                              ) : (
                                <Trans>Adding…</Trans>
                              )
                            ) : connected ? (
                              <Trans>Remove</Trans>
                            ) : (
                              <Trans>Add</Trans>
                            )}
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {!loading && catalog.length === 0 && !showFeatured ? (
            <p className="text-[#6C6C70]">
              <Trans>No managed app catalog is configured on this deployment.</Trans>
            </p>
          ) : null}
          {needle && searchResults.length === 0 && !loading ? (
            <p className="text-[#6C6C70]">
              <Trans>No apps match your search.</Trans>
            </p>
          ) : null}

          {needle && searchResults.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">{searchResults.map(renderTile)}</div>
          ) : null}

          {showFeatured
            ? [...CATEGORY_ORDER, "apps" as const].map((category) => {
                const tiles = categorySections.get(category);
                if (!tiles || tiles.length === 0) return null;
                return (
                  <div key={category} className="mb-8">
                    <div className="mb-2 text-[13px] font-medium text-[#85858B]">
                      {sectionHeader(category)}
                    </div>
                    <div className="grid grid-cols-2 gap-2">{tiles.map(renderTile)}</div>
                  </div>
                );
              })
            : null}

          {showFeatured && skillTiles.length > 0 ? (
            <div className="mb-4" data-testid="skill-library">
              <div className="mb-2 text-[13px] font-medium text-[#85858B]">
                <Trans>Skills</Trans>
              </div>
              <p className="mb-3 text-[12.5px] text-[#6C6C70]">
                <Trans>
                  Reusable SKILL.md playbooks your agents follow. Install one and invoke it with
                  /Name in the composer.
                </Trans>
              </p>
              <div className="grid grid-cols-2 gap-2">{skillTiles.map(renderTile)}</div>
            </div>
          ) : null}

          <details
            data-testid="integrations-advanced"
            className="group mt-8"
            onToggle={(event) => {
              if (!(event.currentTarget as HTMLDetailsElement).open) {
                setSourceKind(null);
                setSourceError(null);
                setSourceName("");
                setSourceUrl("");
                setCredential("");
                setAuthType("none");
                setAuthName("x-api-key");
              }
            }}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] text-[#85858A]">
              <span className="text-[#85858A]">
                <Trans>Advanced</Trans>
              </span>
              <span aria-hidden="true" className="transition-transform group-open:rotate-90">
                ›
              </span>
            </summary>

            <div className="mt-4 space-y-4">
              {onOpenMcp ? (
                <button
                  type="button"
                  onClick={onOpenMcp}
                  className="rounded-full border border-[#383844] px-3 py-1.5 text-xs text-[#C9C9CE] hover:bg-[#232327]"
                >
                  <Trans>MCP servers</Trans>
                </button>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="pill" size="sm" onClick={() => beginSource("mcp")}>
                  <Trans>Add MCP server</Trans>
                </Button>
                <Button type="button" variant="pill" size="sm" onClick={() => beginSource("api")}>
                  <Trans>Add OpenAPI</Trans>
                </Button>
                <Button type="button" variant="pill" size="sm" onClick={() => beginSource("treg")}>
                  <Trans>Add Treg</Trans>
                </Button>
              </div>

              {sourceError ? <p className="text-sm text-[#C94244]">{sourceError}</p> : null}

              {sourceKind ? (
                <div className="space-y-3 rounded-[16px] border border-[#2C2C30] bg-[#101012] p-5">
                  <div className="text-base font-medium text-[#ECECEE]">
                    {sourceKind === "treg" ? (
                      <Trans>Connect Treg</Trans>
                    ) : sourceKind === "mcp" ? (
                      <Trans>Add remote MCP server</Trans>
                    ) : (
                      <Trans>Import OpenAPI JSON</Trans>
                    )}
                  </div>
                  <input
                    value={sourceName}
                    onChange={(event) => setSourceName(event.target.value)}
                    placeholder={t`Display name`}
                    className="w-full rounded-xl border border-[#2C2C30] bg-[#171719] px-3 py-2.5 text-sm text-[#ECECEE] outline-none"
                  />
                  {sourceKind !== "treg" ? (
                    <input
                      value={sourceUrl}
                      onChange={(event) => setSourceUrl(event.target.value)}
                      placeholder={
                        sourceKind === "mcp"
                          ? "https://example.com/mcp"
                          : "https://example.com/openapi.json"
                      }
                      className="w-full rounded-xl border border-[#2C2C30] bg-[#171719] px-3 py-2.5 text-sm text-[#ECECEE] outline-none"
                    />
                  ) : null}
                  {sourceKind !== "treg" ? (
                    <select
                      value={authType}
                      onChange={(event) => setAuthType(event.target.value as typeof authType)}
                      className="w-full rounded-xl border border-[#2C2C30] bg-[#171719] px-3 py-2.5 text-sm text-[#ECECEE] outline-none"
                    >
                      <option value="none">
                        <Trans>No authentication</Trans>
                      </option>
                      <option value="bearer">
                        <Trans>Bearer token</Trans>
                      </option>
                      <option value="header">
                        <Trans>API key header</Trans>
                      </option>
                    </select>
                  ) : null}
                  {authType === "header" && sourceKind !== "treg" ? (
                    <input
                      value={authName}
                      onChange={(event) => setAuthName(event.target.value)}
                      placeholder={t`Header name`}
                      className="w-full rounded-xl border border-[#2C2C30] bg-[#171719] px-3 py-2.5 text-sm text-[#ECECEE] outline-none"
                    />
                  ) : null}
                  {sourceKind === "treg" || authType !== "none" ? (
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={credential}
                      onChange={(event) => setCredential(event.target.value)}
                      placeholder={sourceKind === "treg" ? t`Treg token` : t`Credential`}
                      className="w-full rounded-xl border border-[#2C2C30] bg-[#171719] px-3 py-2.5 text-sm text-[#ECECEE] outline-none"
                    />
                  ) : null}
                  <p className="text-xs leading-5 text-[#707077]">
                    <Trans>
                      Sentra Bot verifies the source before saving it. Credentials are encrypted and
                      are never returned to clients or exposed to the model.
                    </Trans>
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="pill"
                      size="sm"
                      disabled={pending === "install-source"}
                      onClick={() => void installSource()}
                    >
                      {pending === "install-source" ? (
                        <Trans>Verifying…</Trans>
                      ) : (
                        <Trans>Verify and add</Trans>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="pill"
                      size="sm"
                      onClick={() => setSourceKind(null)}
                    >
                      <Trans>Cancel</Trans>
                    </Button>
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-3 text-sm font-medium text-[#A8A8AD]">
                  <Trans>Tool sources</Trans>
                </div>
                {sources.length === 0 && !sourceKind ? (
                  <p className="text-[#6C6C70]">
                    <Trans>No MCP or API tool sources installed yet.</Trans>
                  </p>
                ) : null}
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center gap-4 rounded-[13px] px-3 py-2.5"
                  >
                    <div className="grid h-[42px] w-[42px] place-items-center rounded-xl bg-[#2C2C30] font-semibold uppercase text-[#ECECEE]">
                      {source.kind === "mcp" ? "M" : "A"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15.5px] font-medium text-[#ECECEE]">{source.name}</div>
                      <div className="truncate text-[13.5px] text-[#7A7A80]">
                        {source.kind.toUpperCase()} · {source.source} ·{" "}
                        {source.secretConfigured ? (
                          <Trans>credential saved</Trans>
                        ) : (
                          <Trans>no auth</Trans>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="pill"
                      size="sm"
                      disabled={pending === source.id}
                      onClick={() => void removeSource(source)}
                    >
                      {pending === source.id ? <Trans>Removing…</Trans> : <Trans>Remove</Trans>}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );

  function beginSource(kind: SourceKind) {
    setSourceKind(kind);
    setSourceError(null);
    setSourceName(kind === "treg" ? "Treg" : "");
    setSourceUrl(kind === "treg" ? "https://treg.to/mcp/" : "");
    setCredential("");
    setAuthType(kind === "treg" ? "bearer" : "none");
    setAuthName("x-api-key");
  }

  async function installSource() {
    if (!sourceKind) return;
    setSourceError(null);
    setPending("install-source");
    try {
      const auth = {
        type: authType,
        ...(authType === "header" ? { name: authName.trim() } : {}),
      };
      await rpc.capabilities.install({
        kind: sourceKind === "api" ? "api" : "mcp",
        name: sourceName.trim() || (sourceKind === "treg" ? "Treg" : "Custom connector"),
        source: sourceUrl.trim(),
        credential: credential.trim() || undefined,
        config:
          sourceKind === "treg"
            ? { preset: "treg", auth: { type: "bearer" } }
            : sourceKind === "api"
              ? { openApi: true, auth }
              : { preset: "custom", auth },
      });
      setCredential("");
      setSourceKind(null);
      await refresh();
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : t`Could not install connector`);
    } finally {
      setPending(null);
    }
  }

  async function removeSource(install: CapabilityInstall) {
    setPending(install.id);
    setSourceError(null);
    try {
      await rpc.capabilities.remove({ id: install.id });
      setSources((current) => current.filter((source) => source.id !== install.id));
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : t`Could not remove connector`);
    } finally {
      setPending(null);
    }
  }
}
