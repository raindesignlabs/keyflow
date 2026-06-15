/**
 * KeyFlow CRM — Transaction Checklists Routes
 *
 * Manages task checklists for real estate deals. Tasks auto-generate
 * from stage templates when a deal moves between pipeline stages.
 *
 * GET    /api/deals/:dealId/tasks          — List tasks for a deal
 * POST   /api/deals/:dealId/tasks          — Create a manual task
 * PATCH  /api/deals/:dealId/tasks/:id      — Update task (complete, assign, edit)
 * DELETE /api/deals/:dealId/tasks/:id      — Delete a task
 * POST   /api/deals/:dealId/tasks/seed     — Auto-generate tasks from templates
 *
 * The seed endpoint is called automatically when a deal stage changes
 * (hooked from the deals PATCH route) but can also be called manually.
 */

import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { dealTasks, deals, pipelines } from "../models/schema.js";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

// ── Default Task Templates ─────────────────────────────────────────────
// These templates define what tasks auto-generate at each deal stage.
// Agents can customize per-organization later.

interface TaskTemplate {
  title: string;
  description?: string;
  category: string;
  triggerStage: string;
  sortOrder: number;
  dueInDays?: number; // days from stage entry
}

export const DEFAULT_TASK_TEMPLATES: TaskTemplate[] = [
  // ── Lead Stage ─────────────────────────────────────────────────
  {
    title: "Initial contact: call or text the lead",
    description: "Reach out within 5 minutes of lead creation. Ask about timeline, budget, and financing.",
    category: "general",
    triggerStage: "lead",
    sortOrder: 1,
    dueInDays: 0,
  },
  {
    title: "Add lead to CRM with notes",
    description: "Record all initial conversation details, preferences, and timeline.",
    category: "general",
    triggerStage: "lead",
    sortOrder: 2,
    dueInDays: 1,
  },

  // ── Qualified Stage ────────────────────────────────────────────
  {
    title: "Get pre-approval letter from lender",
    description: "Verify buyer's financing status. Request updated pre-approval if expired.",
    category: "financing",
    triggerStage: "qualified",
    sortOrder: 1,
    dueInDays: 3,
  },
  {
    title: "Set up MLS alerts for buyer criteria",
    description: "Create automated property searches based on buyer's stated preferences.",
    category: "general",
    triggerStage: "qualified",
    sortOrder: 2,
    dueInDays: 1,
  },
  {
    title: "Schedule first showing tour",
    description: "Book showings for top 3-5 properties matching criteria.",
    category: "general",
    triggerStage: "qualified",
    sortOrder: 3,
    dueInDays: 7,
  },

  // ── Proposal Stage ─────────────────────────────────────────────
  {
    title: "Prepare comparative market analysis (CMA)",
    description: "Pull comps, prepare branded CMA for the property.",
    category: "general",
    triggerStage: "proposal",
    sortOrder: 1,
    dueInDays: 2,
  },
  {
    title: "Draft purchase offer",
    description: "Prepare offer with terms, price, contingencies, and timeline.",
    category: "offer",
    triggerStage: "proposal",
    sortOrder: 2,
    dueInDays: 3,
  },
  {
    title: "Review offer with client",
    description: "Walk through offer terms, explain contingencies, get client sign-off.",
    category: "offer",
    triggerStage: "proposal",
    sortOrder: 3,
    dueInDays: 4,
  },
  {
    title: "Submit offer to listing agent",
    description: "Send offer with pre-approval letter and earnest money info.",
    category: "offer",
    triggerStage: "proposal",
    sortOrder: 4,
    dueInDays: 5,
  },

  // ── Negotiation Stage ──────────────────────────────────────────
  {
    title: "Open escrow / title search",
    description: "Send contract to title company. Initiate title search.",
    category: "title",
    triggerStage: "negotiation",
    sortOrder: 1,
    dueInDays: 2,
  },
  {
    title: "Schedule home inspection",
    description: "Book inspector within contingency period. Coordinate with seller.",
    category: "inspection",
    triggerStage: "negotiation",
    sortOrder: 2,
    dueInDays: 5,
  },
  {
    title: "Collect earnest money deposit",
    description: "Verify EMD received and deposited to escrow.",
    category: "financing",
    triggerStage: "negotiation",
    sortOrder: 3,
    dueInDays: 3,
  },
  {
    title: "Order appraisal (if financed)",
    description: "Lender orders appraisal. Confirm receipt and track timeline.",
    category: "financing",
    triggerStage: "negotiation",
    sortOrder: 4,
    dueInDays: 7,
  },

  // ── Closing Stage (triggered when moving to closed_won) ────────
  {
    title: "Verify loan clear-to-close (CTC)",
    description: "Confirm lender has issued CTC. No outstanding conditions.",
    category: "financing",
    triggerStage: "closed_won",
    sortOrder: 1,
    dueInDays: 3,
  },
  {
    title: "Schedule final walkthrough",
    description: "Buyer final walkthrough 24-48 hours before closing.",
    category: "closing",
    triggerStage: "closed_won",
    sortOrder: 2,
    dueInDays: 7,
  },
  {
    title: "Confirm closing date, time, and location",
    description: "Coordinate with title company, lender, buyer, and seller.",
    category: "closing",
    triggerStage: "closed_won",
    sortOrder: 3,
    dueInDays: 5,
  },
  {
    title: "Send closing disclosure / settlement statement",
    description: "Review final numbers with buyer. Confirm cash-to-close.",
    category: "closing",
    triggerStage: "closed_won",
    sortOrder: 4,
    dueInDays: 7,
  },
  {
    title: "Closing day: attend and collect signed docs",
    description: "Be present at closing. Ensure all documents signed and keys transferred.",
    category: "closing",
    triggerStage: "closed_won",
    sortOrder: 5,
    dueInDays: 14,
  },
  {
    title: "Post-closing: send thank you + request review",
    description: "Send thank-you note, closing gift, and Google/Zillow review request.",
    category: "general",
    triggerStage: "closed_won",
    sortOrder: 6,
    dueInDays: 16,
  },
  {
    title: "Add to past-client nurture campaign",
    description: "Set up annual check-in reminders and market update drips.",
    category: "general",
    triggerStage: "closed_won",
    sortOrder: 7,
    dueInDays: 16,
  },
];

// ── Validation Schemas ─────────────────────────────────────────────────

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().optional(),
  category: z.string().max(50).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assignedUserId: z.string().uuid().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().max(500).optional(),
  description: z.string().optional(),
  category: z.string().max(50).optional(),
  isCompleted: z.boolean().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assignedUserId: z.string().uuid().optional(),
});

// ── Routes ─────────────────────────────────────────────────────────────

export async function dealTasksRoutes(app: FastifyInstance) {
  // ── List tasks for a deal ─────────────────────────────────────
  app.get("/", async (request) => {
    const { dealId } = request.params as { dealId: string };
    const { category, completed } = request.query as any;

    const conditions = [eq(dealTasks.dealId, dealId)];
    if (category) conditions.push(eq(dealTasks.category, category));
    if (completed !== undefined) conditions.push(eq(dealTasks.isCompleted, completed === "true"));

    const results = await db
      .select()
      .from(dealTasks)
      .where(and(...conditions))
      .orderBy(asc(dealTasks.sortOrder), asc(dealTasks.createdAt));

    // Group by category for easy rendering
    const byCategory: Record<string, typeof results> = {};
    for (const task of results) {
      const cat = task.category || "general";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(task);
    }

    const totalCompleted = results.filter((t) => t.isCompleted).length;

    return {
      tasks: results,
      byCategory,
      stats: {
        total: results.length,
        completed: totalCompleted,
        pending: results.length - totalCompleted,
        progressPercent: results.length > 0 ? Math.round((totalCompleted / results.length) * 100) : 0,
      },
    };
  });

  // ── Create a manual task ──────────────────────────────────────
  app.post("/", async (request, reply) => {
    const { dealId } = request.params as { dealId: string };
    const body = createTaskSchema.parse(request.body);

    // Verify deal exists and get org ID via pipeline
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
    if (!deal) {
      throw { statusCode: 404, message: "Deal not found" };
    }

    // Get organization ID from pipeline
    const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, deal.pipelineId)).limit(1);
    const orgId = pipeline?.organizationId ?? null;

    const [task] = await db
      .insert(dealTasks)
      .values({
        dealId,
        organizationId: orgId ?? "00000000-0000-0000-0000-000000000000",
        title: body.title,
        description: body.description ?? null,
        category: body.category ?? "general",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        assignedUserId: body.assignedUserId ?? deal.assignedUserId ?? null,
      })
      .returning();

    reply.code(201);
    return { task };
  });

  // ── Update a task ─────────────────────────────────────────────
  app.patch("/:taskId", async (request) => {
    const { dealId, taskId } = request.params as { dealId: string; taskId: string };
    const body = updateTaskSchema.parse(request.body);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.isCompleted !== undefined) {
      updateData.isCompleted = body.isCompleted;
      updateData.completedAt = body.isCompleted ? new Date() : null;
    }
    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    if (body.assignedUserId !== undefined) updateData.assignedUserId = body.assignedUserId;

    const [updated] = await db
      .update(dealTasks)
      .set(updateData)
      .where(and(eq(dealTasks.id, taskId), eq(dealTasks.dealId, dealId)))
      .returning();

    if (!updated) {
      throw { statusCode: 404, message: "Task not found" };
    }

    return { task: updated };
  });

  // ── Delete a task ─────────────────────────────────────────────
  app.delete("/:taskId", async (request) => {
    const { dealId, taskId } = request.params as { dealId: string; taskId: string };

    const [deleted] = await db
      .delete(dealTasks)
      .where(and(eq(dealTasks.id, taskId), eq(dealTasks.dealId, dealId)))
      .returning();

    if (!deleted) {
      throw { statusCode: 404, message: "Task not found" };
    }

    return { deleted: true, id: taskId };
  });

  // ── Seed tasks from templates for current deal stage ──────────
  // Auto-creates checklist tasks based on the deal's current stage.
  // Safe to call multiple times — skips tasks that already exist for this stage.
  app.post("/seed", async (request) => {
    const { dealId } = request.params as { dealId: string };

    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
    if (!deal) {
      throw { statusCode: 404, message: "Deal not found" };
    }

    // Get org from pipeline
    const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, deal.pipelineId)).limit(1);
    const orgId = pipeline?.organizationId ?? "00000000-0000-0000-0000-000000000000";
    const templates = DEFAULT_TASK_TEMPLATES.filter((t) => t.triggerStage === deal.stage);

    if (templates.length === 0) {
      return { created: 0, message: `No templates for stage: ${deal.stage}` };
    }

    // Check which tasks already exist for this stage (avoid duplicates)
    const existing = await db
      .select()
      .from(dealTasks)
      .where(and(eq(dealTasks.dealId, dealId), eq(dealTasks.isAutoGenerated, true)));

    const existingTitles = new Set(existing.map((t) => t.title));

    // Create missing tasks
    const toCreate = templates.filter((t) => !existingTitles.has(t.title));

    const created: typeof dealTasks.$inferSelect[] = [];
    for (const template of toCreate) {
      const dueDate = template.dueInDays
        ? new Date(Date.now() + template.dueInDays * 24 * 60 * 60 * 1000)
        : null;

      const [task] = await db
        .insert(dealTasks)
        .values({
          dealId,
          organizationId: orgId,
          title: template.title,
          description: template.description ?? null,
          category: template.category,
          triggerStage: template.triggerStage,
          sortOrder: template.sortOrder,
          dueDate,
          assignedUserId: deal.assignedUserId ?? null,
          isAutoGenerated: true,
        })
        .returning();

      created.push(task);
    }

    return {
      created: created.length,
      skipped: existingTitles.size,
      tasks: created,
    };
  });
}

// ── Helper: Auto-seed on stage change ──────────────────────────────────
// Called from deals PATCH route when stage changes. Not a route itself.

export async function autoSeedDealTasks(dealId: string, newStage: string): Promise<void> {
  const templates = DEFAULT_TASK_TEMPLATES.filter((t) => t.triggerStage === newStage);
  if (templates.length === 0) return;

  // Check for existing auto-generated tasks for this stage
  const existing = await db
    .select()
    .from(dealTasks)
    .where(and(eq(dealTasks.dealId, dealId), eq(dealTasks.isAutoGenerated, true)));

  const existingTitles = new Set(existing.map((t) => t.title));
  const toCreate = templates.filter((t) => !existingTitles.has(t.title));

  // Get deal for org assignment
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!deal) return;

  // Get org from pipeline
  const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, deal.pipelineId)).limit(1);
  const orgId = pipeline?.organizationId ?? "00000000-0000-0000-0000-000000000000";

  for (const template of toCreate) {
    const dueDate = template.dueInDays
      ? new Date(Date.now() + template.dueInDays * 24 * 60 * 60 * 1000)
      : null;

    await db.insert(dealTasks).values({
      dealId,
      organizationId: orgId,
      title: template.title,
      description: template.description ?? null,
      category: template.category,
      triggerStage: template.triggerStage,
      sortOrder: template.sortOrder,
      dueDate,
      assignedUserId: deal.assignedUserId ?? null,
      isAutoGenerated: true,
    });
  }
}
