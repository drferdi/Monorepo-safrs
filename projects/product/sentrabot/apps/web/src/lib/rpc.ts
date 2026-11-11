import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import type { AppContract } from "@sentrabot/contracts";

const link = new RPCLink({
  url: () =>
    typeof window === "undefined" ? "http://127.0.0.1:5173/rpc" : `${window.location.origin}/rpc`,
  fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
});

export const rpc: ContractRouterClient<AppContract> = createORPCClient(link);
