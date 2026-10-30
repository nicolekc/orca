import { useInfo } from "../lib/api";

/** Under an extra address whose hostname the Mac doesn't send to itself: the line that would. */
export function NotPointing({ url }: { url: string }) {
  const host = new URL(url).hostname;
  return (
    <p className="mt-1 text-xs text-warning">
      {host} doesn't point at this Mac, so it won't open yet. Add to /etc/hosts:{" "}
      <code className="font-mono select-all">127.0.0.1 {host}</code>
    </p>
  );
}

/** Once, wherever HTTPS addresses are listed: they need this Mac to trust orca's certificate authority. */
export function TrustNote({ urls }: { urls: string[] }) {
  const ca = useInfo().data?.ca;
  if (!ca || !urls.some((u) => u.startsWith("https://"))) return null;
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      HTTPS addresses have certificates from orca's own certificate authority; browsers warn until this Mac trusts it.{" "}
      {ca.trust ? (
        <>
          If it doesn't yet, run once: <code className="font-mono break-all text-foreground select-all">{ca.trust}</code>
        </>
      ) : (
        <>
          If it doesn't yet, add <code className="font-mono break-all text-foreground select-all">{ca.file}</code> to its trusted certificates.
        </>
      )}
    </p>
  );
}
