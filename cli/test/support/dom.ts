// A browser-like page (happy-dom) for the dashboard's React tests, preloaded (bunfig.toml) so it
// exists before React DOM and Testing Library load: both check for it when they load.
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// The rest of the tests, and the API the React tests run against, use Bun's own HTTP classes
const { Request, Response, Headers, fetch } = globalThis;
GlobalRegistrator.register({ url: "http://127.0.0.1:7321/app" });
Object.assign(globalThis, { Request, Response, Headers, fetch });

// Loaded here, after the page, so its hooks (an empty page after each test) apply to every file
await import("@testing-library/react");
