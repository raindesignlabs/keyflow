/**
 * Voice Agent Health Status Route
 * GET /api/voice-health
 */

import { FastifyInstance } from "fastify";
import { getHealthState } from "../jobs/workers/voice-health.js";

export async function voiceHealthRoutes(app: FastifyInstance) {
  app.get("/voice-health", async (_req, reply) => {
    const state = getHealthState();

    reply.send({
      agent: {
        status: state.agentStatus,
        port: 7860,
        url: "https://voice.raindesignlabs.net",
      },
      tunnel: {
        status: state.tunnelStatus,
        service: "cloudflared-tunnel.service",
      },
      lastCheck: state.lastCheck,
      consecutiveFailures: state.consecutiveFailures,
    });
  });
}
