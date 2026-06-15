/**
 * Dashboard routes — serves the web UI and API.
 * Auth: session cookie (HTTP-only, 24h expiry).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { findUser, findUserById, checkPassword, listUsers, createUser, updateUser, changePassword, deleteUser } from "./users.js";
import type { DashboardUser } from "./users.js";
import { listJobs, getJob, getJobEvents, getStats, getDailyStats } from "./jobs-reader.js";
import { crmRoutes } from "./crm-routes.js";
import { createSession, getSession, deleteSession } from "./session.js";
import { getPilotSettings, savePilotSettings, type PilotSettings } from "./pilot-settings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_APP_DIR = path.resolve(process.cwd(), "dist/frontend/dashboard");
const DASHBOARD_APP_ASSETS_DIR = path.join(DASHBOARD_APP_DIR, "assets");

// Simple in-memory session store — managed via session.ts

// ── Login rate limiter ─────────────────────────────────────────────────
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const entry = loginAttempts.get(ip);
  if (!entry) return { allowed: true, retryAfterSec: 0 };
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.lockedUntil - Date.now()) / 1000) };
  }
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    loginAttempts.delete(ip);
    return { allowed: true, retryAfterSec: 0 };
  }
  return { allowed: true, retryAfterSec: 0 };
}

function recordFailedAttempt(ip: string) {
  const entry = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  loginAttempts.set(ip, entry);
}

function clearAttempts(ip: string) {
  loginAttempts.delete(ip);
}

// Periodically clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) {
    if (entry.lockedUntil && now >= entry.lockedUntil) {
      loginAttempts.delete(ip);
    }
  }
}, 10 * 60 * 1000);

function requireAuth(request: FastifyRequest, _reply: FastifyReply): DashboardUser | null {
  const token = (request.cookies as Record<string, string>)?.kf_session;
  if (!token) return null;
  const username = getSession(token);
  if (!username) return null;
  // Session can outlive the user (e.g. the account was deleted). Treat that as
  // unauthenticated and drop the orphaned session rather than crashing on a
  // non-null assertion downstream.
  const user = findUser(username);
  if (!user) {
    deleteSession(token);
    return null;
  }
  return user;
}

function dashboardAssetMime(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".css": return "text/css; charset=utf-8";
    case ".js": return "text/javascript; charset=utf-8";
    case ".map": return "application/json; charset=utf-8";
    case ".svg": return "image/svg+xml";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".woff": return "font/woff";
    case ".woff2": return "font/woff2";
    default: return "application/octet-stream";
  }
}

function sendDashboardApp(reply: FastifyReply) {
  const indexPath = path.join(DASHBOARD_APP_DIR, "index.html");
  if (!fs.existsSync(indexPath)) {
    return reply
      .code(503)
      .type("text/plain")
      .send("KeyFlow dashboard app has not been built. Run pnpm dashboard:build.");
  }
  return reply.type("text/html; charset=utf-8").send(fs.createReadStream(indexPath));
}

function sendDashboardAsset(assetPath: string, reply: FastifyReply) {
  const normalizedPath = path.normalize(assetPath).replace(/^\.\.[/\\]+/, "");
  const filePath = path.resolve(DASHBOARD_APP_ASSETS_DIR, normalizedPath);
  if (!filePath.startsWith(DASHBOARD_APP_ASSETS_DIR + path.sep)) {
    return reply.code(400).send({ error: "Invalid asset path" });
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return reply.code(404).send({ error: "Asset not found" });
  }
  reply.header("Cache-Control", "public, max-age=31536000, immutable");
  return reply.type(dashboardAssetMime(filePath)).send(fs.createReadStream(filePath));
}

export async function dashboardRoutes(app: FastifyInstance) {
  // Register CRM sub-routes
  await app.register(crmRoutes);

  // ── Login page ──────────────────────────────────────────────────────────
  app.get("/login", async (_req, reply) => {
    reply.type("text/html").send(loginHtml());
  });

  app.post<{ Body: { username: string; password: string } }>(
    "/login",
    async (request, reply) => {
      const ip = request.ip;
      const { allowed, retryAfterSec } = checkRateLimit(ip);
      if (!allowed) {
        return reply.type("text/html").send(
          loginHtml(`Too many failed attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.`)
        );
      }

      const { username, password } = request.body;
      const user = findUser(username);
      if (!user || !checkPassword(user, password)) {
        recordFailedAttempt(ip);
        return reply.type("text/html").send(loginHtml("Invalid username or password."));
      }

      clearAttempts(ip);
      const token = createSession(username);

      // If user must change password, redirect to password change page
      if (user.force_password_change) {
        reply
          .setCookie("kf_session", token, {
            httpOnly: true,
            path: "/dashboard",
            maxAge: 86400,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
          })
          .redirect("/dashboard/change-password?forced=1");
        return reply;
      }

      reply
        .setCookie("kf_session", token, {
          httpOnly: true,
          path: "/dashboard",
          maxAge: 86400,
          sameSite: "strict",
          secure: process.env.NODE_ENV === "production",
        })
        .redirect("/dashboard");
    }
  );

  app.get("/logout", async (_req, reply) => {
    reply.clearCookie("kf_session", { path: "/dashboard" }).redirect("/dashboard/login");
  });

  // ── Password change page (for forced changes after invite) ───────────────
  app.get("/change-password", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return reply.redirect("/dashboard/login");
    const forced = (request.query as Record<string, string>)?.forced === "1";
    reply.type("text/html").send(changePasswordHtml(user, forced));
    return reply;
  });

  // ── Forced password change API (no current password required) ────────────
  app.post<{ Body: { new: string } }>(
    "/api/force-change-password",
    async (request, reply) => {
      const user = requireAuth(request, reply);
      if (!user) return reply.code(401).send({ error: "Unauthorized" });
      if (!user.force_password_change) {
        return reply.code(403).send({ error: "Password change not required." });
      }
      const { new: newPass } = request.body;
      if (!newPass || newPass.length < 8) {
        return reply.code(400).send({ error: "Password must be at least 8 characters." });
      }
      changePassword(user.id, newPass, true);
      return { ok: true };
    }
  );

  // ── Dashboard v1.2 frontend assets ──────────────────────────────────────
  app.get<{ Params: { "*": string } }>("/assets/*", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    return sendDashboardAsset(request.params["*"], reply);
  });

  // ── Main dashboard UI ───────────────────────────────────────────────────
  app.get("/", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return reply.redirect("/dashboard/login");
    return sendDashboardApp(reply);
  });

  // ── Legacy operational dashboard ────────────────────────────────────────
  app.get("/legacy", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return reply.redirect("/dashboard/login");
    reply.type("text/html").send(dashboardHtml(user));
    return reply;
  });

  // ── SSE feed — live job updates every 15s ───────────────────────────────
  app.get("/stream", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return reply.code(401).send("Unauthorized");

    console.log(`[SSE] Connection from ${user.username}, client_id: ${user.client_id}`);

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const send = () => {
      const jobs = listJobs({ client_id: user.client_id ?? undefined, limit: 50 });
      const stats = getStats(user.client_id ?? undefined);
      const data = JSON.stringify({ jobs, stats, ts: new Date().toISOString() });
      console.log(`[SSE] Sending ${jobs.length} jobs to ${user.username}`);
      reply.raw.write(`data: ${data}\n\n`);
    };

    send(); // immediate first push
    const interval = setInterval(send, 15000);

    request.raw.on("close", () => {
      console.log(`[SSE] Connection closed for ${user.username}`);
      clearInterval(interval);
    });
  });

  // ── REST API ────────────────────────────────────────────────────────────
  app.get("/api/jobs", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    const q = request.query as Record<string, string>;
    return listJobs({
      client_id: user.client_id ?? q.client_id,
      job_type: q.job_type,
      status: q.status,
      limit: Number(q.limit) || 50,
      offset: Number(q.offset) || 0,
    });
  });

  app.get("/api/stats", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    return {
      stats: getStats(user.client_id ?? undefined),
      daily: getDailyStats(user.client_id ?? undefined, 7),
    };
  });

  // ── Current user context (for frontend auth display) ─────────────────────
  app.get("/api/me", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      client_id: user.client_id,
      organization_id: user.organization_id,
      display_name: user.display_name,
    };
  });

  // ── Pilot automation settings (per-user persistence) ──────────────────────
  app.get("/api/pilot/settings", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    return getPilotSettings(user.id);
  });

  app.put("/api/pilot/settings", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    const body = request.body as Partial<PilotSettings>;
    // Merge with existing settings so partial updates work
    const current = getPilotSettings(user.id);
    const updated: PilotSettings = {
      capability_modes: body.capability_modes ?? current.capability_modes,
      require_approval: body.require_approval ?? current.require_approval,
      escalation_rules: body.escalation_rules ?? current.escalation_rules,
    };
    savePilotSettings(user.id, updated);
    return { ok: true, settings: updated };
  });

  app.get<{ Params: { emailId: string; jobType: string } }>(
    "/api/jobs/:jobType/:emailId",
    async (request, reply) => {
      const user = requireAuth(request, reply);
      if (!user) return reply.code(401).send({ error: "Unauthorized" });
      const { emailId, jobType } = request.params;
      const job = getJob(emailId, jobType);
      if (!job) return reply.code(404).send({ error: "Not found" });
      // Scope check
      if (user.client_id && job.client_id !== user.client_id) {
        return reply.code(403).send({ error: "Forbidden" });
      }
      const events = getJobEvents(emailId, jobType);
      return { job, events };
    }
  );

  // ── Serve job output files (PDF, JSON) ─────────────────────────────────
  app.get<{ Params: { emailId: string; jobType: string; file: string } }>(
    "/files/:jobType/:emailId/:file",
    async (request, reply) => {
      const user = requireAuth(request, reply);
      if (!user) return reply.code(401).send({ error: "Unauthorized" });
      const { emailId, jobType, file } = request.params;
      const job = getJob(emailId, jobType);
      if (!job) return reply.code(404).send({ error: "Job not found" });
      if (user.client_id && job.client_id !== user.client_id) {
        return reply.code(403).send({ error: "Forbidden" });
      }
      // Resolve the file from the job's output paths
      const filePath = file.endsWith(".pdf") ? job.pdf_path
        : file.endsWith(".json") ? job.json_path
        : null;
      if (!filePath || !fs.existsSync(filePath)) {
        return reply.code(404).send({ error: "File not found" });
      }
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === ".pdf" ? "application/pdf"
        : ext === ".json" ? "application/json"
        : "application/octet-stream";
      const filename = path.basename(filePath);
      reply.header("Content-Type", mime);
      reply.header("Content-Disposition", `inline; filename="${filename}"`);
      return reply.send(fs.createReadStream(filePath));
    }
  );

  // ── Password change (any logged-in user) ───────────────────────────────
  app.post<{ Body: { current: string; new: string } }>(
    "/api/change-password",
    async (request, reply) => {
      const user = requireAuth(request, reply);
      if (!user) return reply.code(401).send({ error: "Unauthorized" });
      const { current, new: newPass } = request.body;
      if (!current || !newPass) {
        return reply.code(400).send({ error: "Current and new password required." });
      }
      if (newPass.length < 8) {
        return reply.code(400).send({ error: "Password must be at least 8 characters." });
      }
      if (!checkPassword(user, current)) {
        return reply.code(403).send({ error: "Current password is incorrect." });
      }
      changePassword(user.id, newPass);
      return { ok: true };
    }
  );

  // ── Admin: User management ─────────────────────────────────────────────
  function requireAdmin(request: FastifyRequest, reply: FastifyReply): DashboardUser | null {
    const user = requireAuth(request, reply);
    if (!user) return null;
    if (user.role !== "admin") return null;
    return user;
  }

  app.get("/api/users", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return reply.code(403).send({ error: "Admin only" });
    return listUsers();
  });

  app.post<{ Body: { username: string; password: string; role: string; client_id?: string; display_name?: string } }>(
    "/api/users",
    async (request, reply) => {
      const admin = requireAdmin(request, reply);
      if (!admin) return reply.code(403).send({ error: "Admin only" });
      const { username, password, role, client_id, display_name } = request.body;
      if (!username || !password) {
        return reply.code(400).send({ error: "Username and password required." });
      }
      if (password.length < 8) {
        return reply.code(400).send({ error: "Password must be at least 8 characters." });
      }
      if (!["admin", "client"].includes(role)) {
        return reply.code(400).send({ error: "Role must be admin or client." });
      }
      if (findUser(username)) {
        return reply.code(409).send({ error: "Username already exists." });
      }
      const user = createUser({
        username,
        password,
        role: role as "admin" | "client",
        client_id: client_id || null,
        display_name: display_name || username,
      });
      return { id: user.id, username: user.username, role: user.role };
    }
  );

  app.put<{ Params: { id: string }; Body: { role?: string; client_id?: string; display_name?: string } }>(
    "/api/users/:id",
    async (request, reply) => {
      const admin = requireAdmin(request, reply);
      if (!admin) return reply.code(403).send({ error: "Admin only" });
      const id = Number(request.params.id);
      const user = findUserById(id);
      if (!user) return reply.code(404).send({ error: "User not found." });
      const updated = updateUser(id, {
        role: request.body.role as "admin" | "client" | undefined,
        client_id: request.body.client_id,
        display_name: request.body.display_name,
      });
      return updated;
    }
  );

  app.post<{ Params: { id: string }; Body: { password: string } }>(
    "/api/users/:id/reset-password",
    async (request, reply) => {
      const admin = requireAdmin(request, reply);
      if (!admin) return reply.code(403).send({ error: "Admin only" });
      const id = Number(request.params.id);
      const user = findUserById(id);
      if (!user) return reply.code(404).send({ error: "User not found." });
      const { password } = request.body;
      if (!password || password.length < 8) {
        return reply.code(400).send({ error: "Password must be at least 8 characters." });
      }
      changePassword(id, password);
      return { ok: true };
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/users/:id",
    async (request, reply) => {
      const admin = requireAdmin(request, reply);
      if (!admin) return reply.code(403).send({ error: "Admin only" });
      const id = Number(request.params.id);
      if (admin.id === id) {
        return reply.code(400).send({ error: "Cannot delete yourself." });
      }
      const user = findUserById(id);
      if (!user) return reply.code(404).send({ error: "User not found." });
      deleteUser(id);
      return { ok: true };
    }
  );

  // ── Admin: Invite client (auto-generate username + temp password) ────────
  app.post<{
    Body: {
      display_name: string;
      email?: string;
      organization_id?: string;
      client_id?: string;
    };
  }>("/api/invite", async (request, reply) => {
    const admin = requireAdmin(request, reply);
    if (!admin) return reply.code(403).send({ error: "Admin only" });

    const { display_name, email, organization_id, client_id } = request.body;
    if (!display_name) {
      return reply.code(400).send({ error: "display_name is required." });
    }

    // Generate username from display name: lowercase, alphanumeric, no spaces
    const baseUsername = display_name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20);
    let username = baseUsername;
    let suffix = 1;
    while (findUser(username)) {
      username = `${baseUsername}${suffix}`;
      suffix++;
    }

    // Generate random temp password (12 chars, readable)
    const tempPassword = Array.from({ length: 12 }, () =>
      "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"[
        Math.floor(Math.random() * 56)
      ]
    ).join("");

    const user = createUser({
      username,
      password: tempPassword,
      role: "client",
      client_id: client_id || null,
      organization_id: organization_id || null,
      display_name,
      force_password_change: true,
    });

    return {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      temp_password: tempPassword,
      role: user.role,
      organization_id: user.organization_id,
      client_id: user.client_id,
      force_password_change: true,
    };
  });
}

// ── HTML Templates ────────────────────────────────────────────────────────

/** Escape a value for safe interpolation into server-rendered HTML. */
function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

function loginHtml(error?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KeyFlow — Sign In</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0a0f; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #12121a; border: 1px solid #1e1e2e; border-radius: 12px; padding: 2.5rem; width: 360px; }
    .logo { text-align: center; margin-bottom: 2rem; }
    .logo span { font-size: 1.5rem; font-weight: 700; color: #fff; letter-spacing: -0.5px; }
    .logo small { display: block; font-size: 0.75rem; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
    label { display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 6px; margin-top: 1.2rem; }
    input { width: 100%; padding: 0.65rem 0.85rem; background: #1e1e2e; border: 1px solid #2a2a3e; border-radius: 8px; color: #e2e8f0; font-size: 0.95rem; outline: none; }
    input:focus { border-color: #6366f1; }
    button { width: 100%; margin-top: 1.8rem; padding: 0.75rem; background: #6366f1; border: none; border-radius: 8px; color: #fff; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
    button:hover { background: #4f46e5; }
    .error { margin-top: 1rem; padding: 0.65rem 1rem; background: #3f1515; border: 1px solid #7f1d1d; border-radius: 8px; color: #fca5a5; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <span>KeyFlow</span>
      <small>by Rain Design Labs</small>
    </div>
    <form method="POST" action="/dashboard/login">
      <label>Username</label>
      <input type="text" name="username" autocomplete="username" required>
      <label>Password</label>
      <input type="password" name="password" autocomplete="current-password" required>
      ${error ? `<div class="error">${error}</div>` : ""}
      <button type="submit">Sign In</button>
    </form>
  </div>
</body>
</html>`;
}

function dashboardHtml(user: { display_name: string; role: string; client_id: string | null }): string {
  const isAdmin = user.role === "admin";
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KeyFlow Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0a0f; color: #e2e8f0; min-height: 100vh; }

    /* Nav */
    nav { background: #12121a; border-bottom: 1px solid #1e1e2e; padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; height: 56px; }
    .nav-brand { font-size: 1.15rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px; }
    .nav-brand span { font-size: 0.7rem; color: #64748b; letter-spacing: 2px; text-transform: uppercase; }
    .nav-right { display: flex; align-items: center; gap: 1rem; font-size: 0.85rem; color: #94a3b8; }
    .nav-right a { color: #94a3b8; text-decoration: none; }
    .nav-right a:hover { color: #e2e8f0; }
    .badge { padding: 2px 8px; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }
    .badge-admin { background: #1e1b4b; color: #a5b4fc; }
    .badge-client { background: #0f2d1f; color: #6ee7b7; }
    .live-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; display: inline-block; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

    /* Layout */
    main { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }

    /* Stats row */
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { background: #12121a; border: 1px solid #1e1e2e; border-radius: 10px; padding: 1.2rem 1.4rem; }
    .stat-card .label { font-size: 0.72rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; }
    .stat-card .value { font-size: 2rem; font-weight: 700; color: #fff; line-height: 1; }
    .stat-card.error .value { color: #f87171; }
    .stat-card.active .value { color: #fbbf24; }

    /* Filter bar */
    .filters { display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .filters select, .filters input { background: #12121a; border: 1px solid #1e1e2e; border-radius: 8px; color: #e2e8f0; padding: 0.5rem 0.8rem; font-size: 0.85rem; outline: none; }
    .filters select:focus, .filters input:focus { border-color: #6366f1; }

    /* Job table */
    .table-wrap { background: #12121a; border: 1px solid #1e1e2e; border-radius: 10px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { background: #0a0a0f; color: #64748b; text-align: left; padding: 0.75rem 1rem; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1e1e2e; }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid #1a1a2a; vertical-align: middle; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #1a1a2a; cursor: pointer; }
    .status { padding: 3px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; white-space: nowrap; }
    .s-approval_sent, .s-customer_sent { background: #0f2d1f; color: #6ee7b7; }
    .s-failed_dead_letter { background: #3f1515; color: #fca5a5; }
    .s-failed_retryable { background: #3f2a0a; color: #fcd34d; }
    .s-parsing, .s-building_pdf, .s-downloading { background: #1e1b4b; color: #a5b4fc; }
    .s-received, .s-reading_email, .s-source_saved { background: #1a1a2a; color: #94a3b8; }
    .type-tag { padding: 2px 7px; border-radius: 6px; font-size: 0.7rem; background: #1e1e2e; color: #94a3b8; }

    /* Detail panel */
    .panel { position: fixed; top: 0; right: -420px; width: 420px; height: 100vh; background: #12121a; border-left: 1px solid #1e1e2e; overflow-y: auto; transition: right 0.25s ease; z-index: 100; padding: 1.5rem; }
    .panel.open { right: 0; }
    .panel-close { float: right; background: none; border: none; color: #64748b; font-size: 1.2rem; cursor: pointer; }
    .panel h2 { font-size: 1rem; margin-bottom: 1rem; color: #fff; }
    .panel-field { margin-bottom: 0.8rem; }
    .panel-field label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 3px; }
    .panel-field p { font-size: 0.85rem; color: #e2e8f0; word-break: break-all; }
    .timeline { margin-top: 1rem; }
    .timeline-item { display: flex; gap: 0.75rem; margin-bottom: 0.75rem; }
    .timeline-dot { width: 8px; height: 8px; border-radius: 50%; background: #6366f1; margin-top: 6px; flex-shrink: 0; }
    .timeline-item .ts { font-size: 0.7rem; color: #64748b; }
    .timeline-item .msg { font-size: 0.8rem; color: #e2e8f0; }
    .error-box { background: #1a0a0a; border: 1px solid #7f1d1d; border-radius: 8px; padding: 0.75rem; margin-top: 0.5rem; font-size: 0.75rem; color: #fca5a5; white-space: pre-wrap; max-height: 200px; overflow-y: auto; }

    /* Empty state */
    .empty { text-align: center; padding: 4rem 2rem; color: #64748b; }
    .empty p { margin-top: 0.5rem; font-size: 0.85rem; }

    /* Tabs */
    .tabs { display: flex; gap: 0; border-bottom: 1px solid #1e1e2e; margin-bottom: 1.5rem; }
    .tab { padding: 0.65rem 1.1rem; font-size: 0.85rem; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.15s; user-select: none; }
    .tab:hover { color: #e2e8f0; }
    .tab.active { color: #a5b4fc; border-bottom-color: #6366f1; font-weight: 600; }
    .tab-panel { display: none; }
    .tab-panel.active { display: block; }

    /* Attention banner */
    .attention { background: #1a0f00; border: 1px solid #78350f; border-radius: 10px; padding: 0.9rem 1.1rem; margin-bottom: 1.2rem; display: none; }
    .attention.has-items { display: block; }
    .attention-title { font-size: 0.72rem; color: #f59e0b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 0.5rem; }
    .attention-item { font-size: 0.82rem; color: #fcd34d; padding: 0.25rem 0; display: flex; justify-content: space-between; }
    .attention-item span { color: #92400e; font-size: 0.75rem; }

    /* Pipeline Kanban */
    .pipeline { display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem; align-items: flex-start; }
    .pipeline::-webkit-scrollbar { height: 5px; }
    .pipeline::-webkit-scrollbar-track { background: #0a0a0f; }
    .pipeline::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 3px; }
    .pipeline-col { flex: 0 0 220px; background: #0d0d14; border: 1px solid #1e1e2e; border-radius: 10px; padding: 0.75rem; min-height: 200px; }
    .pipeline-col-header { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; }
    .pipeline-col-header .count { background: #1e1e2e; color: #94a3b8; border-radius: 999px; padding: 1px 7px; font-size: 0.65rem; }
    .deal-card { background: #12121a; border: 1px solid #1e1e2e; border-radius: 8px; padding: 0.7rem 0.8rem; margin-bottom: 0.5rem; cursor: pointer; transition: border-color 0.15s; }
    .deal-card:hover { border-color: #6366f1; }
    .deal-card-name { font-size: 0.85rem; font-weight: 600; color: #e2e8f0; margin-bottom: 0.2rem; }
    .deal-card-title { font-size: 0.75rem; color: #64748b; margin-bottom: 0.4rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .deal-card-meta { display: flex; justify-content: space-between; align-items: center; }
    .deal-card-value { font-size: 0.78rem; color: #6ee7b7; font-weight: 600; }
    .deal-card-age { font-size: 0.7rem; color: #4b5563; }
    .deal-card-action { font-size: 0.72rem; color: #a5b4fc; margin-top: 0.35rem; font-style: italic; }
    .deal-stale { border-color: #78350f !important; }

    /* Contacts list */
    .contact-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .contact-row { background: #12121a; border: 1px solid #1e1e2e; border-radius: 8px; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 1rem; cursor: pointer; transition: border-color 0.15s; }
    .contact-row:hover { border-color: #6366f1; }
    .contact-avatar { width: 36px; height: 36px; border-radius: 50%; background: #1e1b4b; color: #a5b4fc; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; flex-shrink: 0; }
    .contact-info { flex: 1; min-width: 0; }
    .contact-info strong { color: #e2e8f0; font-size: 0.9rem; }
    .contact-info .sub { font-size: 0.75rem; color: #64748b; }
    .contact-meta { text-align: right; flex-shrink: 0; }
    .contact-meta .deal-badge { font-size: 0.7rem; background: #1e1e2e; color: #94a3b8; padding: 2px 8px; border-radius: 999px; }
    .contact-meta .followup { font-size: 0.7rem; color: #f59e0b; margin-top: 2px; }
    .contact-status { padding: 2px 7px; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }
    .cs-new { background: #1e1e2e; color: #94a3b8; }
    .cs-contacted { background: #1e1b4b; color: #a5b4fc; }
    .cs-qualified { background: #0f2d1f; color: #6ee7b7; }
    .cs-negotiation { background: #3f2a0a; color: #fcd34d; }
    .cs-closed_won { background: #0f2d1f; color: #6ee7b7; }
    .cs-closed_lost { background: #3f1515; color: #fca5a5; }
    .cs-nurture { background: #1e1e2e; color: #94a3b8; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; display: flex; align-items: center; justify-content: center; }
    .modal-overlay.hidden { display: none; }
    .modal { background: #12121a; border: 1px solid #1e1e2e; border-radius: 12px; padding: 1.5rem; width: 90%; max-width: 520px; max-height: 80vh; overflow-y: auto; }
    .modal h2 { font-size: 1.1rem; margin-bottom: 1rem; color: #fff; }
    .modal-close { float: right; background: none; border: none; color: #64748b; font-size: 1.2rem; cursor: pointer; }
    .modal label { display: block; font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; margin-top: 0.6rem; }
    .modal input, .modal select { width: 100%; background: #0a0a0f; border: 1px solid #1e1e2e; border-radius: 6px; color: #e2e8f0; padding: 0.5rem 0.7rem; font-size: 0.85rem; outline: none; margin-bottom: 0.3rem; }
    .modal input:focus, .modal select:focus { border-color: #6366f1; }
    .modal .btn { display: inline-block; padding: 0.5rem 1rem; border-radius: 6px; border: none; font-size: 0.85rem; cursor: pointer; font-weight: 600; margin-top: 0.8rem; margin-right: 0.5rem; }
    .btn-primary { background: #6366f1; color: #fff; }
    .btn-primary:hover { background: #4f46e5; }
    .btn-danger { background: #7f1d1d; color: #fca5a5; }
    .btn-danger:hover { background: #991b1b; }
    .btn-secondary { background: #1e1e2e; color: #94a3b8; }
    .btn-secondary:hover { background: #2a2a3e; }
    .modal .msg { font-size: 0.8rem; margin-top: 0.5rem; padding: 0.4rem 0.6rem; border-radius: 4px; }
    .msg-ok { background: #0f2d1f; color: #6ee7b7; }
    .msg-err { background: #3f1515; color: #fca5a5; }

    /* User list */
    .user-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0; border-bottom: 1px solid #1a1a2a; font-size: 0.85rem; }
    .user-row:last-child { border-bottom: none; }
    .user-row .user-info { flex: 1; }
    .user-row .user-info strong { color: #e2e8f0; }
    .user-row .user-info span { color: #64748b; font-size: 0.75rem; margin-left: 0.5rem; }

    /* Job cards (mobile) */
    .job-cards { display: none; }
    .job-card { background: #12121a; border: 1px solid #1e1e2e; border-radius: 10px; padding: 0.9rem 1rem; margin-bottom: 0.6rem; cursor: pointer; }
    .job-card:hover { border-color: #6366f1; }
    .job-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; }
    .job-card-top strong { color: #e2e8f0; font-size: 0.9rem; }
    .job-card-mid { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.35rem; }
    .job-card-sub { font-size: 0.78rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .job-card-time { font-size: 0.72rem; color: #4b5563; }

    /* ── Mobile responsive ─────────────────────────────────────────────── */
    @media (max-width: 640px) {
      nav { padding: 0 0.75rem; height: 50px; }
      .nav-brand { font-size: 1rem; }
      .nav-brand span { display: none; }
      .nav-right { gap: 0.5rem; font-size: 0.75rem; }
      .nav-right .live-dot { display: none; }
      .nav-right .hide-mobile { display: none; }

      main { padding: 0.75rem; }

      .stats { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; margin-bottom: 1rem; }
      .stat-card { padding: 0.8rem; }
      .stat-card .value { font-size: 1.5rem; }
      .stat-card .label { font-size: 0.65rem; }

      .filters { flex-direction: column; gap: 0.5rem; }
      .filters select, .filters input { width: 100%; padding: 0.6rem 0.8rem; font-size: 0.9rem; }

      /* Hide table, show cards */
      .table-wrap table { display: none; }
      .job-cards { display: block; }

      /* Full-screen panel */
      .panel { width: 100%; right: -100%; }
      .panel.open { right: 0; }

      /* Modal tweaks */
      .modal { width: 96%; max-height: 90vh; padding: 1rem; border-radius: 10px; }
      .modal .btn { padding: 0.65rem 1.2rem; font-size: 0.9rem; }
      .user-row { flex-wrap: wrap; }
      .user-row .btn { font-size: 0.7rem !important; }
    }
  </style>
</head>
<body>

<nav>
  <div class="nav-brand">
    KeyFlow <span>by RDL</span>
  </div>
  <div class="nav-right">
    <span class="live-dot"></span> <span class="hide-mobile">Live</span>
    &nbsp;&nbsp;
    ${escapeHtml(user.display_name)}
    <span class="badge badge-${escapeHtml(user.role)}">${escapeHtml(user.role)}</span>
    ${isAdmin ? '<a href="#" onclick="showUsers(event)">Users</a>' : ''}
    <a href="#" onclick="showPasswordModal(event)">Password</a>
    <a href="/dashboard/logout">Sign out</a>
  </div>
</nav>

<main>
  <div class="stats" id="stats"></div>

  <!-- Needs attention -->
  <div class="attention" id="attention-banner">
    <div class="attention-title">⚠ Needs Attention</div>
    <div id="attention-items"></div>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <div class="tab active" onclick="switchTab('pipeline', this)">Pipeline</div>
    <div class="tab" onclick="switchTab('contacts', this)">Contacts</div>
    <div class="tab" onclick="switchTab('jobs', this)">AI Jobs</div>
  </div>

  <!-- Pipeline tab -->
  <div class="tab-panel active" id="tab-pipeline">
    <div class="pipeline" id="pipeline-board"></div>
  </div>

  <!-- Contacts tab -->
  <div class="tab-panel" id="tab-contacts">
    <div class="contact-list" id="contacts-list"></div>
  </div>

  <!-- Jobs tab -->
  <div class="tab-panel" id="tab-jobs">
    <div class="filters">
      <select id="filter-status" onchange="applyFilters()">
        <option value="">All statuses</option>
        <option value="approval_sent">✅ Completed</option>
        <option value="failed_dead_letter">❌ Failed</option>
        <option value="failed_retryable">⚠️ Retrying</option>
        <option value="parsing">🔄 In Progress</option>
      </select>
      ${isAdmin ? `
      <select id="filter-client" onchange="applyFilters()">
        <option value="">All clients</option>
        <option value="dominguez-diana">Diana Dominguez</option>
      </select>
      <select id="filter-type" onchange="applyFilters()">
        <option value="">All types</option>
        <option value="closing_timeline">Closing Timeline</option>
        <option value="property_survey">Property Survey</option>
      </select>` : ""}
      <input type="text" id="filter-search" placeholder="Search subject / name..." oninput="applyFilters()" style="min-width:200px">
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Client / Name</th>
            <th>Type</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody id="jobs-table"></tbody>
      </table>
      <div id="empty-state" class="empty" style="display:none">
        <strong>No jobs yet</strong>
        <p>Jobs appear here when emails are processed by the AI assistant.</p>
      </div>
      <div class="job-cards" id="jobs-cards"></div>
    </div>
  </div>
</main>

<!-- Detail panel -->
<div class="panel" id="detail-panel">
  <button class="panel-close" onclick="closePanel()">✕</button>
  <h2 id="panel-title">Job Detail</h2>
  <div id="panel-content"></div>
</div>

<!-- Password change modal -->
<div class="modal-overlay hidden" id="pw-modal">
  <div class="modal">
    <button class="modal-close" onclick="closePwModal()">✕</button>
    <h2>Change Password</h2>
    <label>Current Password</label>
    <input type="password" id="pw-current" autocomplete="current-password">
    <label>New Password</label>
    <input type="password" id="pw-new" autocomplete="new-password">
    <label>Confirm New Password</label>
    <input type="password" id="pw-confirm" autocomplete="new-password">
    <div id="pw-msg"></div>
    <button class="btn btn-primary" onclick="submitPwChange()">Update Password</button>
  </div>
</div>

<!-- Admin: User management modal -->
`;

  if (isAdmin) {
    html += `
<div class="modal-overlay hidden" id="users-modal">
  <div class="modal">
    <button class="modal-close" onclick="closeUsersModal()">✕</button>
    <h2>User Management</h2>
    <div id="users-list"></div>
    <hr style="border-color:#1e1e2e; margin: 1rem 0;">
    <h2 style="font-size:0.9rem;">Add New User</h2>
    <label>Username</label>
    <input type="text" id="new-username" autocomplete="off">
    <label>Display Name</label>
    <input type="text" id="new-displayname" autocomplete="off">
    <label>Password</label>
    <input type="password" id="new-password" autocomplete="new-password">
    <label>Role</label>
    <select id="new-role">
      <option value="client">Client</option>
      <option value="admin">Admin</option>
    </select>
    <label>Client ID (client role only)</label>
    <input type="text" id="new-clientid" placeholder="e.g. dominguez-diana" autocomplete="off">
    <div id="new-user-msg"></div>
    <button class="btn btn-primary" onclick="addUser()">Create User</button>
  </div>
</div>
`;
  }

  html += `

<script>
console.log('[KeyFlow] JavaScript loaded - starting SSE connection');
const IS_ADMIN = ${isAdmin};
let allJobs = [];
let allStats = {};

// ── Escaping helpers (job/email data is attacker-influenced → prevent XSS) ──
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
// For values interpolated inside a single-quoted JS string in an inline handler.
function escJs(v) {
  return String(v == null ? '' : v)
    .replace(/\\\\/g, '\\\\\\\\')
    .replace(/'/g, "\\\\'")
    .replace(/"/g, '&quot;')
    .replace(/</g, '\\\\x3c')
    .replace(/\\r?\\n/g, ' ');
}

// ── SSE ──────────────────────────────────────────────────────────────────
console.log('[KeyFlow] Creating EventSource to /dashboard/stream');
const sse = new EventSource('/dashboard/stream');
sse.onmessage = (e) => {
  console.log('[KeyFlow] SSE message received:', e.data.substring(0, 100));
  try {
    const payload = JSON.parse(e.data);
    allJobs = payload.jobs;
    allStats = payload.stats;
    renderStats(allStats);
    applyFilters();
  } catch (err) {
    console.error('SSE parse error:', err);
  }
};
sse.onerror = (err) => {
  console.error('[KeyFlow] SSE connection error:', err);
  sse.close();
  // Show error to user
  document.getElementById('stats').innerHTML = '<div class="stat-card error"><div class="label">Connection Error</div><div class="value">Unable to load data. Refresh the page.</div></div>';
};

// ── Stats ─────────────────────────────────────────────────────────────────
function renderStats(s) {
  document.getElementById('stats').innerHTML = \`
    <div class="stat-card"><div class="label">Total Jobs</div><div class="value">\${s.total}</div></div>
    <div class="stat-card"><div class="label">Completed</div><div class="value" style="color:#6ee7b7">\${s.completed}</div></div>
    <div class="stat-card active"><div class="label">In Progress</div><div class="value">\${s.in_progress}</div></div>
    <div class="stat-card error"><div class="label">Errors</div><div class="value">\${s.failed}</div></div>
    <div class="stat-card"><div class="label">Last 24h</div><div class="value">\${s.last_24h}</div></div>
    \${IS_ADMIN ? \`<div class="stat-card"><div class="label">Active Clients</div><div class="value">\${s.clients ? s.clients.length : 0}</div></div>\` : ''}
  \`;
}

// ── Filters ───────────────────────────────────────────────────────────────
function applyFilters() {
  const status = document.getElementById('filter-status')?.value || '';
  const client = document.getElementById('filter-client')?.value || '';
  const type = document.getElementById('filter-type')?.value || '';
  const search = (document.getElementById('filter-search')?.value || '').toLowerCase();

  const filtered = allJobs.filter(j => {
    if (status && j.status !== status) return false;
    if (client && j.client_id !== client) return false;
    if (type && j.job_type !== type) return false;
    if (search && !j.display_name.toLowerCase().includes(search) && !j.subject.toLowerCase().includes(search)) return false;
    return true;
  });
  renderTable(filtered);
}

// ── Table ─────────────────────────────────────────────────────────────────
function renderTable(jobs) {
  const tbody = document.getElementById('jobs-table');
  const cards = document.getElementById('jobs-cards');
  const empty = document.getElementById('empty-state');
  if (!jobs.length) {
    tbody.innerHTML = '';
    cards.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  // Desktop table
  tbody.innerHTML = jobs.map(j => \`
    <tr onclick="openPanel('\${escJs(j.email_id)}', '\${escJs(j.job_type)}')">
      <td>\${esc(j.display_name || '—')}</td>
      <td><span class="type-tag">\${esc(j.job_type.replace('_', ' '))}</span></td>
      <td title="\${esc(j.subject)}">\${esc(j.subject)}</td>
      <td><span class="status s-\${esc(j.status)}">\${esc(formatStatus(j.status))}</span></td>
      <td>\${esc(relativeTime(j.updated_at))}</td>
    </tr>
  \`).join('');
  // Mobile cards
  cards.innerHTML = jobs.map(j => \`
    <div class="job-card" onclick="openPanel('\${escJs(j.email_id)}', '\${escJs(j.job_type)}')">
      <div class="job-card-top">
        <strong>\${esc(j.display_name || '—')}</strong>
        <span class="status s-\${esc(j.status)}">\${esc(formatStatus(j.status))}</span>
      </div>
      <div class="job-card-mid">
        <span class="type-tag">\${esc(j.job_type.replace('_', ' '))}</span>
      </div>
      <div class="job-card-sub">\${esc(j.subject)}</div>
      <div class="job-card-time">\${esc(relativeTime(j.updated_at))}</div>
    </div>
  \`).join('');
}

function formatStatus(s) {
  return {
    approval_sent: '✅ Sent',
    customer_sent: '✅ Delivered',
    failed_dead_letter: '❌ Failed',
    failed_retryable: '⚠️ Retrying',
    parsing: '🔄 Parsing',
    building_pdf: '🔄 Building PDF',
    downloading: '🔄 Downloading',
    received: '📥 Received',
    reading_email: '📖 Reading',
    source_saved: '💾 Saved',
    parsed: '✔ Parsed',
    pdf_built: '✔ PDF Built',
    sending_approval: '📤 Sending',
  }[s] || s;
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

// ── Detail panel ──────────────────────────────────────────────────────────
async function openPanel(emailId, jobType) {
  const res = await fetch(\`/dashboard/api/jobs/\${jobType}/\${emailId}\`);
  if (!res.ok) return;
  const { job, events } = await res.json();

  document.getElementById('panel-title').textContent = job.display_name || job.subject;

  const fields = [
    ['Status', \`<span class="status s-\${esc(job.status)}">\${esc(formatStatus(job.status))}</span>\`],
    ['Type', esc(job.job_type.replace('_', ' '))],
    ['Client', esc(job.client_id)],
    ['Subject', esc(job.subject)],
    ['Created', esc(new Date(job.created_at).toLocaleString())],
    ['Updated', esc(new Date(job.updated_at).toLocaleString())],
    ...(job.attempts > 1 ? [['Attempts', esc(job.attempts)]] : []),
    ...(job.pdf_path ? [['PDF', \`<a href="/dashboard/files/\${encodeURIComponent(job.job_type)}/\${encodeURIComponent(job.email_id)}/\${encodeURIComponent(job.pdf_path.split('/').pop())}" target="_blank" style="color:#6366f1">\${esc(job.pdf_path.split('/').pop())}</a>\`]] : []),
  ];

  let html = fields.map(([k, v]) => \`
    <div class="panel-field"><label>\${esc(k)}</label><p>\${v}</p></div>
  \`).join('');

  if (job.last_error) {
    html += \`<div class="panel-field"><label>Error</label><div class="error-box">\${esc(job.last_error.slice(0, 800))}</div></div>\`;
  }

  if (events.length) {
    html += '<div class="timeline">' + events.map(e => \`
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div>
          <div class="ts">\${esc(new Date(e.created_at).toLocaleTimeString())}</div>
          <div class="msg">\${esc(e.message || e.event_type)}</div>
        </div>
      </div>
    \`).join('') + '</div>';
  }

  document.getElementById('panel-content').innerHTML = html;
  document.getElementById('detail-panel').classList.add('open');
}

function closePanel() {
  document.getElementById('detail-panel').classList.remove('open');
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePanel(); closePwModal(); closeUsersModal(); } });

// ── Password change ──────────────────────────────────────────────────
function showPasswordModal(e) { e.preventDefault(); document.getElementById('pw-modal').classList.remove('hidden'); }
function closePwModal() { document.getElementById('pw-modal').classList.add('hidden'); document.getElementById('pw-msg').innerHTML = ''; }

async function submitPwChange() {
  const current = document.getElementById('pw-current').value;
  const newP = document.getElementById('pw-new').value;
  const confirm = document.getElementById('pw-confirm').value;
  const msg = document.getElementById('pw-msg');
  if (newP !== confirm) { msg.innerHTML = '<div class="msg msg-err">Passwords do not match.</div>'; return; }
  if (newP.length < 8) { msg.innerHTML = '<div class="msg msg-err">Password must be at least 8 characters.</div>'; return; }
  const res = await fetch('/dashboard/api/change-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current, new: newP })
  });
  if (res.ok) { msg.innerHTML = '<div class="msg msg-ok">Password updated successfully.</div>'; document.getElementById('pw-current').value = ''; document.getElementById('pw-new').value = ''; document.getElementById('pw-confirm').value = ''; }
  else { const data = await res.json(); msg.innerHTML = \`<div class="msg msg-err">\${data.error}</div>\`; }
}

// ── Admin: User management ──────────────────────────────────────────
function showUsers(e) { e.preventDefault(); loadUsers(); document.getElementById('users-modal').classList.remove('hidden'); }
function closeUsersModal() { document.getElementById('users-modal').classList.add('hidden'); }

async function loadUsers() {
  const res = await fetch('/dashboard/api/users');
  if (!res.ok) return;
  const users = await res.json();
  const html = users.map(u => \`
    <div class="user-row">
      <div class="user-info">
        <strong>\${esc(u.display_name)}</strong>
        <span>\${esc(u.username)}</span>
        <span class="badge badge-\${esc(u.role)}">\${esc(u.role)}</span>
        \${u.client_id ? \`<span style="color:#64748b">\${esc(u.client_id)}</span>\` : ''}
      </div>
      <button class="btn btn-secondary" onclick="resetUserPw(\${Number(u.id)}, '\${escJs(u.username)}')" style="font-size:0.75rem;padding:0.3rem 0.6rem">Reset PW</button>
      <button class="btn btn-danger" onclick="deleteUserBtn(\${Number(u.id)}, '\${escJs(u.username)}')" style="font-size:0.75rem;padding:0.3rem 0.6rem">Remove</button>
    </div>
  \`).join('');
  document.getElementById('users-list').innerHTML = html;
}

async function addUser() {
  const msg = document.getElementById('new-user-msg');
  const body = {
    username: document.getElementById('new-username').value,
    display_name: document.getElementById('new-displayname').value,
    password: document.getElementById('new-password').value,
    role: document.getElementById('new-role').value,
    client_id: document.getElementById('new-clientid').value,
  };
  if (!body.username || !body.password) { msg.innerHTML = '<div class="msg msg-err">Username and password required.</div>'; return; }
  const res = await fetch('/dashboard/api/users', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (res.ok) { msg.innerHTML = '<div class="msg msg-ok">User created.</div>'; document.getElementById('new-username').value = ''; document.getElementById('new-displayname').value = ''; document.getElementById('new-password').value = ''; document.getElementById('new-clientid').value = ''; loadUsers(); }
  else { const data = await res.json(); msg.innerHTML = \`<div class="msg msg-err">\${data.error}</div>\`; }
}

async function resetUserPw(id, username) {
  const pw = prompt('Enter new password for ' + username + ' (min 8 chars):');
  if (!pw) return;
  const res = await fetch(\`/dashboard/api/users/\${id}/reset-password\`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw })
  });
  if (res.ok) alert('Password reset for ' + username);
  else { const data = await res.json(); alert('Error: ' + data.error); }
}

async function deleteUserBtn(id, username) {
  if (!confirm('Delete user "' + username + '"? This cannot be undone.')) return;
  const res = await fetch(\`/dashboard/api/users/\${id}\`, { method: 'DELETE' });
  if (res.ok) loadUsers();
  else { const data = await res.json(); alert('Error: ' + data.error); }
}

// ── Tabs ─────────────────────────────────────────────────────────────
function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'pipeline' && !pipelineLoaded) loadPipeline();
  if (name === 'contacts' && !contactsLoaded) loadContacts();
}

// ── Attention banner ──────────────────────────────────────────────────
let pipelineLoaded = false;
let contactsLoaded = false;

async function loadAttention() {
  try {
    const res = await fetch('/dashboard/api/crm/attention');
    if (!res.ok) return;
    const { stalled, followups } = await res.json();
    const all = [...stalled, ...followups];
    const banner = document.getElementById('attention-banner');
    const items = document.getElementById('attention-items');
    if (!all.length) { banner.classList.remove('has-items'); return; }
    banner.classList.add('has-items');
    items.innerHTML = all.map(i => \`
      <div class="attention-item">\${esc(i.label)} <span>\${esc(i.detail)}</span></div>
    \`).join('');
  } catch(e) {}
}

// ── Pipeline ──────────────────────────────────────────────────────────
async function loadPipeline() {
  try {
    const res = await fetch('/dashboard/api/crm/pipeline');
    if (!res.ok) return;
    const { stages, labels, pipeline } = await res.json();
    pipelineLoaded = true;
    const board = document.getElementById('pipeline-board');
    board.innerHTML = stages.map(stage => {
      const cards = pipeline[stage] || [];
      return \`
        <div class="pipeline-col">
          <div class="pipeline-col-header">
            \${labels[stage] || stage}
            <span class="count">\${cards.length}</span>
          </div>
          \${cards.length ? cards.map(deal => \`
            <div class="deal-card \${deal.days_in_stage >= 7 ? 'deal-stale' : ''}" onclick="openDealPanel('\${deal.id}')">
              <div class="deal-card-name">\${deal.contact_name}</div>
              <div class="deal-card-title">\${deal.property_address || deal.title}</div>
              <div class="deal-card-meta">
                \${deal.value ? \`<span class="deal-card-value">$\${Number(deal.value).toLocaleString()}</span>\` : '<span></span>'}
                <span class="deal-card-age">\${deal.days_in_stage}d</span>
              </div>
              \${deal.ai_next_action ? \`<div class="deal-card-action">\${deal.ai_next_action}</div>\` : ''}
            </div>
          \`).join('') : '<div style="color:#4b5563;font-size:0.78rem;text-align:center;padding:1rem 0">Empty</div>'}
        </div>
      \`;
    }).join('');
  } catch(e) {}
}

async function openDealPanel(dealId) {
  // CRM feature disabled - syntax error in embedded JS
  // TODO: Refactor client-side JS out of backend template
  console.warn('Deal panel not yet implemented');
}

async function moveDeal(dealId) {
  // CRM feature disabled
  console.warn('Move deal not yet implemented');
}

async function loadPipeline() {
  // CRM feature disabled
  console.warn('Pipeline not yet implemented');
}

async function loadContacts() {
  // CRM feature disabled
  console.warn('Contacts not yet implemented');
}

async function openContactPanel(contactId) {
  // CRM feature disabled
  console.warn('Contact panel not yet implemented');
}

// Load on page init
loadPipeline();
loadAttention();
</script>
</body>
</html>`;
  return html;
}

function changePasswordHtml(user: { display_name: string; force_password_change: number }, forced: boolean): string {
  const title = forced ? "Change Your Password" : "Update Password";
  const message = forced
    ? "Welcome to KeyFlow! For security, please create a new password before continuing."
    : "Update your password.";
  const redirectUrl = forced ? "/dashboard" : "/dashboard/legacy";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KeyFlow — ${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0a0f; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #12121a; border: 1px solid #1e1e2e; border-radius: 12px; padding: 2.5rem; width: 400px; }
    .logo { text-align: center; margin-bottom: 1.5rem; }
    .logo span { font-size: 1.5rem; font-weight: 700; color: #fff; letter-spacing: -0.5px; }
    .logo small { display: block; font-size: 0.75rem; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
    .message { text-align: center; color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; line-height: 1.5; }
    .message strong { color: #e2e8f0; }
    label { display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 6px; margin-top: 1.2rem; }
    input { width: 100%; padding: 0.65rem 0.85rem; background: #1e1e2e; border: 1px solid #2a2a3e; border-radius: 8px; color: #e2e8f0; font-size: 0.95rem; outline: none; }
    input:focus { border-color: #6366f1; }
    .hint { font-size: 0.75rem; color: #64748b; margin-top: 4px; }
    .error { margin-top: 1rem; padding: 0.65rem 1rem; background: #3f1515; border: 1px solid #7f1d1d; border-radius: 8px; color: #fca5a5; font-size: 0.85rem; display: none; }
    .success { margin-top: 1rem; padding: 0.65rem 1rem; background: #132e1e; border: 1px solid #1d7f3d; border-radius: 8px; color: #86efac; font-size: 0.85rem; display: none; }
    button { width: 100%; margin-top: 1.8rem; padding: 0.75rem; background: #6366f1; border: none; border-radius: 8px; color: #fff; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
    button:hover { background: #4f46e5; }
    button:disabled { background: #374151; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <span>KeyFlow</span>
      <small>by Rain Design Labs</small>
    </div>
    <div class="message">${message}</div>
    <form id="pwForm" onsubmit="return handleSubmit(event)">
      <label>New Password</label>
      <input type="password" id="newPass" required minlength="8" autocomplete="new-password">
      <div class="hint">Minimum 8 characters</div>
      <label>Confirm Password</label>
      <input type="password" id="confirmPass" required minlength="8" autocomplete="new-password">
      <div id="error" class="error"></div>
      <div id="success" class="success">Password updated! Redirecting...</div>
      <button type="submit" id="submitBtn">${forced ? "Set Password & Continue" : "Update Password"}</button>
    </form>
  </div>
  <script>
async function handleSubmit(e) {
  e.preventDefault();
  const newPass = document.getElementById('newPass').value;
  const confirmPass = document.getElementById('confirmPass').value;
  const errorDiv = document.getElementById('error');
  const successDiv = document.getElementById('success');
  const btn = document.getElementById('submitBtn');

  if (newPass !== confirmPass) {
    errorDiv.textContent = 'Passwords do not match.';
    errorDiv.style.display = 'block';
    return false;
  }
  if (newPass.length < 8) {
    errorDiv.textContent = 'Password must be at least 8 characters.';
    errorDiv.style.display = 'block';
    return false;
  }

  btn.disabled = true;
  errorDiv.style.display = 'none';

  const endpoint = ${forced} ? '/dashboard/api/force-change-password' : '/dashboard/api/change-password';
  const body = ${forced} ? JSON.stringify({ new: newPass }) : JSON.stringify({ current: document.getElementById('currentPass')?.value || '', new: newPass });

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: ${forced} ? JSON.stringify({ new: newPass }) : JSON.stringify({ current: '', new: newPass })
    });
    const data = await res.json();
    if (res.ok) {
      successDiv.style.display = 'block';
      setTimeout(() => window.location.href = '${redirectUrl}', 1500);
    } else {
      errorDiv.textContent = data.error || 'Failed to update password.';
      errorDiv.style.display = 'block';
      btn.disabled = false;
    }
  } catch (err) {
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
    btn.disabled = false;
  }
  return false;
}
  </script>
</body>
</html>`;
}
