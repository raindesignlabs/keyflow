/**
 * KeyFlow CRM — Backend Entry Point
 */

import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import jwt from "@fastify/jwt";
import { contactsRoutes } from "./routes/contacts.js";
import { activitiesRoutes } from "./routes/activities.js";
import { smartListsRoutes } from "./routes/smart-lists.js";
import { dealsRoutes } from "./routes/deals.js";
import { propertyRoutes } from "./routes/properties.js";
import { healthRoutes } from "./routes/health.js";
import { voiceCallsRoutes } from "./routes/voice-calls.js";
import { dashboardRoutes } from "./dashboard/routes.js";
import { notificationRoutes } from "./routes/notifications.js";
import { voiceHealthRoutes } from "./routes/voice-health.js";
import { contentStudioRoutes } from "./routes/content-studio.js";
import { dealTasksRoutes } from "./routes/deal-tasks.js";
import { bookingsRoutes, publicBookRoutes } from "./routes/bookings.js";
import { openHouseRoutes, publicOpenHouseRoutes } from "./routes/open-house.js";
import { authRoutes } from "./routes/auth.js";
import { registerApiAuth } from "./middleware/auth.js";
import { bootstrapSchedules, bootstrapVoiceHealth } from "./jobs/bootstrap.js";
import "./jobs/workers/daily-briefing.js";
import "./jobs/workers/voice-health.js";

const PORT = Number(process.env.PORT) || 3200;
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
  });

  // CORS
  const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3200").split(",").map((s) => s.trim());
  await app.register(cors, { origin: allowedOrigins, credentials: true });
  await app.register(cookie);
  await app.register(formbody);

  // JWT plugin — enables app.jwt.sign() and app.jwt.verify()
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || "keyflow-dev-secret-change-me",
  });

  // Guard the public REST API (/api/*). Must be registered after @fastify/cookie
  // so the session-cookie fallback can read request.cookies.
  // Runs AFTER jwt plugin so the hook can call app.jwt.verify().
  registerApiAuth(app);

  // Root redirect → dashboard login
  app.get("/", async (_req, reply) => {
    reply.redirect("/dashboard/login");
  });

  // Routes
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(healthRoutes, { prefix: "/api" });
  app.register(contactsRoutes, { prefix: "/api/contacts" });
  app.register(activitiesRoutes, { prefix: "/api/contacts/:contactId/activities" });
  app.register(smartListsRoutes, { prefix: "/api/smart-lists" });
  app.register(dealsRoutes, { prefix: "/api/deals" });
  app.register(propertyRoutes, { prefix: "/api" });
  app.register(voiceCallsRoutes, { prefix: "/api/voice-calls" });
  app.register(dashboardRoutes, { prefix: "/dashboard" });
  app.register(notificationRoutes, { prefix: "/api/notifications" });
  app.register(voiceHealthRoutes, { prefix: "/api" });

  // ── Quick Win Routes ────────────────────────────────────────────
  // AI Content Studio
  app.register(contentStudioRoutes, { prefix: "/api/content-studio" });
  // Transaction Checklists (nested under deals)
  app.register(dealTasksRoutes, { prefix: "/api/deals/:dealId/tasks" });
  // Self-Booking (internal API)
  app.register(bookingsRoutes, { prefix: "/api/bookings" });
  // Open House Management (internal API)
  app.register(openHouseRoutes, { prefix: "/api/open-house" });

  // ── Public Routes (no auth) ─────────────────────────────────────
  // Self-Booking public page
  app.register(publicBookRoutes, { prefix: "/public/book" });
  // Open House QR sign-in page
  app.register(publicOpenHouseRoutes, { prefix: "/public/openhouse" });

  // Start
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`KeyFlow CRM running on ${HOST}:${PORT}`);

    // Bootstrap BullMQ notification schedules
    await bootstrapSchedules();

    // Bootstrap voice agent health monitors
    await bootstrapVoiceHealth();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
