import { ArrowLeftIcon, TerminalIcon, XIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { LoadError, Section, StateLabel, link, useNotify } from "../components/common";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { actions, useAction, useProject, type ProjectDetail } from "../lib/api";
import { ago } from "../lib/utils";

export function Project({ name }: { name: string }) {
  const project = useProject(name);
  return (
    <>
      <a href={link("/")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Projects
      </a>
      <div className="mt-4">
        {project.isPending ? (
          <div className="grid gap-3" aria-busy="true" aria-label="Loading project">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
        ) : project.isError ? (
          <LoadError error={project.error} />
        ) : (
          <Detail p={project.data} />
        )}
      </div>
    </>
  );
}

function Detail({ p }: { p: ProjectDetail }) {
  const notify = useNotify();
  const open = useAction(actions.open);
  const migrated = p.state !== "not migrated";
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-balance">{p.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <StateLabel state={p.state} />
            <span className="font-mono text-xs text-muted-foreground">{p.folder}</span>
          </div>
        </div>
        {migrated && (
          <Button onClick={() => open.mutate({ project: p.name }, { onSuccess: notify.done, onError: notify.failed })} disabled={open.isPending}>
            <TerminalIcon /> New terminal
          </Button>
        )}
      </div>

      {!migrated && (
        <div className="mt-6 rounded-md border border-warning/50 px-4 py-3 text-sm">
          <p>This folder still has its container from before project homes. Migrate it to use it with Orca:</p>
          <p className="mt-2 font-mono text-xs">~/orca/orca-migrate.sh {p.folder}</p>
        </div>
      )}
      {p.imageUpdate && <ImageUpdate p={p} />}
      {migrated && <Terminals p={p} />}
      {migrated && <Forwards p={p} />}
      <Sessions p={p} />
      {migrated && <Danger p={p} />}
    </>
  );
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null);

function ImageUpdate({ p }: { p: ProjectDetail }) {
  const notify = useNotify();
  const recreate = useAction(actions.recreate);
  const [used, newest] = [when(p.image.container), when(p.image.newest)];
  const running = p.state === "running";
  return (
    <div className="mt-6 rounded-md border border-warning/50 px-4 py-3 text-sm">
      <p className="font-medium text-warning">Image update available</p>
      <p className="mt-1 text-pretty">
        {used && newest && used !== newest ? `This container's image was built ${used}; the newest, ${newest}.` : "This container was made from an older orca image."} Recreating it
        switches to the new one.
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-muted-foreground">
        <dt>Kept</dt>
        <dd>the project folder, ~ (logins, memory, settings, installed tools)</dd>
        <dt>Reset</dt>
        <dd>everything else in the container, such as system packages</dd>
      </dl>
      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" variant="outline" disabled={running || recreate.isPending} onClick={() => recreate.mutate(p.name, { onSuccess: notify.done, onError: notify.failed })}>
          Recreate in Terminal
        </Button>
        {running && <span className="text-xs text-muted-foreground">Stop it first.</span>}
      </div>
    </div>
  );
}

function Terminals({ p }: { p: ProjectDetail }) {
  const notify = useNotify();
  const open = useAction(actions.open);
  const stop = useAction(actions.stop);
  const [confirming, setConfirming] = useState(false);
  const running = p.state === "running";
  const terminals = p.terminals ?? [];
  const stopNow = () => stop.mutate(p.name, { onSuccess: (r) => (notify.done(r), setConfirming(false)), onError: notify.failed });

  return (
    <Section
      title="Terminals"
      aside={
        running && (
          <Button size="sm" variant="outline" disabled={stop.isPending} onClick={() => (terminals.length || p.terminals === null ? setConfirming(true) : stopNow())}>
            Stop container
          </Button>
        )
      }
    >
      {p.terminals === null ? (
        <p className="text-sm text-pretty text-muted-foreground">This container is from before terminals, so its shells end with their window. Recreate it to get them.</p>
      ) : terminals.length === 0 ? (
        <p className="text-sm text-muted-foreground">None open. A terminal keeps running when its window closes.</p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {terminals.map((t) => (
            <li key={t.name} className="flex items-center justify-between gap-4 px-3 py-2">
              <span className="flex min-w-0 items-baseline gap-3">
                <span className="font-mono text-xs tabular-nums">{t.name}</span>
                <span className="truncate">{t.title ?? t.command}</span>
              </span>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted-foreground tabular-nums">{t.attached ? "in a window" : ago(t.active)}</span>
                <Button size="sm" variant="ghost" onClick={() => open.mutate({ project: p.name, terminal: t.name }, { onSuccess: notify.done, onError: notify.failed })}>
                  Attach
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop {p.name}?</DialogTitle>
            <DialogDescription>
              {p.terminals === null ? "This ends any shells open in it" : `This ends ${terminals.length === 1 ? "its terminal" : `its ${terminals.length} terminals`}`} and whatever
              runs in them. Claude conversations can be continued later.
            </DialogDescription>
          </DialogHeader>
          <ul className="grid gap-1 text-sm">
            {terminals.map((t) => (
              <li key={t.name} className="truncate">
                <span className="font-mono text-xs">{t.name}</span> {t.title ?? t.command}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={stop.isPending} onClick={stopNow}>
              Stop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  );
}

function Forwards({ p }: { p: ProjectDetail }) {
  const notify = useNotify();
  const add = useAction(actions.addForward);
  const remove = useAction(actions.removeForward);
  const [port, setPort] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!port) return;
    add.mutate({ project: p.name, port }, { onSuccess: (r) => (notify.done(r), setPort("")), onError: notify.failed });
  };

  return (
    <Section title="Forwards" aside={<span className="text-xs text-muted-foreground">Servers must listen on 0.0.0.0</span>}>
      {p.forwards.length > 0 && (
        <ul className="mb-3 divide-y rounded-md border text-sm">
          {p.forwards.map((f) => (
            <li key={f.port} className="flex items-center justify-between gap-4 px-3 py-2">
              <a href={f.url} target="_blank" rel="noreferrer" className="truncate font-mono text-xs hover:underline">
                {f.url}
              </a>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">→ {f.port}</span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Stop forwarding port ${f.port}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate({ project: p.name, port: f.port }, { onSuccess: notify.done, onError: notify.failed })}
                >
                  <XIcon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex items-center gap-2">
        <label htmlFor="forward-port" className="sr-only">
          Port to forward
        </label>
        <Input id="forward-port" inputMode="numeric" placeholder="Port, e.g. 3000" value={port} onChange={(e) => setPort(e.target.value)} className="w-44 tabular-nums" />
        <Button type="submit" size="sm" variant="outline" disabled={!port || add.isPending}>
          Forward
        </Button>
      </form>
    </Section>
  );
}

function Sessions({ p }: { p: ProjectDetail }) {
  const notify = useNotify();
  const open = useAction(actions.open);
  return (
    <Section title="Claude sessions">
      {p.sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sessions yet.</p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {p.sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 px-3 py-2">
              <span className="truncate">{s.title}</span>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted-foreground tabular-nums">{ago(s.updated)}</span>
                {p.state !== "not migrated" && (
                  <Button size="sm" variant="ghost" onClick={() => open.mutate({ project: p.name, session: s.id }, { onSuccess: notify.done, onError: notify.failed })}>
                    Resume
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Danger({ p }: { p: ProjectDetail }) {
  const [open, setOpen] = useState(false);
  const [home, setHome] = useState(false);
  const [confirm, setConfirm] = useState("");
  const notify = useNotify();
  const remove = useAction(actions.remove);
  const running = p.state === "running";
  const nothing = p.state === "no container" && !home;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    remove.mutate(
      { project: p.name, confirm, home },
      {
        onSuccess: (r) => {
          notify.done(r);
          setOpen(false);
          if (home) location.hash = link("/");
        },
        onError: notify.failed,
      },
    );
  };

  return (
    <Section title="Delete">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" className="text-destructive" disabled={running} onClick={() => (setConfirm(""), setHome(false), setOpen(true))}>
          Delete…
        </Button>
        <span className="text-xs text-muted-foreground">{running ? "Stop it first." : "Your code is never deleted."}</span>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Delete {p.name}?</DialogTitle>
              <DialogDescription>This removes the container. Your code in {p.folder} stays.</DialogDescription>
            </DialogHeader>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={home} onCheckedChange={(v) => setHome(v === true)} className="mt-0.5" />
              <span>
                Also delete its home: logins, Claude memory and sessions, settings, installed tools.
              </span>
            </label>
            <div className="grid gap-1.5">
              <label htmlFor="confirm-name" className="text-sm">
                Type <span className="font-mono font-medium">{p.name}</span> to confirm
              </label>
              <Input id="confirm-name" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={confirm !== p.name || nothing || remove.isPending}>
                Delete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Section>
  );
}
