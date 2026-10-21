import { PlusIcon, TerminalIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { LoadError, StateLabel, UpdateFlag, link, useNotify } from "../components/common";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { actions, useAction, useProjects, type ProjectView } from "../lib/api";

export function Projects() {
  const projects = useProjects();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-balance">Projects</h1>
        {projects.isSuccess && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <PlusIcon /> New project
          </Button>
        )}
      </div>
      <NewProject open={creating} onOpenChange={setCreating} />

      <div className="mt-6">
        {projects.isPending ? (
          <Rows />
        ) : projects.isError ? (
          <LoadError error={projects.error} />
        ) : projects.data.length === 0 ? (
          <div className="rounded-md border px-6 py-10 text-center text-sm text-muted-foreground">
            <p className="text-foreground">No projects yet.</p>
            <p className="mt-2">
              Make one with <span className="text-foreground">New project</span>, or run <code className="font-mono">orca start</code> in a project folder.
            </p>
          </div>
        ) : (
          <ProjectTable projects={projects.data} />
        )}
      </div>
    </>
  );
}

function ProjectTable({ projects }: { projects: ProjectView[] }) {
  const notify = useNotify();
  const open = useAction(actions.open);
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-muted-foreground">
        <tr className="border-b">
          <th className="py-2 pr-4 font-medium">Project</th>
          <th className="py-2 pr-4 font-medium">State</th>
          <th className="py-2 pr-4 font-medium">Folder</th>
          <th className="py-2 pr-4 font-medium">Forwards</th>
          <th className="py-2 font-medium">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {projects.map((p) => (
          <tr key={p.name} className="border-b align-middle last:border-0">
            <td className="py-2.5 pr-4">
              <a href={link(`/p/${encodeURIComponent(p.name)}`)} className="font-medium hover:underline">
                {p.name}
              </a>
            </td>
            <td className="py-2.5 pr-4">
              <div className="flex flex-wrap gap-x-3">
                <StateLabel state={p.state} />
                {p.imageUpdate && <UpdateFlag />}
              </div>
            </td>
            <td className="max-w-64 truncate py-2.5 pr-4 font-mono text-xs text-muted-foreground" title={p.folder ?? ""}>
              {p.folder}
            </td>
            <td className="py-2.5 pr-4">
              <div className="flex flex-wrap gap-x-3 font-mono text-xs tabular-nums">
                {p.forwards.map((f) => (
                  <a key={f.port} href={f.url} target="_blank" rel="noreferrer" className="hover:underline">
                    :{f.port}
                  </a>
                ))}
              </div>
            </td>
            <td className="py-2.5 text-right">
              {p.state === "not migrated" ? (
                <a href={link(`/p/${encodeURIComponent(p.name)}`)} className="text-xs text-warning hover:underline">
                  Migrate first
                </a>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={open.isPending && open.variables?.project === p.name}
                  onClick={() => open.mutate({ project: p.name }, { onSuccess: notify.done, onError: notify.failed })}
                >
                  <TerminalIcon /> Open
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

function NewProject({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState("");
  const notify = useNotify();
  const create = useAction(actions.create);
  const invalid = name !== "" && !NAME.test(name);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || invalid) return;
    create.mutate(name, {
      onSuccess: (r) => {
        notify.done(r);
        setName("");
        onOpenChange(false);
      },
      onError: notify.failed,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Its code lives in <code className="font-mono">~/.orca/projects/{name || "<name>"}/workspace</code>. It opens in a terminal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <label htmlFor="new-name" className="text-sm font-medium">
              Name
            </label>
            <Input id="new-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-invalid={invalid} aria-describedby="new-name-help" />
            <p id="new-name-help" className={invalid ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
              Letters, numbers, “.”, “_” or “-”, starting with a letter or number.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || invalid || create.isPending}>
              Create and open
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The table's shape while it loads. */
function Rows() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Loading projects">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}
