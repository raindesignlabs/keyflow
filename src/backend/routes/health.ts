/**
 * KeyFlow CRM — Health Check
 */

import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    status: "ok",
    service: "keyflow-crm",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  }));
}
