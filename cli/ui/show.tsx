import { render } from "ink";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Option } from "../context";
import type { Project } from "../projects";
import { Choose } from "./choose";
import { Picker, type Choice } from "./picker";
import { quietConsole } from "./quiet";

/** The views `show` draws: what each is given, and what choosing in it returns. */
type Views = {
  picker: { props: { projects: Project[]; home: string }; result: Choice };
  choose: { props: { question: string; options: Option[] }; result: string | null };
};
type Request = { view: keyof Views; props: unknown; log: string; result?: unknown };

/** The hidden command that draws a view: `orca __view <file>` */
export const VIEW_COMMAND = "__view";

/**
 * Draws a view like the picker and returns what was chosen, or null if it ended without a
 * choice. It runs in a process of its own: once a process has read stdin, a program it starts
 * on the terminal afterwards (docker, attaching a terminal) can lose keys to it (seen on
 * macOS), and a separate process's reading ends when it does.
 */
export async function show<V extends keyof Views>(log: string, view: V, props: Views[V]["props"]): Promise<Views[V]["result"] | null> {
  const dir = mkdtempSync(join(tmpdir(), "orca-view-"));
  const file = join(dir, "view.json");
  try {
    writeFileSync(file, JSON.stringify({ view, props, log } satisfies Request));
    // A compiled orca is one file; from source, Bun runs the script
    const self = Bun.main.startsWith("/$bunfs/") ? [process.execPath] : [process.execPath, Bun.main];
    await Bun.spawn([...self, VIEW_COMMAND, file], { stdio: ["inherit", "inherit", "inherit"] }).exited;
    return ((JSON.parse(readFileSync(file, "utf8")) as Request).result ?? null) as Views[V]["result"] | null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** `orca __view <file>`: draws the view the file asks for, then writes the choice back to it. */
export async function drawView(file: string): Promise<number> {
  const request = JSON.parse(readFileSync(file, "utf8")) as Request;
  let result: unknown = null;
  const onChoose = (r: unknown) => (result = r);
  const view =
    request.view === "picker" ? (
      <Picker {...(request.props as Views["picker"]["props"])} onChoose={onChoose} />
    ) : (
      <Choose {...(request.props as Views["choose"]["props"])} onChoose={onChoose} />
    );
  const restore = quietConsole(request.log);
  try {
    await render(view, { patchConsole: false }).waitUntilExit();
  } finally {
    restore();
  }
  writeFileSync(file, JSON.stringify({ ...request, result }));
  return 0;
}
