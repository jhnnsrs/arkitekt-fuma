// @ts-nocheck
"use client";
import { VscDebugDisconnect } from "react-icons/vsc";

import * as Popover from "@radix-ui/react-popover";
import React from "react";
import { useForm } from "react-hook-form";
import { Loader2, LogIn, ServerCog, UserRound } from "lucide-react";
import { App, Guard } from "../lib/app/App";
import { discover } from "../lib/arkitekt/fakts/discover";
import { useMeQuery } from "../lib/lok/api/graphql";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

export const NoHerre = () => {
  const fakts = App.useFakts();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Connection"
          className="size-7 cursor-pointer text-fd-muted-foreground"
        >
          <VscDebugDisconnect className="size-4" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-56 rounded-md border border-border bg-popover p-3 text-sm text-popover-foreground shadow-md focus:outline-none"
        >
          <p className="text-muted-foreground">Connected to</p>
          <p className="font-medium">{fakts?.self?.deployment_name}</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export const ShowMe = () => {
  const { data } = useMeQuery();
  const logout = App.useDisconnect();
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Account"
          className="size-7 cursor-pointer text-fd-muted-foreground"
        >
          <UserRound className="size-4" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-56 rounded-md border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md focus:outline-none"
        >
          {data?.me && (
            <div className="px-3 py-2">
              <p className="font-medium">Hi {data.me.username}!</p>
              <p className="text-xs text-muted-foreground">
                {data.me.firstName} {data.me.lastName}
              </p>
            </div>
          )}
          {data?.me && (
            <div className="p-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full cursor-pointer justify-start"
                onClick={() => logout()}
              >
                Logout
              </Button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export const NotConnected = () => {
  const connect = App.useConnect();

  const [introspectError, setIntrospectError] = React.useState<string | null>(
    null
  );
  const [connecting, setConnecting] = React.useState(false);

  const form = useForm({
    defaultValues: {
      url: "https://go.arkitekt.live",
    },
  });

  const handleConnect = (formData: { url: string }) => {
    setIntrospectError(null);
    setConnecting(true);
    const controller = new AbortController();

    discover({ url: formData.url, timeout: 2000, controller })
      .then((endpoint) =>
        connect({
          endpoint,
          controller,
        })
      )
      .catch((e) => {
        setIntrospectError(e.message);
      })
      .finally(() => {
        setConnecting(false);
      });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Login"
          className="size-7 cursor-pointer text-fd-muted-foreground"
        >
          <LogIn className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-6">
        <SheetHeader>
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ServerCog className="size-5" />
          </div>
          <SheetTitle>Connect to your server</SheetTitle>
          <SheetDescription>
            Enter the URL of your Arkitekt server to connect and sign in.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(handleConnect)}
          className="flex flex-col gap-4"
        >
          {introspectError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">Could not connect to the server</p>
              <p className="mt-1 break-words text-xs opacity-90">
                {introspectError}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="server-url"
              className="text-sm font-medium text-foreground"
            >
              Server URL
            </label>
            <Input
              id="server-url"
              {...form.register("url")}
              type="text"
              autoFocus
              placeholder="https://go.arkitekt.live"
            />
            <p className="text-xs text-muted-foreground">
              For example your local instance or the public demo.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={connecting}>
            {connecting && <Loader2 className="size-4 animate-spin" />}
            {connecting ? "Connecting…" : "Connect"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export const Connector = (props) => {
  return (
    <App.Guard notConnectedFallback={<NotConnected />}>
      <Guard.Lok>
        <ShowMe />
      </Guard.Lok>
    </App.Guard>
  );
};
