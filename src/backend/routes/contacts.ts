/**
 * KeyFlow CRM — Contacts API Routes
 */

import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { contacts, organizations } from "../models/schema.js";
import { eq, ilike, and, sql, desc, asc, or } from "drizzle-orm";
import { z } from "zod";

// Validation schemas
const contactCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  status: z.enum(["new", "contacted", "qualified", "negotiation", "closed_won", "closed_lost", "nurture"]).optional(),
  leadScore: z.number().min(0).max(100).optional(),
  source: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
  communicationStyle: z.object({
    tone: z.string().optional(),
    preferredChannel: z.enum(["email", "text", "phone"]).optional(),
    responseTime: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
});

const contactUpdateSchema = contactCreateSchema.partial();

export async function contactsRoutes(app: FastifyInstance) {
  // List contacts with filtering, sorting, pagination
  app.get("/", async (request) => {
    const {
      search,
      status,
      tags,
      sort = "created_at",
      order = "desc",
      page = "1",
      limit = "25",
    } = request.query as any;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    // Build query conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(contacts.firstName, `%${search}%`),
          ilike(contacts.lastName, `%${search}%`),
          ilike(contacts.email, `%${search}%`),
        )
      );
    }

    if (status) {
      conditions.push(eq(contacts.status, status));
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      conditions.push(sql`${contacts.tags} && ${tagArray}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sort direction
    const sortColumn =
      sort === "created_at"
        ? contacts.createdAt
        : sort === "updated_at"
        ? contacts.updatedAt
        : sort === "lead_score"
        ? contacts.leadScore
        : sort === "last_contacted_at"
        ? contacts.lastContactedAt
        : contacts.createdAt;
    const sortFn = order === "asc" ? asc : desc;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(whereClause);

    // Get contacts
    const results = await db
      .select()
      .from(contacts)
      .where(whereClause)
      .leftJoin(organizations, eq(contacts.organizationId, organizations.id))
      .orderBy(sortFn(sortColumn))
      .limit(limitNum)
      .offset(offset);

    // Transform results to flatten organization data
    const contactList = results.map((row) => ({
      ...row.contacts,
      organization: row.organizations,
    }));

    return {
      contacts: contactList,
      total: Number(count),
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(Number(count) / limitNum),
    };
  });

  // Search contacts (full-text)
  app.get("/search", async (request) => {
    const { q } = request.query as { q?: string };

    if (!q || q.length < 2) {
      return { results: [] };
    }

    const results = await db
      .select()
      .from(contacts)
      .leftJoin(organizations, eq(contacts.organizationId, organizations.id))
      .where(
        or(
          ilike(contacts.firstName, `%${q}%`),
          ilike(contacts.lastName, `%${q}%`),
          ilike(contacts.email, `%${q}%`),
          ilike(contacts.phone, `%${q}%`),
        )
      )
      .limit(20);

    return {
      results: results.map((row) => ({
        ...row.contacts,
        organization: row.organizations,
      })),
    };
  });

  // Get single contact with full timeline
  app.get("/:id", async (request) => {
    const { id } = request.params as { id: string };

    const result = await db
      .select()
      .from(contacts)
      .leftJoin(organizations, eq(contacts.organizationId, organizations.id))
      .where(eq(contacts.id, id))
      .limit(1);

    if (!result || result.length === 0) {
      throw { statusCode: 404, message: "Contact not found" };
    }

    return {
      contact: {
        ...result[0].contacts,
        organization: result[0].organizations,
      },
    };
  });

  // Create contact
  app.post("/", async (request, reply) => {
    const data = contactCreateSchema.parse(request.body);

    const [contact] = await db
      .insert(contacts)
      .values({
        firstName: data.firstName,
        lastName: data.lastName ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        organizationId: data.organizationId ?? null,
        status: data.status ?? "new",
        leadScore: data.leadScore ?? 0,
        source: data.source ?? null,
        tags: data.tags ?? [],
        customFields: data.customFields ?? null,
        communicationStyle: data.communicationStyle ?? null,
        nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
      })
      .returning();

    reply.code(201);
    return { contact };
  });

  // Update contact
  app.patch("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const data = contactUpdateSchema.parse(request.body);

    const [updated] = await db
      .update(contacts)
      .set({
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName ?? null }),
        ...(data.email !== undefined && { email: data.email ?? null }),
        ...(data.phone !== undefined && { phone: data.phone ?? null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.leadScore !== undefined && { leadScore: data.leadScore }),
        ...(data.source !== undefined && { source: data.source ?? null }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.customFields !== undefined && { customFields: data.customFields ?? null }),
        ...(data.communicationStyle !== undefined && { communicationStyle: data.communicationStyle ?? null }),
        ...(data.nextFollowUpAt !== undefined && {
          nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
        }),
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, id))
      .returning();

    if (!updated) {
      throw { statusCode: 404, message: "Contact not found" };
    }

    return { contact: updated };
  });

  // Delete contact
  app.delete("/:id", async (request) => {
    const { id } = request.params as { id: string };

    const [deleted] = await db.delete(contacts).where(eq(contacts.id, id)).returning();

    if (!deleted) {
      throw { statusCode: 404, message: "Contact not found" };
    }

    return { deleted: true, id };
  });

}