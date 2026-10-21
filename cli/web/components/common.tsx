import { ArrowUpIcon } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { State } from "../../present";
import { ApiFailure } from "../lib/api";
import { cn } from "../lib/utils";

const SYMBOL: Record<State, string> = { running: "●", stopped: "○", "no container": "–", "not migrated": "!" };
const TONE: Record<State, string> = {
  running: "text-success",
  stopped: "text-foreground",
  "no container": "text-muted-foreground",
  "not migrated": "text-warning",
};

/** A project's state: always a symbol and a word, so it reads without color. */
export function StateLabel({ state, className }: { state: State; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", TONE[state], className)}>
      <span aria-hidden>{SYMBOL[state]}</span>
      {state}
    </span>
  );
}

export function UpdateFlag() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-warning">
      <ArrowUpIcon className="size-3.5" aria-hidden />
      image update
    </span>
  );
}

/** What happened after an action, or what went wrong and how to fix it, shown under the header. */
type Notice = { kind: "info" | "error"; text: string; fix?: string } | null;
const NoticeContext = createContext<(n: Notice) => void>(() => {});

export function NoticeProvider({ children, render }: { children: ReactNode; render: (n: Notice, clear: () => void) => ReactNode }) {
  const [notice, setNotice] = useState<Notice>(null);
  return (
    <NoticeContext.Provider value={setNotice}>
      {render(notice, () => setNotice(null))}
      {children}
    </NoticeContext.Provider>
  );
}

/** Reports an action's outcome in the notice area. */
export function useNotify() {
  const set = useContext(NoticeContext);
  return {
    done: (r: { messages: string[] }) => set({ kind: "info", text: r.messages.filter(Boolean).join(" ") }),
    failed: (e: unknown) => set({ kind: "error", text: e instanceof Error ? e.message : String(e), fix: e instanceof ApiFailure ? e.fix : undefined }),
  };
}

export function NoticeBar({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  return (
    <div aria-live="polite" className="min-h-0">
      {notice && (
        <div className={cn("mb-6 flex items-start justify-between gap-4 rounded-md border px-4 py-3 text-sm", notice.kind === "error" ? "border-destructive/40 text-destructive" : "bg-muted/50")}>
          <div className="text-pretty">
            <p>{notice.text}</p>
            {notice.fix && <p className="mt-1 font-mono text-xs text-muted-foreground">{notice.fix}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

/** A failed load: signed out, or the error with its fix. */
export function LoadError({ error }: { error: unknown }) {
  if (error instanceof ApiFailure && error.status === 401)
    return (
      <div className="rounded-md border px-6 py-10 text-center">
        <p className="font-medium">This dashboard needs a fresh link.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Open it from a terminal on your Mac with <code className="font-mono">orca serve</code>.
        </p>
      </div>
    );
  return (
    <div className="rounded-md border border-destructive/40 px-4 py-3 text-sm text-destructive">
      <p>{error instanceof Error ? error.message : String(error)}</p>
      {error instanceof ApiFailure && error.fix && <p className="mt-1 font-mono text-xs text-muted-foreground">{error.fix}</p>}
    </div>
  );
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-balance">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export const link = (path: string) => `#${path}`;
