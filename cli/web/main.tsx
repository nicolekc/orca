import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ApiFailure } from "./lib/api";

// Follow the system's light or dark appearance
const dark = matchMedia("(prefers-color-scheme: dark)");
const applyTheme = () => document.documentElement.classList.toggle("dark", dark.matches);
applyTheme();
dark.addEventListener("change", applyTheme);

const queries = new QueryClient({
  defaultOptions: {
    // A signed-out dashboard won't sign itself in; don't keep asking
    queries: { retry: (count, e) => !(e instanceof ApiFailure && e.status < 500) && count < 2 },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queries}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
