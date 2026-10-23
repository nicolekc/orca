import { Box, Text, useApp, useInput } from "ink";
import { useState } from "react";
import type { Option } from "../context";

/** A question answered by moving through its options with the arrow keys, as in the project list. */
export function Choose({ question, options, onChoose }: { question: string; options: Option[]; onChoose: (value: string | null) => void }) {
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

