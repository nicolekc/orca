import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OrcaError, type Context } from "../context";
import { recordDir } from "../projects";
import { start } from "./start";

export const NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

/** Makes a project whose code lives in ~/.orca/projects/<name>/workspace, then starts it. */
export async function create(ctx: Context, name: string): Promise<number> {
  if (!NAME.test(name))
    throw new OrcaError(`"${name}" can't be a project name: use letters, numbers, ".", "_" or "-", starting with a letter or number.`);
  const record = recordDir(ctx, name);
  if (existsSync(record)) throw new OrcaError(`A project named "${name}" already exists.`, `Start it with: orca start, or pick another name`);
  const workspace = join(record, "workspace");
  mkdirSync(workspace, { recursive: true });
  writeFileSync(join(record, "project-path"), workspace + "\n");
  return start(ctx, workspace, {});
}
