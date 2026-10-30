import { ArrowLeftIcon, TerminalIcon, XIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { LoadError, Section, StateLabel, link, useNotify } from "../components/common";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { NotPointing, TrustNote } from "../components/forwards";
import { actions, useAction, useBoxSettings, useProject, type ProjectDetail } from "../lib/api";
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
      {migrated && <BoxSettings p={p} />}
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
  const up = useAction(actions.up);
  const [confirming, setConfirming] = useState(false);
  const running = p.state === "running";
  const terminals = p.terminals ?? [];
  const stopNow = () => stop.mutate(p.name, { onSuccess: (r) => (notify.done(r), setConfirming(false)), onError: notify.failed });
  // What decides when it stops, so it never stops (or keeps running) unexpectedly
  const rule = !running || p.terminals === null ? null : p.keptUp ? "Kept up: it runs until you stop it, with or without terminals." : p.canKeepUp ? "It stops when its last terminal ends." : "It stops a minute after its last terminal ends.";

  return (
    <Section
      title="Terminals"
      aside={
        <div className="flex gap-2">
          {p.canKeepUp && p.terminals !== null && !p.keptUp && (
            <Button size="sm" variant="outline" disabled={up.isPending} onClick={() => up.mutate(p.name, { onSuccess: notify.done, onError: notify.failed })}>
              {running ? "Keep running" : "Start without a terminal"}
            </Button>
          )}
          {running && (
            <Button size="sm" variant="outline" disabled={stop.isPending} onClick={() => (terminals.length || p.terminals === null ? setConfirming(true) : stopNow())}>
              Stop container
            </Button>
          )}
        </div>
      }
    >
      {rule && <p className="mb-3 text-sm text-pretty text-muted-foreground">{rule}</p>}
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
  const [url, setUrl] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!port) return;
    add.mutate({ project: p.name, port, url: url || undefined }, { onSuccess: (r) => (notify.done(r), setPort(""), setUrl("")), onError: notify.failed });
  };
  // A forward's usual address first, then any URLs it was given; removing the usual one removes the forward
  const rows = p.forwards.flatMap((f) => [
    { key: f.url, url: f.url, port: f.port, pointsHere: true, remove: f.port, label: `Stop forwarding port ${f.port}` },
    ...f.urls.map((u) => ({ key: u.url, url: u.url, port: f.port, pointsHere: u.pointsHere, remove: u.url, label: `Stop serving port ${f.port} at ${u.url}` })),
  ]);

  return (
    <Section title="Forwards" aside={<span className="text-xs text-muted-foreground">Servers must listen on 0.0.0.0</span>}>
      {rows.length > 0 && (
        <ul className="mb-3 divide-y rounded-md border text-sm">
          {rows.map((r) => (
            <li key={r.key} className="px-3 py-2">
              <div className="flex items-center justify-between gap-4">
                <a href={r.url} target="_blank" rel="noreferrer" className="truncate font-mono text-xs hover:underline">
                  {r.url}
                </a>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums">→ {r.port}</span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={r.label}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate({ project: p.name, port: r.remove }, { onSuccess: notify.done, onError: notify.failed })}
                  >
                    <XIcon />
                  </Button>
                </div>
              </div>
              {!r.pointsHere && <NotPointing url={r.url} />}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <label htmlFor="forward-port" className="sr-only">
          Port to forward
        </label>
        <Input id="forward-port" inputMode="numeric" placeholder="Port, e.g. 3000" value={port} onChange={(e) => setPort(e.target.value)} className="w-36 tabular-nums" />
        <label htmlFor="forward-url" className="sr-only">
          Also serve it at this URL (optional)
        </label>
        <Input
          id="forward-url"
          type="url"
          placeholder="Also at a URL (optional)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-w-0 flex-1 basis-64"
        />
        <Button type="submit" size="sm" variant="outline" disabled={!port || add.isPending}>
          Forward
        </Button>
      </form>
      <TrustNote urls={rows.map((r) => r.url)} />
    </Section>
  );
}

const GB = 1024 ** 3;
const gb = (bytes: number) => String(+(bytes / GB).toFixed(1));

/** Its box settings, its container's memory and CPUs, changed at once (orca settings) */
function BoxSettings({ p }: { p: ProjectDetail }) {
  const notify = useNotify();
  const settings = useBoxSettings(p.name);
  const set = useAction(actions.setBoxSettings);
  // What's typed, until saved; null shows the current value
  const [memory, setMemory] = useState<string | null>(null);
  const [cpus, setCpus] = useState<string | null>(null);
  const l = settings.data;
  const save = (v: { memory?: string; cpus?: string }) =>
    set.mutate({ project: p.name, ...v }, { onSuccess: (r) => (notify.done(r), setMemory(null), setCpus(null)), onError: notify.failed });

  const body = () => {
    if (settings.isPending) return <Skeleton className="h-9 w-72" />;
    if (settings.isError) return <LoadError error={settings.error} />;
    const l = settings.data;
    const changedMemory = memory !== null && memory !== gb(l.memory);
    const changedCpus = cpus !== null && cpus !== String(l.cpus);
    const submit = (e: FormEvent) => {
      e.preventDefault();
      save({ memory: changedMemory ? `${memory}g` : undefined, cpus: changedCpus ? cpus! : undefined });
    };
    const own = { memory: l.own.memory !== undefined, cpus: l.own.cpus !== undefined };
    const source = own.memory && own.cpus ? "Its own settings" : own.memory ? "Its own memory, the default CPUs" : own.cpus ? "The default memory, its own CPUs" : "The defaults";
    return (
      <>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Memory, GB
            <Input inputMode="decimal" value={memory ?? gb(l.memory)} onChange={(e) => setMemory(e.target.value)} className="w-24 tabular-nums" />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            CPUs
            <Input inputMode="decimal" value={cpus ?? String(l.cpus)} onChange={(e) => setCpus(e.target.value)} className="w-24 tabular-nums" />
          </label>
          <Button type="submit" size="sm" variant="outline" disabled={!(changedMemory || changedCpus) || set.isPending}>
            Save
          </Button>
          {(own.memory || own.cpus) && (
            <Button type="button" size="sm" variant="ghost" disabled={set.isPending} onClick={() => save({ memory: "default", cpus: "default" })}>
              Use the defaults
            </Button>
          )}
        </form>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          {[l.used && `Using ${l.used} now`, source, "Changes apply at once, without a restart"].filter(Boolean).join(" · ")}
        </p>
        {l.total && l.memory > l.total.memory && (
          <p className="mt-1 text-sm text-warning">More memory than Docker has, so Docker's own limit applies. Raise it in Docker Desktop's Settings → Resources.</p>
        )}
      </>
    );
  };

  return (
    <Section title="Box settings" aside={l?.total && <span className="text-xs text-muted-foreground tabular-nums">Docker has {gb(l.total.memory)} GB and {l.total.cpus} CPUs in all</span>}>
      {body()}
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
      <div className="flex shrink-0 items-center gap-3">
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
