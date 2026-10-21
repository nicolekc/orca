import { randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { VERSION } from "../commands/update";
import { readConfig } from "../config";
import { OrcaError, tilde, type Context } from "../context";
import { orcaPath } from "../terminal";
import page from "../web/index.html";
import { createApi } from "./api";
import { guard, securityHeaders } from "./guard";

/**
 * The dashboard: one per Mac, on 127.0.0.1:<servePort>. A new token each run, written where
 * containers can't read it; the browser gets it once through the link this opens.
 * The page itself (/app) is static and public; everything it loads comes through the guard.
 */
export async function serve(ctx: Context, opts: { open: boolean }): Promise<never> {
  const { servePort: port } = readConfig(ctx);
  const token = randomBytes(32).toString("base64url");
  mkdirSync(ctx.orcaDir, { recursive: true });
  const tokenFile = join(ctx.orcaDir, "serve-token");
  writeFileSync(tokenFile, token + "\n", { mode: 0o600 });
  chmodSync(tokenFile, 0o600);

  const api = createApi(ctx, { orca: orcaPath(), version: VERSION });
  try {
    Bun.serve({
      hostname: "127.0.0.1",
      port,
      routes: { "/app": page },
      async fetch(req) {
        const refused = guard(req, { token, port });
        if (refused) return refused;
        const res = (await api(req)) ?? (new URL(req.url).pathname === "/" ? Response.redirect("/app", 302) : Response.json({ error: "Not found" }, { status: 404 }));
        return securityHeaders(res);
      },
    });
  } catch (e) {
    if (/EADDRINUSE|in use/i.test(String(e)))
      throw new OrcaError(`Port ${port} on this Mac is already taken; is orca serve already running?`, `Use that one, or choose another port in ${tilde(ctx, join(ctx.orcaDir, "config.json"))}: {"servePort": ${port + 1}}`);
    throw e;
  }

  const url = `http://127.0.0.1:${port}/?token=${token}`;
  ctx.print(`Orca dashboard: ${url}`);
  ctx.print("Keep this running while you use it; Ctrl-C stops it. The link works until then.");
  if (opts.open) await ctx.launch([process.platform === "darwin" ? "open" : "xdg-open", url]).catch(() => ctx.print("(Couldn't open a browser; open the link yourself.)"));
  return new Promise<never>(() => {});
}
