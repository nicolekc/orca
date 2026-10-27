import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActionResult, BoxSettingsView, ProjectDetail, ProjectView } from "../../server/api";
import type { ProxyState } from "../../proxy";
import type { Session } from "../../sessions";
import type { Terminal } from "../../terminals";

export type { BoxSettingsView, ProjectDetail, ProjectView, Session, Terminal };

export class ApiFailure extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fix?: string,
  ) {
    super(message);
  }
}

/** Every request carries the header and JSON body the server requires of its own page. */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "x-orca": "1", "content-type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiFailure(data.error ?? res.statusText, res.status, data.fix);
  return data as T;
}

const LIVE = { refetchInterval: 3000 };

export const useInfo = () => useQuery({ queryKey: ["info"], queryFn: () => request<{ version: string; proxy: ProxyState }>("GET", "/api/info"), ...LIVE });
export const useProjects = () => useQuery({ queryKey: ["projects"], queryFn: () => request<ProjectView[]>("GET", "/api/projects"), ...LIVE });
export const useProject = (name: string) =>
  useQuery({ queryKey: ["projects", name], queryFn: () => request<ProjectDetail>("GET", `/api/projects/${encodeURIComponent(name)}`), ...LIVE });
// Less often: docker stats, for what it uses, takes a second or two
export const useBoxSettings = (name: string) =>
  useQuery({ queryKey: ["projects", name, "settings"], queryFn: () => request<BoxSettingsView>("GET", `/api/projects/${encodeURIComponent(name)}/settings`), refetchInterval: 10000 });
export const useSessions = () => useQuery({ queryKey: ["sessions"], queryFn: () => request<Session[]>("GET", "/api/sessions"), ...LIVE });

/** An action against the server; everything refreshes after it. */
export function useAction<V>(fn: (v: V) => Promise<ActionResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries() });
}

const p = (name: string) => `/api/projects/${encodeURIComponent(name)}`;
export const actions = {
  create: (name: string) => request<ActionResult>("POST", "/api/projects", { name }),
  open: (v: { project: string; session?: string; terminal?: string }) =>
    request<ActionResult>("POST", `${p(v.project)}/open`, { session: v.session, terminal: v.terminal }),
  setBoxSettings: (v: { project: string; memory?: string; cpus?: string }) => request<ActionResult>("POST", `${p(v.project)}/settings`, { memory: v.memory, cpus: v.cpus }),
  up: (project: string) => request<ActionResult>("POST", `${p(project)}/up`),
  stop: (project: string) => request<ActionResult>("POST", `${p(project)}/stop`),
  recreate: (project: string) => request<ActionResult>("POST", `${p(project)}/recreate`),
  addForward: (v: { project: string; port: string }) => request<ActionResult>("POST", `${p(v.project)}/forwards`, { port: v.port }),
  removeForward: (v: { project: string; port: number }) => request<ActionResult>("DELETE", `${p(v.project)}/forwards/${v.port}`),
  remove: (v: { project: string; confirm: string; home: boolean }) => request<ActionResult>("POST", `${p(v.project)}/delete`, { confirm: v.confirm, home: v.home }),
};
