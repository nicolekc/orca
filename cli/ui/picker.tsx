import { Box, Text, useApp, useInput } from "ink";
import { useState } from "react";
import { IMAGE_UPDATE, stateOf, symbol, tone } from "../present";
import type { Project } from "../projects";

export type Choice = { action: "start" | "delete"; project: string } | { action: "new" } | { action: "quit" };

/** The project list `orca` opens on: pick one to start, or make, delete, quit. `kept`: what keeps each running one up. */
export function Picker({
  projects,
  home,
  kept = {},
  onChoose,
}: {
  projects: Project[];
  home: string;
  kept?: Record<string, string>;
  onChoose: (c: Choice) => void;
}) {
  const { exit } = useApp();
  const [selected, setSelected] = useState(0);
  const choose = (c: Choice) => {
    onChoose(c);
    exit();
  };

  useInput((input, key) => {
    if (input === "q" || key.escape) return choose({ action: "quit" });
    if (input === "n") return choose({ action: "new" });
    if (projects.length === 0) return;
    if (key.downArrow || input === "j") setSelected((i) => Math.min(i + 1, projects.length - 1));
    if (key.upArrow || input === "k") setSelected((i) => Math.max(i - 1, 0));
    if (key.return) choose({ action: "start", project: projects[selected].name });
    if (input === "d") choose({ action: "delete", project: projects[selected].name });
  });

  const tilde = (p: string) => (p === home || p.startsWith(home + "/") ? "~" + p.slice(home.length) : p);
  const nameWidth = Math.max(0, ...projects.map((p) => p.name.length));
  const label = (p: Project) => `${symbol[stateOf(p)]} ${stateOf(p)}${kept[p.name] ? `, ${kept[p.name]}` : ""}`;
  const stateWidth = Math.max(0, ...projects.map((p) => label(p).length));

  return (
    <Box flexDirection="column">
      {projects.length === 0 ? (
        <Text>No projects yet. Press n to make one, or run `orca start` in a project folder.</Text>
      ) : (
        projects.map((p, i) => {
          const s = stateOf(p);
          const on = i === selected;
          return (
            <Text key={p.name}>
              <Text bold={on}>{on ? "› " : "  "}{p.name.padEnd(nameWidth)}</Text>
              {"  "}
              <Text color={tone[s] === "dim" ? undefined : tone[s]} dimColor={tone[s] === "dim"}>
                {label(p).padEnd(stateWidth)}
              </Text>
              {"  "}
              <Text dimColor>{p.folder ? tilde(p.folder) : ""}</Text>
              {p.outdated ? <Text color="yellow">{`  ${IMAGE_UPDATE}`}</Text> : null}
            </Text>
          );
        })
      )}
      <Text dimColor>{projects.length ? "↑↓ move · enter start · n new · d delete · q quit" : "n new · q quit"}</Text>
    </Box>
  );
}
