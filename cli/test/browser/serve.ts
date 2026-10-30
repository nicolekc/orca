// The real dashboard (orca serve) over a fake Docker holding projects in every state, for the
// browser tests: bun cli/test/browser/serve.ts <port>. Prints its link, with the token.
import { serve } from "../../server/serve";
import { world } from "../support/world";

const ago = (minutes: number) => Date.now() - minutes * 60_000;
export const PROJECTS = world(
  [
    {
      name: "app",
      container: "running",
      terminals: [["1", "claude", "✳ Fix the login redirect loop when the session cookie expires mid-request", true], ["2", "bash"], ["3", "node"]],
      // One with a URL too, as for an OAuth callback; dev.myapp.com doesn't point at the fake Mac
      forwards: [3000, "3000 https://dev.myapp.com", 5173],
      sessions: [
        { id: "11111111-2222-3333-4444-555555555555", title: "Fix the login redirect loop when the session cookie expires mid-request", updated: ago(5) },
        { id: "21111111-2222-3333-4444-555555555555", title: "Add search", updated: ago(60 * 26) },
      ],
    },
    { name: "demo", container: "running", terminals: [["1", "sleep"]] },
    { name: "idle", container: "running" },
    { name: "old", container: "running", old: true, outdated: true },
    { name: "stopped", container: "stopped" },
    // A long name, as real ones are, with a forward that can't open while it's stopped
    {
      name: "llm-chat-framework-sandbox",
      container: "stopped",
      forwards: [8080],
      sessions: [{ id: "31111111-2222-3333-4444-555555555555", title: "Stream replies token by token", updated: ago(60 * 3) }],
    },
    { name: "fresh", container: "none" },
    { name: "legacy", notMigrated: true },
  ],
  {},
  { servePort: Number(process.argv[2]) },
);
PROJECTS.ctx.print = console.log;
await serve(PROJECTS.ctx, { open: false });
