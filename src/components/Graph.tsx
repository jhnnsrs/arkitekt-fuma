// @ts-nocheck
"use client";

import "graphiql/style.css";
import "@graphiql/plugin-explorer/style.css";
import "./graphiql-theme.css";

import { explorerPlugin } from "@graphiql/plugin-explorer";
import { createGraphiQLFetcher, type Storage } from "@graphiql/toolkit";
import { GraphiQL } from "graphiql";
import { Loader2, LogIn, Network, ServerCog } from "lucide-react";
import { useTheme } from "next-themes";
import React from "react";
import { useForm } from "react-hook-form";

import { App } from "@/lib/app/App";
import { aliasToHttpPath } from "@/lib/arkitekt/alias/helpers";
import { discover } from "@/lib/arkitekt/fakts/discover";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const explorer = explorerPlugin({} as any);

/**
 * Namespace GraphiQL's persisted state (query, headers, tabs, …) per endpoint so
 * switching services doesn't clobber each other's history.
 */
export const buildStorage = (url: string): Storage => {
  const prepend = `graphiql:${url}.`;

  return {
    getItem: (key) => localStorage.getItem(`${prepend}.${key}`),
    setItem: (key, value) => localStorage.setItem(`${prepend}.${key}`, value),
    removeItem: (key) => localStorage.removeItem(`${prepend}.${key}`),
    clear: () => {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prepend)) localStorage.removeItem(key);
      }
    },
    get length() {
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prepend)) count++;
      }
      return count;
    },
  };
};

type ApiOption = {
  key: string;
  label: string;
  url: string;
};

const prettyLabel = (key: string) =>
  key.charAt(0).toUpperCase() + key.slice(1);

const Renderer = ({ url, token }: { url: string; token: string | null }) => {
  const { resolvedTheme } = useTheme();

  // Recreate the fetcher only when the endpoint or token changes.
  const fetcher = React.useMemo(
    () =>
      createGraphiQLFetcher({
        url,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    [url, token],
  );

  const storage = React.useMemo(() => buildStorage(url), [url]);

  return (
    <div className="arkitekt-graphiql h-full w-full">
      <GraphiQL
        // key forces a clean remount when the endpoint changes so the schema
        // re-introspects against the new server.
        key={url}
        fetcher={fetcher}
        storage={storage}
        plugins={[explorer]}
        forcedTheme={resolvedTheme === "light" ? "light" : "dark"}
        defaultQuery=""
      />
    </div>
  );
};

const ServiceSwitcher = ({
  options,
  value,
  onChange,
  deployment,
}: {
  options: ApiOption[];
  value: string;
  onChange: (url: string) => void;
  deployment?: string;
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-fd-border bg-fd-card/60 px-4 py-2.5">
      <div className="flex items-center gap-2 text-fd-foreground">
        <Network className="size-4 text-fd-primary" />
        <span className="text-sm font-medium">API Explorer</span>
      </div>
      {deployment && (
        <span className="hidden text-xs text-fd-muted-foreground sm:inline">
          on <span className="font-medium text-fd-foreground">{deployment}</span>
        </span>
      )}

      <div className="ms-auto flex flex-wrap items-center gap-1 rounded-lg bg-fd-muted p-1">
        {options.map((option) => {
          const active = option.url === value;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.url)}
              aria-pressed={active}
              className={cn(
                "cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-fd-primary text-fd-primary-foreground shadow-sm"
                  : "text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ExplorerInner = () => {
  const token = App.useToken();
  const fakts = App.useFakts();
  const available = App.useAvailableServices();
  const selfService = App.useSelfService();

  const options = React.useMemo<ApiOption[]>(() => {
    const built: ApiOption[] = [];

    // The user's own Arkitekt server (Lok) first, then every connected service.
    if (selfService?.alias) {
      built.push({
        key: "lok",
        label: fakts?.self?.deployment_name || "Lok",
        url: aliasToHttpPath(selfService.alias, "graphql"),
      });
    }

    for (const { key, service } of available) {
      if (!service?.alias) continue;
      built.push({
        key,
        label: prettyLabel(key),
        url: aliasToHttpPath(service.alias, "graphql"),
      });
    }

    // De-duplicate by endpoint in case the self service overlaps a listed one.
    const seen = new Set<string>();
    return built.filter((o) => (seen.has(o.url) ? false : seen.add(o.url)));
  }, [available, selfService, fakts]);

  const [selected, setSelected] = React.useState(() => options[0]?.url);

  // Keep the selection valid if the available services change.
  React.useEffect(() => {
    if (options.length && !options.some((o) => o.url === selected)) {
      setSelected(options[0].url);
    }
  }, [options, selected]);

  if (options.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-fd-muted-foreground">
        No GraphQL services are exposed by this Arkitekt instance.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ServiceSwitcher
        options={options}
        value={selected}
        onChange={setSelected}
        deployment={fakts?.self?.deployment_name}
      />
      <div className="min-h-0 flex-1">
        <Renderer url={selected} token={token?.access_token ?? null} />
      </div>
    </div>
  );
};

/**
 * Centered call-to-action shown when no Arkitekt instance is connected yet.
 * Mirrors the Connector's discover→connect flow but presented as a full panel.
 */
const ExplorerConnect = () => {
  const connect = App.useConnect();
  const [error, setError] = React.useState<string | null>(null);
  const [connecting, setConnecting] = React.useState(false);
  const form = useForm({ defaultValues: { url: "https://go.arkitekt.live" } });

  const handleConnect = (formData: { url: string }) => {
    setError(null);
    setConnecting(true);
    const controller = new AbortController();
    discover({ url: formData.url, timeout: 2000, controller })
      .then((endpoint) => connect({ endpoint, controller }))
      .catch((e) => setError(e.message))
      .finally(() => setConnecting(false));
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-fd-border bg-fd-card p-6 shadow-sm">
        <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-fd-primary/10 text-fd-primary">
          <ServerCog className="size-5" />
        </div>
        <h2 className="text-lg font-semibold text-fd-foreground">
          Connect to explore your API
        </h2>
        <p className="mt-1 text-sm text-fd-muted-foreground">
          The explorer talks to a live Arkitekt instance. Enter your server URL
          to introspect and query its GraphQL services.
        </p>

        <form
          onSubmit={form.handleSubmit(handleConnect)}
          className="mt-5 flex flex-col gap-3"
        >
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <p className="font-medium">Could not connect to the server</p>
              <p className="mt-1 break-words opacity-90">{error}</p>
            </div>
          )}
          <Input
            {...form.register("url")}
            type="text"
            autoFocus
            placeholder="https://go.arkitekt.live"
          />
          <Button type="submit" className="w-full" disabled={connecting}>
            {connecting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogIn className="size-4" />
            )}
            {connecting ? "Connecting…" : "Connect"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export const Graph = (_props: Record<string, unknown>) => {
  return (
    <div className="h-full min-h-0 w-full overflow-hidden">
      <App.Guard notConnectedFallback={<ExplorerConnect />}>
        <ExplorerInner />
      </App.Guard>
    </div>
  );
};

export default Graph;
