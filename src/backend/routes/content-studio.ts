/**
 * KeyFlow CRM — AI Content Studio Routes
 *
 * POST   /api/content-studio/generate     — Generate content (AI or template)
 * GET    /api/content-studio/drafts        — List saved drafts
 * GET    /api/content-studio/drafts/:id    — Get single draft
 * PATCH  /api/content-studio/drafts/:id    — Update draft (edit content, change status)
 * DELETE /api/content-studio/drafts/:id    — Delete draft
 * GET    /api/content-studio/types         — List available content types
 */

import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { contentDrafts, contacts, properties, users } from "../models/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { generateContent, CONTENT_TYPES, type ContentType } from "../services/content-studio.js";

const generateSchema = z.object({
  type: z.enum(["property_description", "follow_up_email", "social_caption", "listing_copy", "market_update"]),
  prompt: z.string().max(2000).optional(),
  contactId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  variants: z.number().min(1).max(3).optional(),
  // Org/user context (from API key or session — passed by caller)
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  // Whether to save the generated content as a draft
  save: z.boolean().default(true),
});

const updateDraftSchema = z.object({
  content: z.string().optional(),
  status: z.enum(["draft", "approved", "sent", "archived"]).optional(),
  title: z.string().max(255).optional(),
});

export async function contentStudioRoutes(app: FastifyInstance) {
  // ── List content types ────────────────────────────────────────────
  app.get("/types", async () => {
    return { types: CONTENT_TYPES };
  });

  // ── Generate content ──────────────────────────────────────────────
  app.post("/generate", async (request, reply) => {
    const body = generateSchema.parse(request.body);

    // Fetch linked CRM records for context
    let contactRecord: typeof contacts.$inferSelect | null = null;
    let propertyRecord: typeof properties.$inferSelect | null = null;
    let userRecord: typeof users.$inferSelect | null = null;

    if (body.contactId) {
      const [c] = await db.select().from(contacts).where(eq(contacts.id, body.contactId)).limit(1);
      contactRecord = c || null;
    }

    if (body.propertyId) {
      const [p] = await db.select().from(properties).where(eq(properties.id, body.propertyId)).limit(1);
      propertyRecord = p || null;
    }

    const [user] = await db.select().from(users).where(eq(users.id, body.userId)).limit(1);
    userRecord = user || null;

    // Generate content via AI
    const result = await generateContent({
      type: body.type as ContentType,
      prompt: body.prompt,
      contact: contactRecord
        ? {
            firstName: contactRecord.firstName,
            lastName: contactRecord.lastName,
            email: contactRecord.email,
            status: contactRecord.status,
            communicationStyle: contactRecord.communicationStyle,
          }
        : undefined,
      property: propertyRecord
        ? {
            address: propertyRecord.address,
            bedrooms: propertyRecord.bedrooms,
            bathrooms: propertyRecord.fullBathrooms,
            yearBuilt: propertyRecord.yearBuilt,
            notes: propertyRecord.negotiationItems,
            marketingNotes: propertyRecord.marketingLoveNotes,
          }
        : undefined,
      voiceProfile: userRecord?.voiceProfile,
      organizationName: undefined, // could fetch org name
      agentName: userRecord?.name,
      variants: body.variants,
    });

    // Save as draft
    let draft = null;
    if (body.save) {
      [draft] = await db
        .insert(contentDrafts)
        .values({
          organizationId: body.organizationId,
          userId: body.userId,
          type: body.type,
          content: result.content,
          prompt: body.prompt ?? null,
          contactId: body.contactId ?? null,
          propertyId: body.propertyId ?? null,
          dealId: body.dealId ?? null,
          model: result.model,
          voiceProfileUsed: result.voiceProfileUsed,
          variants: result.variants ?? null,
        })
        .returning();
    }

    reply.code(201);
    return {
      content: result.content,
      variants: result.variants,
      model: result.model,
      draft,
    };
  });

  // ── List drafts ───────────────────────────────────────────────────
  app.get("/drafts", async (request) => {
    const { organizationId, type, status, page = "1", limit = "25" } = request.query as any;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (organizationId) conditions.push(eq(contentDrafts.organizationId, organizationId));
    if (type) conditions.push(eq(contentDrafts.type, type));
    if (status) conditions.push(eq(contentDrafts.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select()
      .from(contentDrafts)
      .where(whereClause)
      .orderBy(desc(contentDrafts.createdAt))
      .limit(limitNum)
      .offset(offset);

    return { drafts: results, page: pageNum, limit: limitNum };
  });

  // ── Get single draft ──────────────────────────────────────────────
  app.get("/drafts/:id", async (request) => {
    const { id } = request.params as { id: string };
    const [draft] = await db.select().from(contentDrafts).where(eq(contentDrafts.id, id)).limit(1);

    if (!draft) {
      throw { statusCode: 404, message: "Draft not found" };
    }

    return { draft };
  });

  // ── Update draft ──────────────────────────────────────────────────
  app.patch("/drafts/:id", async (request) => {
    const { id } = request.params as { id: string };
    const data = updateDraftSchema.parse(request.body);

    const [updated] = await db
      .update(contentDrafts)
      .set({
        ...(data.content !== undefined && { content: data.content }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.title !== undefined && { title: data.title }),
        updatedAt: new Date(),
      })
      .where(eq(contentDrafts.id, id))
      .returning();

    if (!updated) {
      throw { statusCode: 404, message: "Draft not found" };
    }

    return { draft: updated };
  });

  // ── Delete draft ──────────────────────────────────────────────────
  app.delete("/drafts/:id", async (request) => {
    const { id } = request.params as { id: string };
    const [deleted] = await db.delete(contentDrafts).where(eq(contentDrafts.id, id)).returning();

    if (!deleted) {
      throw { statusCode: 404, message: "Draft not found" };
    }

    return { deleted: true, id };
  });
}
