import { useSyncExternalStore } from "react";
import { NoticeBar, NoticeProvider, link } from "./components/common";
import { useInfo } from "./lib/api";
import { cn } from "./lib/utils";
import { Project } from "./screens/Project";
import { Projects } from "./screens/Projects";
import { Sessions } from "./screens/Sessions";

/** The current route, from the URL hash: #/, #/p/<name>, #/sessions */
function useRoute(): string {
  return useSyncExternalStore(
    (onChange) => (window.addEventListener("hashchange", onChange), () => window.removeEventListener("hashchange", onChange)),
    () => location.hash.replace(/^#/, "") || "/",
  );
}

export function App() {
  const route = useRoute();
  const project = route.match(/^\/p\/(.+)$/);
  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-6 pb-16">
      <Header route={route} />
      <NoticeProvider render={(notice, clear) => <NoticeBar notice={notice} onClose={clear} />}>
        <main>{project ? <Project name={decodeURIComponent(project[1])} key={project[1]} /> : route === "/sessions" ? <Sessions /> : <Projects />}</main>
      </NoticeProvider>
    </div>
  );
}

function Header({ route }: { route: string }) {
  const info = useInfo();
  const tab = (path: string, label: string, active: boolean) => (
    <a href={link(path)} aria-current={active ? "page" : undefined} className={cn("rounded-md px-2.5 py-1.5 text-sm", active ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}>
      {label}
    </a>
  );
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 py-5">
      <div className="flex items-center gap-6">
        <span className="font-semibold">Orca</span>
        <nav className="flex gap-1">
          {tab("/", "Projects", route === "/" || route.startsWith("/p/"))}
          {tab("/sessions", "Sessions", route === "/sessions")}
        </nav>
      </div>
      {info.data && (
        <p className="text-xs text-muted-foreground tabular-nums">
          Forwards proxy {info.data.proxy.running ? <span className="text-success">running</span> : "off"} on 127.0.0.1:{info.data.proxy.port} · {info.data.version}
        </p>
      )}
    </header>
  );
}
