/**
 * KeyFlow CRM — Voice Calls Routes
 *
 * Endpoints for tracking and retrieving AI voice agent calls
 * - POST /api/voice-calls — ingest a call from RDL Voice Agent
 * - GET /api/voice-calls — list calls
 * - GET /api/voice-calls/:callId — get call details
 */

import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { voiceCalls } from "../models/schema.js";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

// ── Validation ──────────────────────────────────────────────────────────────

const IngestCallPayloadSchema = z.object({
  callId: z.string(),
  organizationId: z.string().uuid(),
  callerPhone: z.string().optional(),
  callerName: z.string().optional(),
  mode: z.enum(["prospect", "admin", "client"]).default("prospect"),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().optional(),
  durationSeconds: z.number().optional(),
  model: z.string().optional(),
  llmProvider: z.enum(["openai", "z.ai", "anthropic"]).optional(),
  transcript: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
  summary: z.string().optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  topics: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

type IngestCallPayload = z.infer<typeof IngestCallPayloadSchema>;

// ── Routes ──────────────────────────────────────────────────────────────────

export async function voiceCallsRoutes(app: FastifyInstance) {
  // ── POST / — Ingest call from voice agent ──
  app.post<{ Body: IngestCallPayload }>("/", async (req, res) => {
    try {
      const data = IngestCallPayloadSchema.parse(req.body);

      // Check if call already exists (avoid duplicates)
      const existing = await db
        .select()
        .from(voiceCalls)
        .where(eq(voiceCalls.callId, data.callId))
        .limit(1);

      if (existing.length > 0) {
        return res.code(409).send({
          success: false,
          message: "Call already exists",
          callId: data.callId,
        });
      }

      // Insert call
      const [call] = await db
        .insert(voiceCalls)
        .values({
          callId: data.callId,
          organizationId: data.organizationId,
          callerPhone: data.callerPhone,
          callerName: data.callerName,
          mode: data.mode,
          startedAt: data.startedAt,
          endedAt: data.endedAt,
          durationSeconds: data.durationSeconds ? String(data.durationSeconds) : null,
          model: data.model,
          llmProvider: data.llmProvider,
          transcript: data.transcript || [],
          summary: data.summary,
          sentiment: data.sentiment,
          topics: data.topics || [],
          metadata: data.metadata || {},
        })
        .returning();

      return res.code(201).send({
        success: true,
        message: "Call ingested",
        call,
      });
    } catch (err: any) {
      console.error("Error ingesting voice call:", err);
      return res.code(400).send({
        success: false,
        message: err.message || "Invalid request",
      });
    }
  });

  // ── GET / — List calls ──
  app.get("/", async (req, res) => {
    try {
      const { organizationId, limit = "50", offset = "0" } = req.query as any;

      if (!organizationId) {
        return res.code(400).send({
          success: false,
          message: "organizationId query parameter required",
        });
      }

      // List calls, most recent first
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
      const offsetNum = Math.max(0, parseInt(offset, 10));

      const calls = await db
        .select()
        .from(voiceCalls)
        .where(eq(voiceCalls.organizationId, organizationId))
        .orderBy(desc(voiceCalls.startedAt))
        .limit(limitNum)
        .offset(offsetNum);

      return res.send({
        success: true,
        calls,
        count: calls.length,
      });
    } catch (err: any) {
      console.error("Error listing voice calls:", err);
      return res.code(500).send({
        success: false,
        message: "Internal error",
      });
    }
  });

  // ── GET /:callId — Get call details ──
  app.get<{ Params: { callId: string } }>("/:callId", async (req, res) => {
    try {
      const { organizationId } = req.query as any;

      if (!organizationId) {
        return res.code(400).send({
          success: false,
          message: "organizationId query parameter required",
        });
      }

      const call = await db
        .select()
        .from(voiceCalls)
        .where(
          and(
            eq(voiceCalls.callId, req.params.callId),
            eq(voiceCalls.organizationId, organizationId)
          )
        )
        .limit(1);

      if (call.length === 0) {
        return res.code(404).send({
          success: false,
          message: "Call not found",
        });
      }

      return res.send({
        success: true,
        call: call[0],
      });
    } catch (err: any) {
      console.error("Error fetching voice call:", err);
      return res.code(500).send({
        success: false,
        message: "Internal error",
      });
    }
  });
}
