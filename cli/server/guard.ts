import { timingSafeEqual } from "node:crypto";

/**
 * The dashboard's guard. Containers (via host.docker.internal) and other web pages can both
 * reach the Mac's loopback, so every request must carry the token that `orca serve` wrote
 * to ~/.orca (which no container can read), and changes must come from the dashboard's own
 * page. See "Container Trust Boundary" in CLAUDE.md.
 */
export type GuardOptions = { token: string; port: number };

const COOKIE = "orca_token";

/** null when the request may go on; otherwise the refusal to send. */
export function guard(req: Request, { token, port }: GuardOptions): Response | null {
  const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  const host = req.headers.get("host") ?? "";
  // DNS rebinding: a page on another name that resolves to 127.0.0.1 sends its own Host
  if (!hosts.includes(host)) return refuse(421, "This address isn't the Orca dashboard.");

  const url = new URL(req.url);
  if (url.pathname === "/" && url.searchParams.has("token")) {
    if (!same(url.searchParams.get("token")!, token)) return refuse(401, "That dashboard link is out of date. Open a new one with: orca serve");
    return new Response(null, {
      status: 303,
      headers: { location: "/app", "set-cookie": `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/` },
    });
  }

  if (!same(cookie(req, COOKIE) ?? "", token)) return refuse(401, "Open the dashboard with: orca serve");

  if (req.method !== "GET" && req.method !== "HEAD") {
    // Cross-site requests can't set a custom header or a JSON body without the page's
    // permission, and the Origin must be the dashboard's own
    const origin = req.headers.get("origin");
    const json = (req.headers.get("content-type") ?? "").startsWith("application/json");
    if (!origin || !hosts.some((h) => origin === `http://${h}`) || req.headers.get("x-orca") !== "1" || !json)
      return refuse(403, "Changes can only come from the dashboard page.");
  }
  return null;
}

export function securityHeaders(res: Response): Response {
  const h = res.headers;
  h.set("x-frame-options", "DENY");
  h.set("content-security-policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  h.set("x-content-type-options", "nosniff");
  h.set("referrer-policy", "no-referrer");
  h.set("cache-control", "no-store");
  return res;
}

function refuse(status: number, message: string) {
  return securityHeaders(Response.json({ error: message }, { status }));
}

function cookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
