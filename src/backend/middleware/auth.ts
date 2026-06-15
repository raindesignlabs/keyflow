/**
 * API authentication guard for the public REST surface (`/api/*`).
 *
 * Access rules (evaluated per request, only for paths under `/api/`):
 *   - `/api/health` is always public (liveness probe).
 *   - `/api/auth/login` and `/api/auth/register` are public (they issue tokens).
 *   - A valid `Authorization: Bearer <jwt>` header (verified via @fastify/jwt).
 *   - A valid `x-api-key` header (timing-safe match against `KEYFLOW_API_KEY`)
 *     for internal service-to-service calls.
 *   - A valid dashboard session cookie for same-origin browser calls.
 *   - Otherwise the request is rejected with 401.
 *
 * Fails closed: if no auth method is configured the API is locked down
 * unless `KEYFLOW_API_AUTH=disabled` is set for local development.
 */

import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getSession } from "../dashboard/session.js";

const PUBLIC_API_PATHS = new Set<string>([
  "/api/health",
  "/api/auth/login",
  "/api/auth/register",
]);

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function extractBearerToken(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (!auth || typeof auth !== "string") return null;
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}

export function registerApiAuth(app: FastifyInstance): void {
  const apiKey = process.env.KEYFLOW_API_KEY;
  const authDisabled = process.env.KEYFLOW_API_AUTH === "disabled";
  const hasJwt = !!process.env.JWT_SECRET;

  if (!apiKey && !authDisabled) {
    app.log.warn(
      "[auth] KEYFLOW_API_KEY is not set — /api/* requests will be denied. " +
        "Set KEYFLOW_API_KEY, or KEYFLOW_API_AUTH=disabled for local dev only."
    );
  }

  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split("?")[0];

    // Only guard the public REST API; the dashboard handles its own auth.
    if (!path.startsWith("/api/")) return;
    if (PUBLIC_API_PATHS.has(path)) return;
    if (authDisabled) return;

    // 1) JWT bearer token (mobile app, integrations, programmatic access).
    if (hasJwt) {
      const bearerToken = extractBearerToken(request);
      if (bearerToken) {
        try {
          app.jwt.verify(bearerToken);
          return; // valid token — pass through
        } catch {
          // invalid/expired token — fall through to other methods, then deny
        }
      }
    }

    // 2) Internal service-to-service via shared API key.
    const provided = request.headers["x-api-key"];
    if (apiKey && typeof provided === "string" && safeEqual(provided, apiKey)) {
      return;
    }

    // 3) Same-origin browser call carrying a valid dashboard session.
    const token = (request.cookies as Record<string, string> | undefined)?.kf_session;
    if (token && getSession(token)) return;

    return reply.code(401).send({ error: "Unauthorized" });
  });
}
