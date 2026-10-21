import { expect, test } from "bun:test";
import { guard, securityHeaders } from "../server/guard";

const opts = { token: "s3cret-token", port: 7321 };
const req = (path: string, init: RequestInit & { host?: string; cookie?: string } = {}) => {
  const headers = new Headers(init.headers);
  headers.set("host", init.host ?? "127.0.0.1:7321");
  if (init.cookie) headers.set("cookie", init.cookie);
  return new Request(`http://127.0.0.1:7321${path}`, { ...init, headers });
};
const authed = { cookie: "orca_token=s3cret-token" };
const post = (extra: Record<string, string> = {}) => ({
  ...authed,
  method: "POST",
  headers: { origin: "http://127.0.0.1:7321", "x-orca": "1", "content-type": "application/json", ...extra },
});

test("opening the token link sets an HttpOnly, SameSite=Strict cookie and redirects away from the token", () => {
  const r = guard(req("/?token=s3cret-token"), opts)!;
  expect(r.status).toBe(303);
  expect(r.headers.get("location")).toBe("/app");
  const cookie = r.headers.get("set-cookie")!;
  expect(cookie).toContain("orca_token=s3cret-token");
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=Strict");
});

test("a wrong token link is refused", () => {
  expect(guard(req("/?token=guess"), opts)?.status).toBe(401);
});

test("requests without the token cookie are refused (e.g. from a container)", () => {
  expect(guard(req("/api/projects"), opts)?.status).toBe(401);
  expect(guard(req("/api/projects", { cookie: "orca_token=wrong" }), opts)?.status).toBe(401);
});

test("only the dashboard's own host is answered (DNS rebinding)", () => {
  expect(guard(req("/api/projects", { ...authed, host: "evil.example:7321" }), opts)?.status).toBe(421);
  expect(guard(req("/api/projects", { ...authed, host: "host.docker.internal:7321" }), opts)?.status).toBe(421);
  expect(guard(req("/api/projects", { ...authed, host: "localhost:7321" }), opts)).toBeNull();
});

test("an authenticated GET is allowed", () => {
  expect(guard(req("/api/projects", authed), opts)).toBeNull();
});

test("changes must come from the dashboard's own page: same origin, the custom header, a JSON body", () => {
  expect(guard(req("/api/projects", post()), opts)).toBeNull();
  expect(guard(req("/api/projects", post({ origin: "https://evil.example" })), opts)?.status).toBe(403);
  expect(guard(req("/api/projects", { ...post(), headers: { origin: "http://127.0.0.1:7321", "content-type": "application/json" } }), opts)?.status).toBe(403);
  expect(guard(req("/api/projects", post({ "content-type": "text/plain" })), opts)?.status).toBe(403);
  const noOrigin = post();
  delete (noOrigin.headers as Record<string, string>).origin;
  expect(guard(req("/api/projects", noOrigin), opts)?.status).toBe(403);
});

test("every response forbids framing and sniffing", () => {
  const h = securityHeaders(new Response("x")).headers;
  expect(h.get("x-frame-options")).toBe("DENY");
  expect(h.get("content-security-policy")).toContain("frame-ancestors 'none'");
  expect(h.get("x-content-type-options")).toBe("nosniff");
  expect(h.get("referrer-policy")).toBe("no-referrer");
});
