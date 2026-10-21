import { chmodSync, renameSync, writeFileSync } from "node:fs";
import { OrcaError, type Context } from "../context";
import { docker, latestImage } from "../projects";

export const REMOTE_IMAGE = "ghcr.io/nicolekc/orca:latest";
/** Where CI publishes `orca` for each platform: orca-<os>-<arch>, its .sha256, and `version`. */
export const RELEASE = "https://github.com/nicolekc/orca/releases/download/cli";

declare const ORCA_VERSION: string | undefined;
/** The commit this `orca` was built from; "dev" when running from source. */
export const VERSION = typeof ORCA_VERSION === "string" ? ORCA_VERSION : "dev";

export type SelfUpdate = { version: string; execPath: string; fetch: typeof fetch; platform: string; arch: string };

export async function update(ctx: Context, opts: { self: SelfUpdate | false }): Promise<void> {
  const before = (await latestImage(ctx))?.id;
  const pulled = await ctx.docker.run(["pull", REMOTE_IMAGE]);
  if (pulled.code !== 0) {
    await docker(ctx, ["version"]); // turns "Docker isn't running" into its own message
    throw new OrcaError(`Couldn't download ${REMOTE_IMAGE}: ${pulled.stderr.trim()}`, "If the image is private: gh auth token | docker login ghcr.io -u <github-user> --password-stdin");
  }
  await docker(ctx, ["tag", REMOTE_IMAGE, "orca:latest"]);
  const after = (await latestImage(ctx))?.id;
  ctx.print(after === before ? "Image: up to date." : "Image: updated. Containers switch to it when recreated; `orca start` says when one is out of date.");

  if (opts.self) await updateSelf(ctx, opts.self);
}

async function updateSelf(ctx: Context, s: SelfUpdate) {
  if (s.version === "dev") {
    ctx.print("orca: running from source, so not updating itself.");
    return;
  }
  const asset = `orca-${s.platform}-${s.arch === "x64" ? "x64" : s.arch}`;
  const get = async (path: string) => {
    const r = await s.fetch(`${RELEASE}/${path}`);
    if (!r.ok) throw new OrcaError(`Couldn't download ${path} (${r.status}).`, "Check your connection and try again.");
    return r;
  };
  const latest = (await (await get("version")).text()).trim();
  if (latest === s.version) {
    ctx.print("orca: up to date.");
    return;
  }
  const binary = new Uint8Array(await (await get(asset)).arrayBuffer());
  const expected = (await (await get(`${asset}.sha256`)).text()).trim().split(/\s+/)[0];
  const actual = new Bun.CryptoHasher("sha256").update(binary).digest("hex");
  if (actual !== expected) throw new OrcaError(`The downloaded orca doesn't match its published checksum; not installing it.`);

  const next = `${s.execPath}.new`;
  try {
    writeFileSync(next, binary);
    chmodSync(next, 0o755);
    renameSync(next, s.execPath);
  } catch {
    throw new OrcaError(`Can't replace ${s.execPath}.`, `Reinstall it: curl -fsSL https://raw.githubusercontent.com/nicolekc/orca/main/cli/install.sh | bash`);
  }
  ctx.print(`orca: updated (${s.version} → ${latest}).`);
}
