import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "../../web/App";
import type { FakeState } from "./fake";
import { world, type Spec } from "./world";

// React tests of the dashboard: the app rendered against the real API over a fake Docker, on
// the page ./dom provides. To wait for something to go, use gone(): an expect() on an element
// inside waitFor is slow (each retry formats the element).

/**
 * Renders the dashboard at `route` (e.g. "/p/app") over these projects. Requests go to the
 * real API; `respond` can answer one first (e.g. a 401), by returning a Response.
 */
export async function open(route: string, specs: Spec[], opts: { state?: Partial<FakeState>; respond?: (path: string) => Response | undefined } = {}) {
  const w = world(specs, opts.state);
  const requests: { method: string; path: string; body: unknown }[] = [];
  globalThis.fetch = (async (input: string, init?: RequestInit) => {
    const path = String(input);
    requests.push({ method: init?.method ?? "GET", path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const canned = opts.respond?.(path);
    if (canned) return canned;
    return (await w.api(new Request(`http://127.0.0.1:7321${path}`, init)))!;
  }) as typeof fetch;
  location.hash = route;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchInterval: false } } });
  render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
  return { ...w, screen, requests };
}

/** Waits until `find` finds nothing (it may be gone already). */
export const gone = (find: () => Element | null) =>
  waitFor(() => {
    if (find()) throw new Error("still there");
  });
