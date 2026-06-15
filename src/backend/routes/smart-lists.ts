/**
 * KeyFlow CRM — Smart Lists API Routes
 *
 * Full implementation:
 * - CRUD for smart lists
 * - Dynamic filter evaluation engine (evaluates JSON conditions against contacts)
 * - AI-powered natural language → filter generation (LangChain/OpenAI)
 */

import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { smartLists, contacts } from "../models/schema.js";
import { eq, desc, and, or, ilike, gte, lte, gt, lt, isNotNull, isNull, sql, ne } from "drizzle-orm";
import { z } from "zod";

// ── Filter Evaluation Engine ──────────────────────────────────────────────

/**
 * Maps a field name from the filter JSON to a Drizzle column reference.
 * Whitelist prevents SQL injection — only known columns are queryable.
 */
const FIELD_MAP: Record<string, any> = {
  status: contacts.status,
  leadScore: contacts.leadScore,
  source: contacts.source,
  firstName: contacts.firstName,
  lastName: contacts.lastName,
  email: contacts.email,
  phone: contacts.phone,
  lastContactedAt: contacts.lastContactedAt,
  nextFollowUpAt: contacts.nextFollowUpAt,
  createdAt: contacts.createdAt,
};

type Operator = "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "ends_with" |
  "gt" | "lt" | "gte" | "lte" | "is_null" | "is_not_null" | "in" | "not_in";

interface FilterCondition {
  field: string;
  operator: Operator;
  value: unknown;
}

interface FilterRules {
  conditions: FilterCondition[];
  logic?: "and" | "or";
}

/**
 * Build a Drizzle WHERE clause from filter conditions.
 * Returns undefined if no valid conditions exist.
 */
function buildWhereClause(rules: FilterRules | null | undefined) {
  if (!rules || !rules.conditions || rules.conditions.length === 0) return undefined;

  const validConditions = rules.conditions.filter((c) => FIELD_MAP[c.field]);

  if (validConditions.length === 0) return undefined;

  const clauses = validConditions.map((cond) => {
    const col = FIELD_MAP[cond.field];
    const val = cond.value as any;

    switch (cond.operator) {
      case "equals":
        return eq(col, val);
      case "not_equals":
        return ne(col, val);
      case "contains":
        return ilike(col, `%${val}%`);
      case "not_contains":
        return sql`${col} NOT ILIKE ${`%${val}%`}`;
      case "starts_with":
        return ilike(col, `${val}%`);
      case "ends_with":
        return ilike(col, `%${val}`);
      case "gt":
        return gt(col, val);
      case "lt":
        return lt(col, val);
      case "gte":
        return gte(col, val);
      case "lte":
        return lte(col, val);
      case "is_null":
        return isNull(col);
      case "is_not_null":
        return isNotNull(col);
      case "in":
        return Array.isArray(val) ? sql`${col} = ANY(${JSON.stringify(val)}::text[])` : eq(col, val);
      case "not_in":
        return Array.isArray(val) ? sql`${col} != ALL(${JSON.stringify(val)}::text[])` : ne(col, val);
      default:
        return undefined;
    }
  }).filter((c): c is NonNullable<typeof c> => c !== undefined);

  if (clauses.length === 0) return undefined;

  return rules.logic === "or" ? or(...clauses) : and(...clauses);
}

/**
 * Evaluate tag-based filtering (tags are stored in jsonb array).
 * Supports "has_tag" and "not_has_tag" operators on the special "tags" field.
 */
function buildTagCondition(rules: FilterRules | null | undefined) {
  if (!rules || !rules.conditions) return undefined;
  const tagConditions = rules.conditions.filter((c) => c.field === "tags");
  if (tagConditions.length === 0) return undefined;

  const clauses = tagConditions.map((cond) => {
    const tagVal = cond.value as string;
    if (cond.operator === "not_contains" || cond.operator === "not_in") {
      return sql`NOT (${contacts.tags} @> ${JSON.stringify([tagVal])}::jsonb)`;
    }
    return sql`${contacts.tags} @> ${JSON.stringify([tagVal])}::jsonb`;
  });

  return rules.logic === "or" ? or(...clauses) : and(...clauses);
}

// ── Validation Schemas ────────────────────────────────────────────────────

const smartListCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["custom", "ai_suggested"]).optional(),
  filters: z.object({
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.unknown().optional(),
    })),
    logic: z.enum(["and", "or"]).optional(),
  }).optional(),
  aiPrompt: z.string().optional(),
  isPinned: z.boolean().optional(),
  userId: z.string().uuid("User ID is required"),
});

const smartListUpdateSchema = smartListCreateSchema.partial();

// ── Routes ────────────────────────────────────────────────────────────────

export async function smartListsRoutes(app: FastifyInstance) {
  // List all smart lists
  app.get("/", async () => {
    const results = await db
      .select()
      .from(smartLists)
      .orderBy(desc(smartLists.createdAt));

    return { lists: results };
  });

  // Get smart list
  app.get("/:id", async (request) => {
    const { id } = request.params as { id: string };

    const result = await db
      .select()
      .from(smartLists)
      .where(eq(smartLists.id, id))
      .limit(1);

    if (!result || result.length === 0) {
      throw { statusCode: 404, message: "Smart list not found" };
    }

    return { list: result[0] };
  });

  // Get contacts matching a smart list (live filter evaluation)
  app.get("/:id/contacts", async (request) => {
    const { id } = request.params as { id: string };
    const { page = "1", limit = "25" } = request.query as any;

    const list = await db
      .select()
      .from(smartLists)
      .where(eq(smartLists.id, id))
      .limit(1);

    if (!list || list.length === 0) {
      throw { statusCode: 404, message: "Smart list not found" };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause from filter rules
    const filters = list[0].filters as FilterRules | null;
    const fieldClause = buildWhereClause(filters);
    const tagClause = buildTagCondition(filters);

    // Combine field and tag clauses
    let whereClause;
    if (fieldClause && tagClause) {
      whereClause = filters?.logic === "or" ? or(fieldClause, tagClause) : and(fieldClause, tagClause);
    } else {
      whereClause = fieldClause ?? tagClause;
    }

    // Count + fetch in parallel
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(contacts);

    const dataQuery = db
      .select()
      .from(contacts)
      .orderBy(desc(contacts.createdAt));

    if (whereClause) {
      const [countResult, results] = await Promise.all([
        countQuery.where(whereClause).then((r) => r[0]),
        dataQuery.where(whereClause).limit(limitNum).offset(offset),
      ]);

      return {
        contacts: results,
        total: Number(countResult?.count ?? 0),
        page: pageNum,
        limit: limitNum,
        filters: list[0].filters,
      };
    }

    // No filters — return all contacts
    const [countResult, results] = await Promise.all([
      countQuery.then((r) => r[0]),
      dataQuery.limit(limitNum).offset(offset),
    ]);

    return {
      contacts: results,
      total: Number(countResult?.count ?? 0),
      page: pageNum,
      limit: limitNum,
      filters: list[0].filters,
    };
  });

  // Create smart list
  app.post("/", async (request, reply) => {
    const data = smartListCreateSchema.parse(request.body);

    const [list] = await db
      .insert(smartLists)
      .values({
        name: data.name,
        description: data.description ?? null,
        type: data.type ?? "custom",
        filters: data.filters ? {
          ...data.filters,
          conditions: data.filters.conditions.map((c: any) => ({
            ...c,
            value: c.value ?? null
          }))
        } : { conditions: [] },
        aiPrompt: data.aiPrompt ?? null,
        isPinned: data.isPinned ?? false,
        userId: data.userId,
      })
      .returning();

    reply.code(201);
    return { list };
  });

  // Update smart list
  app.patch("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const data = smartListUpdateSchema.parse(request.body);

    const existing = await db
      .select()
      .from(smartLists)
      .where(eq(smartLists.id, id))
      .limit(1);

    if (!existing || existing.length === 0) {
      throw { statusCode: 404, message: "Smart list not found" };
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description ?? null;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.filters !== undefined) {
      updateData.filters = {
        ...data.filters,
        conditions: data.filters.conditions.map((c: any) => ({
          ...c,
          value: c.value ?? null
        }))
      };
    }
    if (data.aiPrompt !== undefined) updateData.aiPrompt = data.aiPrompt ?? null;
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;

    const [updated] = await db
      .update(smartLists)
      .set(updateData)
      .where(eq(smartLists.id, id))
      .returning();

    return { list: updated };
  });

  // Delete smart list
  app.delete("/:id", async (request) => {
    const { id } = request.params as { id: string };

    const existing = await db
      .select()
      .from(smartLists)
      .where(eq(smartLists.id, id))
      .limit(1);

    if (!existing || existing.length === 0) {
      throw { statusCode: 404, message: "Smart list not found" };
    }

    await db.delete(smartLists).where(eq(smartLists.id, id));

    return { deleted: true, id };
  });

  // AI-generated smart list from natural language
  app.post("/ai-generate", async (request) => {
    const { prompt, userId } = request.body as { prompt: string; userId: string };

    if (!prompt || !userId) {
      throw { statusCode: 400, message: "prompt and userId are required" };
    }

    // Use LLM to convert natural language → filter conditions
    const filters = await aiGenerateFilters(prompt);

    const [list] = await db
      .insert(smartLists)
      .values({
        name: `AI: ${prompt.substring(0, 50)}`,
        description: `Generated from prompt: "${prompt}"`,
        type: "ai_suggested",
        filters,
        aiPrompt: prompt,
        isPinned: false,
        userId,
      })
      .returning();

    return { list, prompt, filters };
  });
}

// ── AI Filter Generation ──────────────────────────────────────────────────

/**
 * Convert natural language to structured filter conditions using LLM.
 * Falls back to keyword-based heuristics if no API key is set.
 */
async function aiGenerateFilters(prompt: string): Promise<FilterRules> {
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  if (hasApiKey) {
    try {
      const { ChatOpenAI } = await import("@langchain/openai");
      const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0,
      });

      const systemPrompt = `You convert natural language CRM requests into JSON filter conditions.

Available fields: status (new, contacted, qualified, negotiation, closed_won, closed_lost, nurture), leadScore (0-100 integer), source (string), firstName, lastName, email, phone, tags (array), lastContactedAt (timestamp), nextFollowUpAt (timestamp), createdAt (timestamp).

Available operators: equals, not_equals, contains, not_contains, starts_with, ends_with, gt, lt, gte, lte, is_null, is_not_null, in, not_in.

For tags, use field "tags" with operator "contains" (has_tag) or "not_contains".

Respond with ONLY valid JSON, no markdown:
{"conditions":[{"field":"status","operator":"equals","value":"new"},{"field":"leadScore","operator":"gte","value":50}],"logic":"and"}

Use "or" logic only when the request clearly means any-of. Default to "and".`;

      const response = await model.invoke([
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ]);

      const content = response.content as string;
      // Extract JSON from response (in case model wraps in markdown despite instructions)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as FilterRules;
        if (parsed.conditions && Array.isArray(parsed.conditions)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error("[smart-lists] AI filter generation failed, falling back to heuristics:", err);
    }
  }

  // Fallback: keyword-based heuristics
  return heuristicFilters(prompt);
}

/**
 * Simple keyword-based filter generation when no LLM is available.
 */
function heuristicFilters(prompt: string): FilterRules {
  const conditions: FilterCondition[] = [];
  const lower = prompt.toLowerCase();

  // Status detection
  const statuses = ["new", "contacted", "qualified", "negotiation", "closed_won", "closed_lost", "nurture"];
  for (const s of statuses) {
    if (lower.includes(s)) {
      conditions.push({ field: "status", operator: "equals", value: s });
      break;
    }
  }

  // Lead score detection
  const scoreMatch = lower.match(/score\s*(?:>=?|at least|over|above)\s*(\d+)/);
  if (scoreMatch) {
    conditions.push({ field: "leadScore", operator: "gte", value: parseInt(scoreMatch[1], 10) });
  }

  // Never contacted
  if (lower.includes("never contacted") || lower.includes("no contact") || lower.includes("haven't contacted")) {
    conditions.push({ field: "lastContactedAt", operator: "is_null", value: null });
  }

  // Stale (not contacted in a while)
  if (lower.includes("stale") || lower.includes("cold") || lower.includes("follow up")) {
    conditions.push({ field: "lastContactedAt", operator: "is_not_null", value: null });
  }

  return {
    conditions: conditions.length > 0 ? conditions : [],
    logic: "and",
  };
}
