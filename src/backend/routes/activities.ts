/**
 * KeyFlow CRM — Activities API Routes
 */

import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { activities, contacts } from "../models/schema.js";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";

// Validation schemas
const activityCreateSchema = z.object({
  type: z.enum(["call", "text", "email", "note", "ai_interaction", "website_visit", "appointment", "deal_update"]),
  direction: z.enum(["inbound", "outbound"]).optional(),
  subject: z.string().max(500).optional(),
  body: z.string().optional(),
  status: z.enum(["draft", "pending_approval", "approved", "sent", "completed"]).optional(),
  metadata: z.record(z.unknown()).optional(),
  userId: z.string().uuid().optional(),
});

const activityUpdateSchema = activityCreateSchema.partial();

export async function activitiesRoutes(app: FastifyInstance) {
  // List activities for a contact
  app.get("/", async (request) => {
    const { contactId } = request.params as { contactId: string };
    const { limit = "50", offset = "0" } = request.query as any;

    // Verify contact exists
    const contact = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
    if (!contact || contact.length === 0) {
      throw { statusCode: 404, message: "Contact not found" };
    }

    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offsetNum = Math.max(0, parseInt(offset, 10));

    const [{ count }, results] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(activities)
        .where(eq(activities.contactId, contactId))
        .then((r) => r[0]),
      db
        .select()
        .from(activities)
        .where(eq(activities.contactId, contactId))
        .orderBy(desc(activities.createdAt))
        .limit(limitNum)
        .offset(offsetNum),
    ]);

    return {
      activities: results,
      total: Number(count),
      limit: limitNum,
      offset: offsetNum,
    };
  });

  // Add activity
  app.post("/", async (request, reply) => {
    const { contactId } = request.params as { contactId: string };
    const data = activityCreateSchema.parse(request.body);

    // Verify contact exists
    const contact = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
    if (!contact || contact.length === 0) {
      throw { statusCode: 404, message: "Contact not found" };
    }

    const [activity] = await db
      .insert(activities)
      .values({
        contactId,
        type: data.type,
        direction: data.direction ?? null,
        subject: data.subject ?? null,
        body: data.body ?? null,
        status: data.status ?? "completed",
        metadata: data.metadata ?? null,
        userId: data.userId ?? null,
      })
      .returning();

    reply.code(201);
    return { activity };
  });

  // Get single activity
  app.get("/:activityId", async (request) => {
    const { contactId, activityId } = request.params as { contactId: string; activityId: string };

    const result = await db
      .select()
      .from(activities)
      .where(eq(activities.id, activityId))
      .limit(1);

    if (!result || result.length === 0 || result[0].contactId !== contactId) {
      throw { statusCode: 404, message: "Activity not found" };
    }

    return { activity: result[0] };
  });

  // Update activity
  app.patch("/:activityId", async (request) => {
    const { contactId, activityId } = request.params as { contactId: string; activityId: string };
    const data = activityUpdateSchema.parse(request.body);

    const existing = await db
      .select()
      .from(activities)
      .where(eq(activities.id, activityId))
      .limit(1);

    if (!existing || existing.length === 0 || existing[0].contactId !== contactId) {
      throw { statusCode: 404, message: "Activity not found" };
    }

    const [updated] = await db
      .update(activities)
      .set({
        ...(data.type !== undefined && { type: data.type }),
        ...(data.direction !== undefined && { direction: data.direction ?? null }),
        ...(data.subject !== undefined && { subject: data.subject ?? null }),
        ...(data.body !== undefined && { body: data.body ?? null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.metadata !== undefined && { metadata: data.metadata ?? null }),
      })
      .where(eq(activities.id, activityId))
      .returning();

    return { activity: updated };
  });

  // Delete activity
  app.delete("/:activityId", async (request) => {
    const { contactId, activityId } = request.params as { contactId: string; activityId: string };

    const existing = await db
      .select()
      .from(activities)
      .where(eq(activities.id, activityId))
      .limit(1);

    if (!existing || existing.length === 0 || existing[0].contactId !== contactId) {
      throw { statusCode: 404, message: "Activity not found" };
    }

    await db.delete(activities).where(eq(activities.id, activityId));

    return { deleted: true, id: activityId };
  });
}
