import { XIcon } from "lucide-react";
import { LoadError, StateLabel, link, useNotify } from "../components/common";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { actions, useAction, useInfo, useProjects, type ProjectView } from "../lib/api";
import { cn } from "../lib/utils";

/** Every project's forwards, with whether each one can open: the proxy up, and its project running. */
export function Forwards() {
  const projects = useProjects();
  const info = useInfo();
  const notify = useNotify();
  const remove = useAction(actions.removeForward);
  const forwards = (projects.data ?? []).flatMap((p) => p.forwards.map((f) => ({ ...f, project: p.name, state: p.state })));
  const proxy = info.data?.proxy;

  return (
    <>
      <h1 className="text-xl font-semibold text-balance">Forwards</h1>
      {forwards.length > 0 && proxy && (
        <p className={proxy.running ? "mt-2 text-sm text-muted-foreground" : "mt-2 text-sm text-warning"}>
          {proxy.running
            ? `Served on 127.0.0.1:${proxy.port}. A server in a container must listen on 0.0.0.0.`
            : "The forwards proxy isn't running, so these won't open. Starting any project brings it back."}
        </p>
      )}
      <div className="mt-6">
        {projects.isPending ? (
          <div className="grid gap-3" aria-busy="true" aria-label="Loading forwards">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : projects.isError ? (
          <LoadError error={projects.error} />
        ) : forwards.length === 0 ? (
          <div className="rounded-md border px-6 py-10 text-center text-sm text-muted-foreground">
            <p className="text-foreground">No forwards.</p>
            <p className="mt-2">
              Forward a port from a project's page, or run <code className="font-mono">orca forward &lt;port&gt;</code> in its folder.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-4 font-medium">Address</th>
                {/* On a phone it goes under the address, which would otherwise get only a few letters */}
                <th className="hidden py-2 pr-4 font-medium sm:table-cell">Project</th>
                <th className="py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {forwards.map((f) => (
                <tr key={f.url} className="border-b last:border-0">
                  <td className="w-full max-w-0 py-2.5 pr-4">
                    <a href={f.url} target="_blank" rel="noreferrer" className="block truncate font-mono text-xs hover:underline" title={f.url}>
                      {f.url.replace(/^http:\/\//, "")}
                    </a>
                    <ProjectState project={f.project} state={f.state} className="mt-1 sm:hidden" />
                  </td>
                  <td className="hidden py-2.5 pr-4 sm:table-cell">
                    <ProjectState project={f.project} state={f.state} />
                  </td>
                  <td className="py-2.5 text-right">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Stop forwarding ${f.project} port ${f.port}`}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate({ project: f.project, port: f.port }, { onSuccess: notify.done, onError: notify.failed })}
                    >
                      <XIcon />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/** The project a forward goes to, and whether it's running: a forward opens only while it is. */
function ProjectState({ project, state, className }: { project: string; state: ProjectView["state"]; className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-3 whitespace-nowrap text-sm", className)}>
      <a href={link(`/p/${encodeURIComponent(project)}`)} className="truncate font-medium hover:underline">
        {project}
      </a>
      <StateLabel state={state} className="text-xs" />
    </div>
  );
}
