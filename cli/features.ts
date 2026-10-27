// What orca adds to a project's container beyond the image, in two kinds:
//   every time: part of every container orca creates for a project, so in effect whenever it runs;
//     and the workspace file, checked on every start
//   at creation: done once, when orca creates a project's home; never repeated or overwritten
// container-features.md lists these together with what the image adds, and is kept in step.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OrcaError, type Context } from "./context";
import { limitArgs, type Limits } from "./limits";

export type Box = { name: string; folder: string; home: string; network: string; limits: Limits };

/** docker run arguments for every container orca creates (the every-time features). */
export function containerArgs(b: Box): string[] {
  return [
    // The project folder and its own home; everything else in the container is the image's
    "-v", `${b.folder}:/workspace`,
    "-v", `${b.home}:/home/node`,
    // Its own network, which only the forwards proxy also joins
    "--network", b.network,
    // Its memory and CPUs (orca limits): 8 GB and 4 unless set
    ...limitArgs(b.limits),
    // Where `orca up` marks it to keep running; emptied on every start, so a stop ends it
    "--tmpfs", "/run/orca:mode=1777",
    // The project's name, for terminal titles, and for naming its Remote Control sessions
    // (otherwise the container's random hostname)
    "-e", `ORCA_PROJECT=${b.name}`,
    "-e", `CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX=${b.name}`,
  ];
}

type CreationFeature = {
  id: string;
  label: string;
  /** Applies it to a new home; returns what to tell the user */
  apply: (ctx: Context, home: string) => Promise<string>;
};

export const CREATION: CreationFeature[] = [
  {
    // Commits in the project are the user's, as on the Mac
    id: "git-identity",
    label: "Git identity",
    async apply(ctx, home) {
      const get = async (key: string) => {
        const r = await ctx.host(["git", "config", "--global", key]);
        return r.code === 0 ? r.stdout.trim() : "";
      };
      const [name, email] = await Promise.all([get("user.name"), get("user.email")]);
      if (!name || !email) return "Git identity: none on this Mac to copy. Set one in the project: git config --global user.name/user.email";
      const file = join(home, ".gitconfig");
      if (existsSync(file)) return "Git identity: the home already has a ~/.gitconfig, left as it is";
      writeFileSync(file, `[user]\n\tname = ${name}\n\temail = ${email}\n`);
      return `Git identity: ${name} <${email}>, copied from this Mac to the project's ~/.gitconfig`;
    },
  },
];

/** Features that can be left out: the creation ones, and the workspace file. */
export const optionalIds = [...CREATION.map((f) => f.id), "workspace-file"];

/** Checks feature names given to --without or the "without" setting. */
export function checkWithout(ids: string[], where: string) {
  const unknown = ids.filter((id) => !optionalIds.includes(id));
  if (unknown.length)
    throw new OrcaError(`${where}: there's no feature "${unknown[0]}" to leave out.`, `Features that can be left out: ${optionalIds.join(", ")}`);
}

/** Applies the creation features to a new home, printing what each did. */
export async function applyCreation(ctx: Context, home: string, without: string[]) {
  for (const f of CREATION) ctx.print(without.includes(f.id) ? `${f.label}: left out (without ${f.id})` : await f.apply(ctx, home));
}

// The workspace file: editors search and index each git repo only when it's a root of its own
const MARK = "// Made by orca start";

/**
 * Writes <project>.code-workspace in a folder that holds git repos below its top: a root for the
 * top (its own files) and one per repo, each hidden from the top's root. Rewritten when the repos
 * change, but only while its first line is orca's; without that line, it's the user's.
 */
export function workspaceFile(ctx: Context, name: string, folder: string, without: string[]) {
  if (without.includes("workspace-file")) return;
  const repos = findRepos(folder);
  const file = join(folder, `${name}.code-workspace`);
  const old = existsSync(file) ? readFileSync(file, "utf8") : null;
  if (!repos.length || (old !== null && !old.startsWith(MARK))) return;
  const workspace = {
    folders: [{ name, path: "." }, ...repos.map((path) => ({ path }))],
    // Editors apply this in every root: a repo another one has a folder at the same path as stays
    // shown (twice) rather than hide that folder
    settings: { "files.exclude": Object.fromEntries(repos.filter((r) => !repos.some((o) => existsSync(join(folder, o, r)))).map((r) => [r, true])) },
  };
  const text = `${MARK} for ${name}: one root per git repo, so editors search each. It's rewritten
// when repos are added or removed; to keep your own version, remove this comment.
${JSON.stringify(workspace, null, 2)}
`;
  if (text === old) return;
  writeFileSync(file, text);
  const n = `${repos.length} repo${repos.length === 1 ? "" : "s"}`;
  ctx.print(`Workspace file: ${name}.code-workspace, ${old === null ? `with ${n}; open it in VS Code or Cursor` : `updated: ${n}`}`);
}

/** Git repos up to three levels below `top`, skipping node_modules and hidden folders. */
function findRepos(top: string, rel = "", depth = 1): string[] {
  if (depth > 3) return [];
  let entries;
  try {
    entries = readdirSync(join(top, rel), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules")
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) => {
      const path = rel ? `${rel}/${e.name}` : e.name;
      // .git is a folder in a clone, a file in a worktree or submodule
      const repo = existsSync(join(top, path, ".git")) ? [path] : [];
      return [...repo, ...findRepos(top, path, depth + 1)];
    });
}
