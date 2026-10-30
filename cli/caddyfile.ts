/** One forward: requests for `host` go to `upstream` (container:port on its project network). */
export type Route = { host: string; upstream: string };

/**
 * What the proxy listens on, one per port inside its container: plain HTTP, or HTTPS for the
 * listed hostnames, with a certificate from Caddy's own certificate authority.
 */
export type Server = { port: number; https: boolean; routes: Route[] };

/**
 * The proxy's whole configuration, regenerated from every project's forwards.
 * Requests from project networks are refused, so a forward is reachable from the Mac only,
 * never from another project's container.
 */
export function caddyfile(servers: Server[], projectSubnets: string[]): string {
  const lines = [
    "# Written by orca; changes here are overwritten. Each project's forwards are listed in",
    "# ~/.orca/projects/<project>/forwards and changed with `orca forward`.",
    "{",
    // HTTPS addresses get certificates from Caddy's own authority, which the Mac is asked to trust
    "\tlocal_certs",
    "\tskip_install_trust",
    "\tauto_https disable_redirects",
    "}",
  ];
  for (const s of servers) {
    const hosts = [...new Set(s.routes.map((r) => r.host))];
    lines.push("", s.https ? `${hosts.map((h) => `https://${h}:${s.port}`).join(", ")} {` : `http://:${s.port} {`);
    if (projectSubnets.length) {
      lines.push(`\t@fromProjects remote_ip ${projectSubnets.join(" ")}`);
      lines.push(`\thandle @fromProjects {`, `\t\trespond "Forwards are only reachable from the Mac." 403`, `\t}`);
    }
    s.routes.forEach((r, i) => {
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
    );
  }
  return lines.join("\n") + "\n";
}
