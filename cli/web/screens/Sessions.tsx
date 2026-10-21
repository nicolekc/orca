import { LoadError, link, useNotify } from "../components/common";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { actions, useAction, useProjects, useSessions } from "../lib/api";
import { ago } from "../lib/utils";

/** Every project's Claude sessions, newest first. */
export function Sessions() {
  const sessions = useSessions();
  const projects = useProjects();
  const notify = useNotify();
  const open = useAction(actions.open);
  const resumable = (project: string) => projects.data?.find((p) => p.name === project)?.state !== "not migrated";

  return (
    <>
      <h1 className="text-xl font-semibold text-balance">Recent sessions</h1>
      <div className="mt-6">
        {sessions.isPending ? (
          <div className="grid gap-3" aria-busy="true" aria-label="Loading sessions">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : sessions.isError ? (
          <LoadError error={sessions.error} />
        ) : sessions.data.length === 0 ? (
          <p className="rounded-md border px-6 py-10 text-center text-sm text-muted-foreground">No Claude sessions in any project yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-4 font-medium">Session</th>
                <th className="py-2 pr-4 font-medium">Project</th>
                <th className="py-2 pr-4 font-medium">Updated</th>
                <th className="py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.data.map((s) => (
                <tr key={`${s.project}/${s.id}`} className="border-b last:border-0">
                  <td className="max-w-md truncate py-2.5 pr-4">{s.title}</td>
                  <td className="py-2.5 pr-4">
                    <a href={link(`/p/${encodeURIComponent(s.project)}`)} className="text-muted-foreground hover:text-foreground hover:underline">
                      {s.project}
                    </a>
                  </td>
                  <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground tabular-nums">{ago(s.updated)}</td>
                  <td className="py-2.5 text-right">
                    {resumable(s.project) && (
                      <Button size="sm" variant="ghost" onClick={() => open.mutate({ project: s.project, session: s.id }, { onSuccess: notify.done, onError: notify.failed })}>
                        Resume
                      </Button>
                    )}
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
