/**
 * CRM API routes — pipeline, contacts, needs-attention, voice-calls.
 *
 * All routes are scoped by the authenticated user's organization_id.
 * Admin users see all data; client-role users see only their own org.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { getSession, deleteSession } from "./session.js";
import { findUser, type DashboardUser } from "./users.js";

export const STAGE_LABELS: Record<string, string> = {
  new_lead:       "New Lead",
  active_client:  "Active Client",
  under_contract: "Under Contract",
  inspection:     "Inspection",
  appraisal:      "Appraisal",
  clear_to_close: "Clear to Close",
  closed:         "Closed",
};

export const PIPELINE_STAGES = Object.keys(STAGE_LABELS);

/**
 * Resolve the authenticated dashboard user from the session cookie.
 * Returns null if unauthenticated or the session is orphaned.
 */
function requireAuthUser(request: FastifyRequest, _reply: FastifyReply): DashboardUser | null {
  const token = (request.cookies as Record<string, string>)?.kf_session;
  if (!token) return null;
  const username = getSession(token);
  if (!username) return null;
  const user = findUser(username);
  if (!user) {
    deleteSession(token);
    return null;
  }
  return user;
}

function sendUnauthorized(reply: FastifyReply): null {
  reply.code(401).send({ error: "Unauthorized" });
  return null;
}

/**
 * Returns a parameterized SQL fragment for org-scoping on a given table alias.
 * Admins get an empty fragment (no filter). Clients without an org_id get
 * a guaranteed-false clause so they see nothing (fail-safe).
 */
function orgFilter(user: DashboardUser, alias: string) {
  if (user.role === "admin") return sql``;
  if (!user.organization_id) return sql`AND FALSE`;
  return sql`AND ${sql.identifier(alias)}.organization_id = ${user.organization_id}::uuid`;
}

export async function crmRoutes(app: FastifyInstance) {

  // GET /api/crm/pipeline
  app.get("/api/crm/pipeline", async (request, reply) => {
    const user = requireAuthUser(request, reply);
    if (!user) return sendUnauthorized(reply);
    const scope = orgFilter(user, "c");
    try {
      const rows = await db.execute(sql`
        SELECT
          d.id, d.title, d.stage, d.value, d.close_date, d.ai_next_action, d.updated_at, d.contact_id,
          EXTRACT(EPOCH FROM (NOW() - d.updated_at)) / 86400 AS days_in_stage,
          c.first_name || ' ' || COALESCE(c.last_name, '') AS contact_name,
          c.email AS contact_email,
          c.phone AS contact_phone,
          p.address AS property_address
        FROM deals d
        JOIN contacts c ON d.contact_id = c.id
        LEFT JOIN properties p ON p.contact_id = c.id
        WHERE 1=1 ${scope}
        ORDER BY d.updated_at DESC
      `);

      const pipeline: Record<string, any[]> = {};
      for (const stage of PIPELINE_STAGES) pipeline[stage] = [];

      for (const row of rows as any[]) {
        const stage = row.stage as string;
        if (!pipeline[stage]) pipeline[stage] = [];
        pipeline[stage].push({
          id: row.id,
          title: row.title,
          stage,
          value: row.value ? Number(row.value) : null,
          close_date: row.close_date,
          ai_next_action: row.ai_next_action,
          days_in_stage: Math.floor(Number(row.days_in_stage ?? 0)),
          contact_id: row.contact_id,
          contact_name: row.contact_name?.trim() || "Unknown",
          contact_email: row.contact_email,
          contact_phone: row.contact_phone,
          property_address: row.property_address,
          updated_at: row.updated_at,
        });
      }

      return { stages: PIPELINE_STAGES, labels: STAGE_LABELS, pipeline };
    } catch (err: any) {
      request.log.error(err);
      return reply.code(500).send({ error: "DB error" });
    }
  });

  // PATCH /api/crm/deals/:id/stage
  app.patch<{ Params: { id: string }; Body: { stage: string } }>(
    "/api/crm/deals/:id/stage",
    async (request, reply) => {
      const user = requireAuthUser(request, reply);
      if (!user) return sendUnauthorized(reply);
      const { id } = request.params;
      const { stage } = request.body;
      if (!PIPELINE_STAGES.includes(stage)) {
        return reply.code(400).send({ error: "Invalid stage" });
      }

      // Client users can only update deals in their own org
      const scope = user.role === "admin"
        ? sql``
        : user.organization_id
          ? sql`AND contact_id IN (SELECT id FROM contacts WHERE organization_id = ${user.organization_id}::uuid)`
          : sql`AND FALSE`;

      try {
        await db.execute(sql`
          UPDATE deals SET stage = ${stage}, updated_at = NOW()
          WHERE id = ${id}::uuid ${scope}
        `);
        return { ok: true };
      } catch (err: any) {
        request.log.error(err);
        return reply.code(500).send({ error: "DB error" });
      }
    }
  );

  // GET /api/crm/contacts
  app.get("/api/crm/contacts", async (request, reply) => {
    const user = requireAuthUser(request, reply);
    if (!user) return sendUnauthorized(reply);
    const scope = orgFilter(user, "c");
    try {
      const rows = await db.execute(sql`
        SELECT
          c.id, c.first_name, c.last_name, c.email, c.phone,
          c.status, c.lead_score, c.source,
          c.last_contacted_at, c.next_follow_up_at,
          c.created_at, c.updated_at,
          COUNT(d.id) AS deal_count
        FROM contacts c
        LEFT JOIN deals d ON d.contact_id = c.id
        WHERE 1=1 ${scope}
        GROUP BY c.id
        ORDER BY c.updated_at DESC
      `);
      return (rows as any[]).map((r: any) => ({
        id: r.id,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        phone: r.phone,
        status: r.status,
        lead_score: r.lead_score,
        source: r.source,
        last_contacted_at: r.last_contacted_at,
        next_follow_up_at: r.next_follow_up_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
        deal_count: Number(r.deal_count),
      }));
    } catch (err: any) {
      request.log.error(err);
      return reply.code(500).send({ error: "DB error" });
    }
  });

  // GET /api/crm/contacts/:id
  app.get<{ Params: { id: string } }>(
    "/api/crm/contacts/:id",
    async (request, reply) => {
      const user = requireAuthUser(request, reply);
      if (!user) return sendUnauthorized(reply);
      const { id } = request.params;

      // Scope check: client users can only see their own org's contacts
      const orgFilterById = user.role === "admin"
        ? sql``
        : user.organization_id
          ? sql`AND organization_id = ${user.organization_id}::uuid`
          : sql`AND FALSE`;

      try {
        const contactRows = await db.execute(sql`
          SELECT * FROM contacts WHERE id = ${id}::uuid ${orgFilterById}
        `);
        const contact = (contactRows as any[])[0];
        if (!contact) return reply.code(404).send({ error: "Not found" });

        const deals = await db.execute(sql`
          SELECT id, title, stage, value, close_date, ai_next_action, updated_at
          FROM deals WHERE contact_id = ${id}::uuid ORDER BY updated_at DESC
        `);

        const activities = await db.execute(sql`
          SELECT id, type, direction, subject, body, ai_summary, created_at
          FROM activities WHERE contact_id = ${id}::uuid ORDER BY created_at DESC LIMIT 20
        `);

        const properties = await db.execute(sql`
          SELECT id, address, bedrooms, full_bathrooms, year_built
          FROM properties WHERE contact_id = ${id}::uuid
        `);

        return {
          contact,
          deals: deals as any[],
          activities: activities as any[],
          properties: properties as any[],
        };
      } catch (err: any) {
        request.log.error(err);
        return reply.code(500).send({ error: "DB error" });
      }
    }
  );

  // GET /api/crm/attention
  app.get("/api/crm/attention", async (request, reply) => {
    const user = requireAuthUser(request, reply);
    if (!user) return sendUnauthorized(reply);
    const dealScope = orgFilter(user, "c");
    try {
      const stalledRows = await db.execute(sql`
        SELECT d.id, d.title, d.stage,
          c.first_name || ' ' || COALESCE(c.last_name, '') AS contact_name,
          EXTRACT(EPOCH FROM (NOW() - d.updated_at)) / 86400 AS days_stale
        FROM deals d
        JOIN contacts c ON d.contact_id = c.id
        WHERE d.stage != 'closed'
          AND d.updated_at < NOW() - INTERVAL '7 days'
          ${dealScope}
        ORDER BY d.updated_at ASC
        LIMIT 10
      `);

      const followupScope = orgFilter(user, "c");
      const followupRows = await db.execute(sql`
        SELECT c.id, c.first_name || ' ' || COALESCE(c.last_name, '') AS contact_name,
          c.next_follow_up_at
        FROM contacts c
        WHERE c.next_follow_up_at < NOW()
          ${followupScope}
        ORDER BY c.next_follow_up_at ASC
        LIMIT 10
      `);

      const stalled = (stalledRows as any[]).map((r: any) => ({
        type: "stalled_deal",
        id: r.id,
        label: `${r.contact_name} — ${r.title}`,
        detail: `${Math.floor(Number(r.days_stale))}d in ${STAGE_LABELS[r.stage] ?? r.stage}`,
      }));

      const followups = (followupRows as any[]).map((r: any) => ({
        type: "overdue_followup",
        id: r.id,
        label: r.contact_name,
        detail: `Follow-up was due ${new Date(r.next_follow_up_at).toLocaleDateString()}`,
      }));

      return { stalled, followups, total: stalled.length + followups.length };
    } catch (err: any) {
      request.log.error(err);
      return reply.code(500).send({ error: "DB error" });
    }
  });

  // GET /api/crm/voice-calls
  app.get("/api/crm/voice-calls", async (request, reply) => {
    const user = requireAuthUser(request, reply);
    if (!user) return sendUnauthorized(reply);
    const { limit = 25, offset = 0 } = request.query as any;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offsetNum = Math.max(0, parseInt(offset, 10));

    // Voice calls are org-scoped via organization_id on the voice_calls table
    const orgFilterCalls = user.role === "admin"
      ? sql``
      : user.organization_id
        ? sql`WHERE organization_id = ${user.organization_id}::uuid`
        : sql`WHERE FALSE`;

    try {
      const rows = await db.execute(sql`
        SELECT
          id, call_id, caller_phone, caller_name, mode, duration_seconds,
          sentiment, summary, started_at, ended_at, model, llm_provider, topics
        FROM voice_calls
        ${orgFilterCalls}
        ORDER BY started_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `);

      const total = await db.execute(sql`
        SELECT COUNT(*) as count FROM voice_calls ${orgFilterCalls}
      `);

      return {
        calls: rows,
        total: Number((total[0] as any).count),
        limit: limitNum,
        offset: offsetNum,
      };
    } catch (err: any) {
      request.log.error(err);
      return reply.code(500).send({ error: "DB error" });
    }
  });
}
