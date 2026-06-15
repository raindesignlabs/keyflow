/**
 * KeyFlow CRM — JWT Authentication Routes
 *
 * Token-based auth for API clients (mobile app, integrations, programmatic access).
 * Dashboard cookie-based auth lives in dashboard/routes.ts — this is the REST equivalent.
 *
 * Flow:
 *   POST /api/auth/register → { token, user }
 *   POST /api/auth/login    → { token, user }
 *   GET  /api/auth/verify   → { valid, user }  (requires Bearer token)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { findUser, checkPassword, createUser, findUserById } from "../dashboard/users.js";
import type { DashboardUser } from "../dashboard/users.js";

// ── Rate limiter (shared pattern with dashboard login) ────────────────────
const authAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const entry = authAttempts.get(ip);
  if (!entry) return { allowed: true, retryAfterSec: 0 };
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.lockedUntil - Date.now()) / 1000) };
  }
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    authAttempts.delete(ip);
    return { allowed: true, retryAfterSec: 0 };
  }
  return { allowed: true, retryAfterSec: 0 };
}

function recordFailedAttempt(ip: string) {
  const entry = authAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  authAttempts.set(ip, entry);
}

function clearAttempts(ip: string) {
  authAttempts.delete(ip);
}

// Cleanup every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of authAttempts) {
    if (entry.lockedUntil && now >= entry.lockedUntil) authAttempts.delete(ip);
  }
}, 10 * 60 * 1000);

// ── Helpers ───────────────────────────────────────────────────────────────

function sanitizeUser(user: DashboardUser) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    client_id: user.client_id,
    organization_id: user.organization_id,
    display_name: user.display_name,
  };
}

function extractBearerToken(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (!auth || typeof auth !== "string") return null;
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}

// ── Routes ────────────────────────────────────────────────────────────────

export async function authRoutes(app: FastifyInstance) {
  // Register — create new user account
  app.post<{
    Body: { username: string; password: string; display_name?: string; role?: string };
  }>("/register", async (request, reply) => {
    const { username, password, display_name, role } = request.body || {};

    if (!username || !password) {
      return reply.code(400).send({ error: "Username and password required." });
    }
    if (password.length < 8) {
      return reply.code(400).send({ error: "Password must be at least 8 characters." });
    }
    if (findUser(username)) {
      return reply.code(409).send({ error: "Username already exists." });
    }

    // Only existing admins can create admin accounts — but since there's no
    // auth on this route yet, we default to "client" role for self-registration.
    // Admins are promoted via the CLI (pnpm user:role) or dashboard.
    const assignedRole = "client";
    const user = createUser({
      username,
      password,
      role: assignedRole,
      display_name: display_name || username,
    });

    const token = app.jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      { expiresIn: "7d" }
    );

    return reply.code(201).send({ token, user: sanitizeUser(user) });
  });

  // Login — authenticate and return JWT
  app.post<{
    Body: { username: string; password: string };
  }>("/login", async (request, reply) => {
    const ip = request.ip;
    const { allowed, retryAfterSec } = checkRateLimit(ip);
    if (!allowed) {
      return reply.code(429).send({
        error: `Too many attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.`,
      });
    }

    const { username, password } = request.body || {};
    if (!username || !password) {
      return reply.code(400).send({ error: "Username and password required." });
    }

    const user = findUser(username);
    if (!user || !checkPassword(user, password)) {
      recordFailedAttempt(ip);
      return reply.code(401).send({ error: "Invalid username or password." });
    }

    clearAttempts(ip);
    const token = app.jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      { expiresIn: "7d" }
    );

    return { token, user: sanitizeUser(user) };
  });

  // Verify — check if a JWT is still valid
  app.get("/verify", async (request, reply) => {
    const token = extractBearerToken(request);
    if (!token) {
      return reply.code(401).send({ valid: false, error: "No bearer token provided." });
    }

    try {
      const payload = app.jwt.verify(token) as { id: number; username: string; role: string };
      const user = findUserById(payload.id);
      if (!user) {
        return reply.code(401).send({ valid: false, error: "User no longer exists." });
      }
      return { valid: true, user: sanitizeUser(user) };
    } catch {
      return reply.code(401).send({ valid: false, error: "Invalid or expired token." });
    }
  });

  // Me — get current user from token (alias for verify, REST convention)
  app.get("/me", async (request, reply) => {
    const token = extractBearerToken(request);
    if (!token) {
      return reply.code(401).send({ error: "No bearer token provided." });
    }

    try {
      const payload = app.jwt.verify(token) as { id: number; username: string; role: string };
      const user = findUserById(payload.id);
      if (!user) {
        return reply.code(401).send({ error: "User no longer exists." });
      }
      return sanitizeUser(user);
    } catch {
      return reply.code(401).send({ error: "Invalid or expired token." });
    }
  });

  // Refresh — exchange a valid token for a fresh one with reset expiry
  app.post("/refresh", async (request, reply) => {
    const token = extractBearerToken(request);
    if (!token) {
      return reply.code(401).send({ error: "No bearer token provided." });
    }

    try {
      const payload = app.jwt.verify(token) as { id: number; username: string; role: string };
      const user = findUserById(payload.id);
      if (!user) {
        return reply.code(401).send({ error: "User no longer exists." });
      }
      const newToken = app.jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        { expiresIn: "7d" }
      );
      return { token: newToken, user: sanitizeUser(user) };
    } catch {
      return reply.code(401).send({ error: "Invalid or expired token." });
    }
  });
}
