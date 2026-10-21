/** One forward: requests for `host` go to `upstream` (container:port on its project network). */
export type Route = { host: string; upstream: string };

/**
 * The proxy's whole configuration, regenerated from every project's forwards.
 * Requests from project networks are refused, so a forward is reachable from the Mac only,
 * never from another project's container.
 */
export function caddyfile(routes: Route[], projectSubnets: string[]): string {
  const lines = [
    "# Written by orca; changes here are overwritten. Each project's forwards are listed in",
    "# ~/.orca/projects/<project>/forwards and changed with `orca forward`.",
    "{",
    "\tauto_https off",
    "}",
    "",
    "http://:80 {",
  ];
  if (projectSubnets.length) {
    lines.push(`\t@fromProjects remote_ip ${projectSubnets.join(" ")}`);
    lines.push(`\thandle @fromProjects {`, `\t\trespond "Forwards are only reachable from the Mac." 403`, `\t}`);
  }
  routes.forEach((r, i) => {
    lines.push(`\t@r${i} host ${r.host}`);
    lines.push(`\thandle @r${i} {`, `\t\treverse_proxy ${r.upstream}`, `\t}`);
  });
  lines.push(
    `\thandle {`,
    `\t\trespond "No forward at this address. Add one on the Mac: orca forward <port>" 404`,
    `\t}`,
    `\thandle_errors {`,
    `\t\trespond "{err.status_code}: the project's container isn't running, or nothing is listening on that port on 0.0.0.0 (a server on localhost only can't be forwarded)." {err.status_code}`,
    `\t}`,
    "}",
    "",
  );
  return lines.join("\n");
}
