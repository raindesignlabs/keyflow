/**
 * KeyFlow CRM — Deals API Routes
 */

import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { deals, pipelines, contacts } from "../models/schema.js";
import { eq, and, ilike, desc, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { autoSeedDealTasks } from "./deal-tasks.js";

// Validation schemas
const dealCreateSchema = z.object({
  title: z.string().min(1, "Deal title is required"),
  contactId: z.string().uuid("Contact ID must be a valid UUID"),
  pipelineId: z.string().uuid("Pipeline ID must be a valid UUID"),
  stage: z.string().min(1, "Stage is required").optional(),
  value: z.string().optional(), // decimal as string
  closeDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional(),
  assignedUserId: z.string().uuid().optional(),
});

const dealUpdateSchema = dealCreateSchema.partial().omit({ contactId: true });

export async function dealsRoutes(app: FastifyInstance) {
  // List deals (with stage filtering)
  app.get("/", async (request) => {
    const {
      stage,
      pipelineId,
      contactId,
      search,
      sort = "updated_at",
      order = "desc",
      page = "1",
      limit = "25",
    } = request.query as any;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    // Build conditions
    const conditions = [];

    if (stage) {
      conditions.push(eq(deals.stage, stage));
    }

    if (pipelineId) {
      conditions.push(eq(deals.pipelineId, pipelineId));
    }

    if (contactId) {
      conditions.push(eq(deals.contactId, contactId));
    }

    if (search) {
      conditions.push(ilike(deals.title, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sort
    const sortColumn =
      sort === "value"
        ? deals.value
        : sort === "close_date"
        ? deals.closeDate
        : deals.updatedAt;
    const sortFn = order === "asc" ? asc : desc;

    const [{ count }, results] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(deals).where(whereClause).then((r) => r[0]),
      db
        .select()
        .from(deals)
        .where(whereClause)
        .leftJoin(contacts, eq(deals.contactId, contacts.id))
        .leftJoin(pipelines, eq(deals.pipelineId, pipelines.id))
        .orderBy(sortFn(sortColumn))
        .limit(limitNum)
        .offset(offset),
    ]);

    const dealList = results.map((row: any) => ({
      ...row.deals,
      contact: row.contacts,
      pipeline: row.pipelines,
    }));

    return {
      deals: dealList,
      total: Number(count),
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(Number(count) / limitNum),
    };
  });

  // Get single deal
  app.get("/:id", async (request) => {
    const { id } = request.params as { id: string };

    const result = await db
      .select()
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(pipelines, eq(deals.pipelineId, pipelines.id))
      .where(eq(deals.id, id))
      .limit(1);

    if (!result || result.length === 0) {
      throw { statusCode: 404, message: "Deal not found" };
    }

    return {
      deal: {
        ...(result[0] as any).deals,
        contact: (result[0] as any).contacts,
        pipeline: (result[0] as any).pipelines,
      },
    };
  });

  // Create deal
  app.post("/", async (request, reply) => {
    const data = dealCreateSchema.parse(request.body);

    // Verify contact exists
    const contact = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, data.contactId))
      .limit(1);

    if (!contact || contact.length === 0) {
      throw { statusCode: 404, message: "Contact not found" };
    }

    // Verify pipeline exists
    const pipeline = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, data.pipelineId))
      .limit(1);

    if (!pipeline || pipeline.length === 0) {
      throw { statusCode: 404, message: "Pipeline not found" };
    }

    const [deal] = await db
      .insert(deals)
      .values({
        title: data.title,
        contactId: data.contactId,
        pipelineId: data.pipelineId,
        stage: data.stage ?? "lead",
        value: data.value ?? null,
        closeDate: data.closeDate ? new Date(data.closeDate) : null,
        notes: data.notes ?? null,
        assignedUserId: data.assignedUserId ?? null,
      })
      .returning();

    reply.code(201);
    return { deal };
  });

  // Update deal (move stage, etc.)
  app.patch("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const data = dealUpdateSchema.parse(request.body);

    const existing = await db
      .select()
      .from(deals)
      .where(eq(deals.id, id))
      .limit(1);

    if (!existing || existing.length === 0) {
      throw { statusCode: 404, message: "Deal not found" };
    }

    const [updated] = await db
      .update(deals)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.pipelineId !== undefined && { pipelineId: data.pipelineId }),
        ...(data.stage !== undefined && { stage: data.stage }),
        ...(data.value !== undefined && { value: data.value ?? null }),
        ...(data.closeDate !== undefined && {
          closeDate: data.closeDate ? new Date(data.closeDate) : null,
        }),
        ...(data.notes !== undefined && { notes: data.notes ?? null }),
        ...(data.assignedUserId !== undefined && { assignedUserId: data.assignedUserId ?? null }),
        updatedAt: new Date(),
      })
      .where(eq(deals.id, id))
      .returning();

    // Auto-seed transaction checklist tasks when stage changes
    if (data.stage !== undefined && data.stage !== existing[0].stage) {
      try {
        await autoSeedDealTasks(id, data.stage);
      } catch (taskErr) {
        app.log?.error?.({ err: taskErr }, "Failed to auto-seed deal tasks");
      }
    }

    return { deal: updated };
  });

  // Delete deal
  app.delete("/:id", async (request) => {
    const { id } = request.params as { id: string };

    const existing = await db
      .select()
      .from(deals)
      .where(eq(deals.id, id))
      .limit(1);

    if (!existing || existing.length === 0) {
      throw { statusCode: 404, message: "Deal not found" };
    }

    await db.delete(deals).where(eq(deals.id, id));

    return { deleted: true, id };
  });
}
