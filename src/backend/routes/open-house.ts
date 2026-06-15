/**
 * KeyFlow CRM — Open House QR Sign-In Routes
 *
 * Internal API (auth-protected under /api):
 *   GET    /api/open-house                    — List open house events
 *   POST   /api/open-house                    — Create an open house event
 *   GET    /api/open-house/:id                — Get event + sign-ins
 *   PATCH  /api/open-house/:id                — Update event
 *   DELETE /api/open-house/:id                — Delete event
 *   GET    /api/open-house/:id/sign-ins       — List all sign-ins for event
 *
 * Public routes (no auth, under /public/openhouse):
 *   GET    /public/openhouse/:slug            — QR sign-in form (HTML)
 *   POST   /public/openhouse/:slug            — Submit sign-in
 */

import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { openHouseEvents, contacts } from "../models/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "node:crypto";

// ── Helpers ────────────────────────────────────────────────────────────

function generateSlug(): string {
  return randomBytes(6).toString("base64url").slice(0, 12);
}

// ── Validation Schemas ─────────────────────────────────────────────────

const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  propertyAddress: z.string().min(1),
  propertyId: z.string().uuid().optional(),
  scheduledDate: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  customQuestions: z.array(z.object({
    field: z.string(),
    label: z.string(),
    type: z.enum(["text", "email", "phone", "select", "checkbox"]),
    options: z.array(z.string()).optional(),
    required: z.boolean().optional(),
  })).optional(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

const updateEventSchema = z.object({
  title: z.string().max(255).optional(),
  status: z.enum(["scheduled", "live", "ended", "cancelled"]).optional(),
  isActive: z.boolean().optional(),
  endTime: z.string().datetime().optional(),
});

const publicSignInSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Valid email is required"),
  phone: z.string().max(20).optional(),
  // Whether they're working with an agent already
  workingWithAgent: z.boolean().optional(),
  theirAgentName: z.string().max(255).optional(),
  // Custom question answers
  answers: z.record(z.string()).optional(),
  // Buying timeline
  timeline: z.string().max(100).optional(), // "0-3 months", "3-6 months", "6-12 months", "just looking"
  // Budget range
  budget: z.string().max(100).optional(), // "under 300k", "300-500k", "500-750k", "750k+"
});

// ── Internal API Routes ────────────────────────────────────────────────

export async function openHouseRoutes(app: FastifyInstance) {
  // ── List events ───────────────────────────────────────────────
  app.get("/", async (request) => {
    const { organizationId, status, userId } = request.query as any;
    const conditions = [];
    if (organizationId) conditions.push(eq(openHouseEvents.organizationId, organizationId));
    if (status) conditions.push(eq(openHouseEvents.status, status));
    if (userId) conditions.push(eq(openHouseEvents.userId, userId));

    const results = await db
      .select()
      .from(openHouseEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(openHouseEvents.scheduledDate));

    return { events: results };
  });

  // ── Create event ──────────────────────────────────────────────
  app.post("/", async (request, reply) => {
    const body = createEventSchema.parse(request.body);

    const [event] = await db
      .insert(openHouseEvents)
      .values({
        slug: generateSlug(),
        title: body.title,
        propertyAddress: body.propertyAddress,
        propertyId: body.propertyId ?? null,
        scheduledDate: new Date(body.scheduledDate),
        endTime: body.endTime ? new Date(body.endTime) : null,
        customQuestions: body.customQuestions ?? [],
        userId: body.userId,
        organizationId: body.organizationId,
      })
      .returning();

    reply.code(201);
    return { event };
  });

  // ── Get event details ─────────────────────────────────────────
  app.get("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const [event] = await db.select().from(openHouseEvents).where(eq(openHouseEvents.id, id)).limit(1);
    if (!event) throw { statusCode: 404, message: "Open house event not found" };
    return { event };
  });

  // ── Update event ──────────────────────────────────────────────
  app.patch("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const body = updateEventSchema.parse(request.body);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.endTime !== undefined) updateData.endTime = body.endTime ? new Date(body.endTime) : null;

    const [updated] = await db.update(openHouseEvents).set(updateData).where(eq(openHouseEvents.id, id)).returning();
    if (!updated) throw { statusCode: 404, message: "Open house event not found" };
    return { event: updated };
  });

  // ── Delete event ──────────────────────────────────────────────
  app.delete("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const [deleted] = await db.delete(openHouseEvents).where(eq(openHouseEvents.id, id)).returning();
    if (!deleted) throw { statusCode: 404, message: "Open house event not found" };
    return { deleted: true, id };
  });

  // ── List sign-ins (contacts who checked in) ──────────────────
  app.get("/:id/sign-ins", async (request) => {
    const { id } = request.params as { id: string };

    const [event] = await db.select().from(openHouseEvents).where(eq(openHouseEvents.id, id)).limit(1);
    if (!event) throw { statusCode: 404, message: "Open house event not found" };

    // Sign-ins are stored as contacts with a tag matching the event slug
    const signIns = await db
      .select()
      .from(contacts)
      .where(sql`${contacts.tags} @> ${JSON.stringify([`open-house:${event.slug}`])}::jsonb`)
      .orderBy(desc(contacts.createdAt));

    return {
      event: { title: event.title, signInCount: event.signInCount },
      signIns,
    };
  });
}

// ── Public Routes (no auth) ────────────────────────────────────────────

export async function publicOpenHouseRoutes(app: FastifyInstance) {
  // ── QR Sign-In Page (HTML) ────────────────────────────────────
  app.get("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const [event] = await db.select().from(openHouseEvents).where(eq(openHouseEvents.slug, slug)).limit(1);

    if (!event || !event.isActive) {
      return reply.type("text/html").send(renderEventNotFound());
    }

    return reply.type("text/html").send(renderSignInPage(event));
  });

  // ── Submit Sign-In ────────────────────────────────────────────
  app.post("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const body = publicSignInSchema.parse(request.body);

    const [event] = await db.select().from(openHouseEvents).where(eq(openHouseEvents.slug, slug)).limit(1);
    if (!event || !event.isActive) {
      throw { statusCode: 404, message: "Open house event not found" };
    }

    // Check if visitor already signed in (dedup by email)
    const existing = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.email, body.email),
          sql`${contacts.tags} @> ${JSON.stringify([`open-house:${event.slug}`])}::jsonb`,
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Already signed in — update instead of creating duplicate
      return {
        success: true,
        message: "You're already signed in!",
        alreadySignedIn: true,
      };
    }

    // Check if contact exists in CRM (match by email)
    const [existingContact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.email, body.email))
      .limit(1);

    let contactId: string;

    if (existingContact) {
      // Update existing contact — add open house tag
      const currentTags = existingContact.tags || [];
      const newTags = [...new Set([...currentTags, `open-house:${event.slug}`])];

      const [updated] = await db
        .update(contacts)
        .set({
          tags: newTags,
          status: "contacted",
          lastContactedAt: new Date(),
          ...(body.phone && !existingContact.phone && { phone: body.phone }),
          customFields: {
            ...(existingContact.customFields || {}),
            ...(body.workingWithAgent !== undefined && { workingWithAgent: body.workingWithAgent }),
            ...(body.theirAgentName && { theirAgentName: body.theirAgentName }),
            ...(body.timeline && { buyingTimeline: body.timeline }),
            ...(body.budget && { budgetRange: body.budget }),
            ...(body.answers || {}),
            lastOpenHouse: event.title,
            lastOpenHouseDate: event.scheduledDate,
          },
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, existingContact.id))
        .returning();
      contactId = updated.id;
    } else {
      // Create new contact from sign-in
      const [newContact] = await db
        .insert(contacts)
        .values({
          firstName: body.name.split(" ")[0],
          lastName: body.name.split(" ").slice(1).join(" ") || null,
          email: body.email,
          phone: body.phone ?? null,
          organizationId: event.organizationId,
          source: "open_house",
          status: "new",
          tags: [`open-house:${event.slug}`, "open-house-visitor"],
          customFields: {
            ...(body.workingWithAgent !== undefined && { workingWithAgent: body.workingWithAgent }),
            ...(body.theirAgentName && { theirAgentName: body.theirAgentName }),
            ...(body.timeline && { buyingTimeline: body.timeline }),
            ...(body.budget && { budgetRange: body.budget }),
            ...(body.answers || {}),
            openHouseTitle: event.title,
            openHouseAddress: event.propertyAddress,
          },
        })
        .returning();
      contactId = newContact.id;
    }

    // Increment sign-in counter
    await db
      .update(openHouseEvents)
      .set({
        signInCount: sql`${openHouseEvents.signInCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(openHouseEvents.id, event.id));

    reply.code(201);
    return {
      success: true,
      message: "Thanks for signing in!",
      contactId,
    };
  });
}

// ── HTML Templates ─────────────────────────────────────────────────────

function renderSignInPage(event: typeof openHouseEvents.$inferSelect): string {
  const eventDate = new Date(event.scheduledDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const customQuestionsHtml = (event.customQuestions || []).map((q) => {
    if (q.type === "select") {
      const options = (q.options || []).map(o =>
        `<option value="${o}">${o}</option>`
      ).join("");
      return `<div class="field"><label>${q.label}${q.required ? " *" : ""}</label><select id="q_${q.field}" ${q.required ? "required" : ""}><option value="">Select…</option>${options}</select></div>`;
    }
    if (q.type === "checkbox") {
      return `<div class="field checkbox"><label><input type="checkbox" id="q_${q.field}" /> ${q.label}</label></div>`;
    }
    return `<div class="field"><label>${q.label}${q.required ? " *" : ""}</label><input type="${q.type}" id="q_${q.field}" ${q.required ? "required" : ""} /></div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${event.title} — Sign In</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #1a1a2e; min-height: 100vh; }
    .container { max-width: 420px; margin: 0 auto; padding: 24px 16px; }
    .card { background: white; border-radius: 16px; padding: 32px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .logo { text-align: center; margin-bottom: 8px; }
    .logo span { font-size: 20px; font-weight: 700; color: #4f46e5; }
    .event-icon { text-align: center; font-size: 40px; margin-bottom: 8px; }
    h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
    .address { text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 4px; }
    .date { text-align: center; color: #4f46e5; font-size: 13px; font-weight: 600; margin-bottom: 24px; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .field input, .field select { width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; }
    .field input:focus, .field select:focus { outline: none; border-color: #4f46e5; }
    .field.checkbox { display: flex; align-items: center; gap: 8px; }
    .field.checkbox label { margin: 0; display: flex; align-items: center; gap: 8px; }
    .field.checkbox input { width: 20px; height: 20px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .btn { width: 100%; padding: 14px; background: #4f46e5; color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 8px; }
    .btn:hover { background: #4338ca; }
    .btn:disabled { opacity: 0.5; }
    .success { text-align: center; padding: 24px; }
    .success-icon { font-size: 56px; margin-bottom: 16px; }
    .success h2 { margin-bottom: 8px; }
    .success p { color: #6b7280; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #9ca3af; }
    .footer a { color: #4f46e5; text-decoration: none; }
    .agent-field { display: none; }
    .agent-field.visible { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo"><span>🔑 KeyFlow</span></div>
      <div class="event-icon">🏠</div>
      <h1>${event.title}</h1>
      <p class="address">${event.propertyAddress}</p>
      <p class="date">${eventDate}</p>

      <form id="signInForm">
        <div class="field">
          <label>Full Name *</label>
          <input type="text" id="name" required placeholder="Jane Smith" autocomplete="name" />
        </div>
        <div class="field">
          <label>Email *</label>
          <input type="email" id="email" required placeholder="jane@email.com" autocomplete="email" />
        </div>
        <div class="field">
          <label>Phone</label>
          <input type="tel" id="phone" placeholder="(360) 555-0100" autocomplete="tel" />
        </div>

        <div class="two-col">
          <div class="field">
            <label>Timeline</label>
            <select id="timeline">
              <option value="">Select…</option>
              <option value="0-3 months">0-3 months</option>
              <option value="3-6 months">3-6 months</option>
              <option value="6-12 months">6-12 months</option>
              <option value="just looking">Just looking</option>
            </select>
          </div>
          <div class="field">
            <label>Budget</label>
            <select id="budget">
              <option value="">Select…</option>
              <option value="under 400k">Under $400K</option>
              <option value="400-600k">$400-600K</option>
              <option value="600-800k">$600-800K</option>
              <option value="800k+">$800K+</option>
            </select>
          </div>
        </div>

        <div class="field checkbox">
          <label>
            <input type="checkbox" id="hasAgent" onchange="toggleAgentField()" />
            I'm already working with an agent
          </label>
        </div>
        <div class="field agent-field" id="agentField">
          <label>Agent Name</label>
          <input type="text" id="agentName" placeholder="Agent's name" />
        </div>

        ${customQuestionsHtml}

        <button type="submit" class="btn" id="submitBtn">Sign In</button>
      </form>

      <div id="success" class="success" style="display:none;">
        <div class="success-icon">✅</div>
        <h2>You're all set!</h2>
        <p>Thanks for visiting. We'll be in touch soon.</p>
      </div>
    </div>
    <div class="footer">Powered by <a href="https://keyflow.raindesignlabs.net">KeyFlow CRM</a></div>
  </div>

  <script>
    const SLUG = "${event.slug}";

    function toggleAgentField() {
      const checkbox = document.getElementById('hasAgent');
      const field = document.getElementById('agentField');
      field.classList.toggle('visible', checkbox.checked);
    }

    document.getElementById('signInForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      btn.disabled = true;
      btn.textContent = 'Signing in…';

      // Collect custom answers
      const answers = {};
      document.querySelectorAll('[id^="q_"]').forEach(el => {
        if (el.type === 'checkbox') {
          answers[el.id.replace('q_', '')] = el.checked;
        } else {
          answers[el.id.replace('q_', '')] = el.value;
        }
      });

      try {
        const res = await fetch('/public/openhouse/' + SLUG, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            timeline: document.getElementById('timeline').value,
            budget: document.getElementById('budget').value,
            workingWithAgent: document.getElementById('hasAgent').checked,
            theirAgentName: document.getElementById('agentName').value || undefined,
            answers: answers,
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Sign-in failed');
        document.getElementById('signInForm').style.display = 'none';
        document.getElementById('success').style.display = 'block';
      } catch(err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });
  </script>
</body>
</html>`;
}

function renderEventNotFound(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Not Found — KeyFlow</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #f5f7fa; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .msg { text-align: center; }
    h1 { color: #1a1a2e; }
    p { color: #6b7280; }
  </style>
</head>
<body>
  <div class="msg">
    <h1>Open house not found</h1>
    <p>This event may have ended or the link is invalid.</p>
  </div>
</body>
</html>`;
}
