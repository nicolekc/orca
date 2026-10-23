import { Box, Text, render, useApp, useInput } from "ink";
import { createElement, useState } from "react";
import type { Option } from "../context";
import { quietConsole } from "./quiet";

/** A question answered by moving through its options with the arrow keys, as in the project list. */
function Choose({ question, options, onChoose }: { question: string; options: Option[]; onChoose: (value: string | null) => void }) {
  const { exit } = useApp();
  const [selected, setSelected] = useState(0);
  const choose = (value: string | null) => {
    onChoose(value);
    exit();
  };

  useInput((input, key) => {
    if (input === "q" || key.escape) return choose(null);
    if (key.downArrow || input === "j") setSelected((i) => Math.min(i + 1, options.length - 1));
    if (key.upArrow || input === "k") setSelected((i) => Math.max(i - 1, 0));
    if (key.return) choose(options[selected].value);
  });

  return (
    <Box flexDirection="column">
      <Text>{question}</Text>
      {options.map((o, i) => (
        <Text key={o.value} bold={i === selected}>
          {i === selected ? "› " : "  "}
          {o.label}
        </Text>
      ))}
      <Text dimColor>↑↓ move · enter choose · q quit</Text>
    </Box>
  );
}

/** Asks on the terminal; resolves to the chosen option's value, or null if the user quit. */
export async function chooseOnTerminal(logFile: string, question: string, options: Option[]): Promise<string | null> {
  let value: string | null = null;
  const restore = quietConsole(logFile);
  try {
    const app = render(createElement(Choose, { question, options, onChoose: (v: string | null) => (value = v) }), { patchConsole: false });
    await app.waitUntilExit();
  } finally {
    restore();
  }
  return value;
}
