/**
 * KeyFlow CRM — Self-Booking Link Routes
 *
 * Internal API (auth-protected under /api):
 *   GET    /api/bookings/links                 — List booking links
 *   POST   /api/bookings/links                 — Create a booking link
 *   GET    /api/bookings/links/:id             — Get a booking link
 *   PATCH  /api/bookings/links/:id             — Update a booking link
 *   DELETE /api/bookings/links/:id             — Delete a booking link
 *   GET    /api/bookings                       — List all bookings
 *   GET    /api/bookings/:id                   — Get a booking
 *   PATCH  /api/bookings/:id                   — Update booking status (cancel, complete)
 *
 * Public routes (no auth, under /public/book):
 *   GET    /public/book/:slug                  — Public booking page (HTML)
 *   GET    /public/book/:slug/availability     — Get available slots (JSON)
 *   POST   /public/book/:slug                  — Submit a booking
 */

import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { bookingLinks, bookings, contacts } from "../models/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "node:crypto";

// ── Helpers ────────────────────────────────────────────────────────────

function generateSlug(): string {
  return randomBytes(6).toString("base64url").slice(0, 12);
}

function getNextDays(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

// ── Validation Schemas ─────────────────────────────────────────────────

const createLinkSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  availability: z.object({
    days: z.array(z.number().min(0).max(6)),
    slots: z.array(z.string()),
  }),
  durationMinutes: z.number().min(15).max(240).default(30),
  meetingType: z.enum(["in_person", "phone", "video"]).default("in_person"),
  location: z.string().max(500).optional(),
  bufferMinutes: z.number().min(0).max(120).default(15),
  maxAdvanceDays: z.number().min(1).max(90).default(30),
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

const updateLinkSchema = createLinkSchema.partial().omit({ userId: true, organizationId: true }).extend({
  isActive: z.boolean().optional(),
});

const publicBookSchema = z.object({
  prospectName: z.string().min(1, "Name is required").max(255),
  prospectEmail: z.string().email("Valid email is required"),
  prospectPhone: z.string().max(20).optional(),
  prospectNotes: z.string().max(1000).optional(),
  slot: z.string().datetime(), // ISO datetime of chosen slot
  timezone: z.string().default("America/Los_Angeles"),
});

const updateBookingSchema = z.object({
  status: z.enum(["confirmed", "cancelled", "completed", "no_show"]),
  cancelReason: z.string().optional(),
});

// ── Internal API Routes ────────────────────────────────────────────────

export async function bookingsRoutes(app: FastifyInstance) {
  // ── List booking links ────────────────────────────────────────
  app.get("/links", async (request) => {
    const { organizationId, userId, active } = request.query as any;
    const conditions = [];
    if (organizationId) conditions.push(eq(bookingLinks.organizationId, organizationId));
    if (userId) conditions.push(eq(bookingLinks.userId, userId));
    if (active === "true") conditions.push(eq(bookingLinks.isActive, true));

    const results = await db
      .select()
      .from(bookingLinks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(bookingLinks.createdAt));

    return { links: results };
  });

  // ── Create booking link ───────────────────────────────────────
  app.post("/links", async (request, reply) => {
    const body = createLinkSchema.parse(request.body);

    const [link] = await db
      .insert(bookingLinks)
      .values({
        slug: generateSlug(),
        title: body.title,
        description: body.description ?? null,
        availability: body.availability,
        durationMinutes: body.durationMinutes,
        meetingType: body.meetingType,
        location: body.location ?? null,
        bufferMinutes: body.bufferMinutes,
        maxAdvanceDays: body.maxAdvanceDays,
        userId: body.userId,
        organizationId: body.organizationId,
      })
      .returning();

    reply.code(201);
    return { link };
  });

  // ── Get single booking link ───────────────────────────────────
  app.get("/links/:id", async (request) => {
    const { id } = request.params as { id: string };
    const [link] = await db.select().from(bookingLinks).where(eq(bookingLinks.id, id)).limit(1);
    if (!link) throw { statusCode: 404, message: "Booking link not found" };
    return { link };
  });

  // ── Update booking link ───────────────────────────────────────
  app.patch("/links/:id", async (request) => {
    const { id } = request.params as { id: string };
    const body = updateLinkSchema.parse(request.body);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.availability !== undefined) updateData.availability = body.availability;
    if (body.durationMinutes !== undefined) updateData.durationMinutes = body.durationMinutes;
    if (body.meetingType !== undefined) updateData.meetingType = body.meetingType;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.bufferMinutes !== undefined) updateData.bufferMinutes = body.bufferMinutes;
    if (body.maxAdvanceDays !== undefined) updateData.maxAdvanceDays = body.maxAdvanceDays;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const [updated] = await db.update(bookingLinks).set(updateData).where(eq(bookingLinks.id, id)).returning();
    if (!updated) throw { statusCode: 404, message: "Booking link not found" };
    return { link: updated };
  });

  // ── Delete booking link ───────────────────────────────────────
  app.delete("/links/:id", async (request) => {
    const { id } = request.params as { id: string };
    const [deleted] = await db.delete(bookingLinks).where(eq(bookingLinks.id, id)).returning();
    if (!deleted) throw { statusCode: 404, message: "Booking link not found" };
    return { deleted: true, id };
  });

  // ── List bookings ─────────────────────────────────────────────
  app.get("/", async (request) => {
    const { bookingLinkId, userId, status } = request.query as any;
    const conditions = [];
    if (bookingLinkId) conditions.push(eq(bookings.bookingLinkId, bookingLinkId));
    if (userId) conditions.push(eq(bookings.userId, userId));
    if (status) conditions.push(eq(bookings.status, status));

    const results = await db
      .select()
      .from(bookings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(bookings.scheduledAt));

    return { bookings: results };
  });

  // ── Get single booking ────────────────────────────────────────
  app.get("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (!booking) throw { statusCode: 404, message: "Booking not found" };
    return { booking };
  });

  // ── Update booking status ─────────────────────────────────────
  app.patch("/:id", async (request) => {
    const { id } = request.params as { id: string };
    const body = updateBookingSchema.parse(request.body);

    const updateData: Record<string, unknown> = { status: body.status, updatedAt: new Date() };
    if (body.status === "cancelled") {
      updateData.cancelledAt = new Date();
      if (body.cancelReason) updateData.cancelReason = body.cancelReason;
    }

    const [updated] = await db.update(bookings).set(updateData).where(eq(bookings.id, id)).returning();
    if (!updated) throw { statusCode: 404, message: "Booking not found" };
    return { booking: updated };
  });
}

// ── Public Booking Routes (no auth) ────────────────────────────────────

export async function publicBookRoutes(app: FastifyInstance) {
  // ── Get availability ──────────────────────────────────────────
  app.get("/:slug/availability", async (request) => {
    const { slug } = request.params as { slug: string };
    const [link] = await db.select().from(bookingLinks).where(eq(bookingLinks.slug, slug)).limit(1);

    if (!link || !link.isActive) {
      throw { statusCode: 404, message: "Booking link not found" };
    }

    // Get existing bookings for this link to filter out taken slots
    const existingBookings = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.bookingLinkId, link.id), eq(bookings.status, "confirmed")));

    const takenSlots = new Set(
      existingBookings.map((b) => new Date(b.scheduledAt).toISOString()),
    );

    // Generate available slots
    const upcomingDays = getNextDays(link.maxAdvanceDays ?? 30);
    const availableSlots: Array<{ date: string; dayName: string; slots: Array<{ time: string; datetime: string; available: boolean }> }> = [];

    for (const day of upcomingDays) {
      const dayOfWeek = day.getDay();
      if (!link.availability.days.includes(dayOfWeek)) continue;

      const daySlots = link.availability.slots.map((timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const slotDate = new Date(day);
        slotDate.setHours(hours, minutes, 0, 0);
        const iso = slotDate.toISOString();
        return {
          time: timeStr,
          datetime: iso,
          available: !takenSlots.has(iso) && slotDate > new Date(),
        };
      });

      availableSlots.push({
        date: day.toISOString().split("T")[0],
        dayName: day.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
        slots: daySlots,
      });
    }

    return {
      link: {
        title: link.title,
        description: link.description,
        durationMinutes: link.durationMinutes,
        meetingType: link.meetingType,
        location: link.location,
      },
      availability: availableSlots,
    };
  });

  // ── Submit a booking ──────────────────────────────────────────
  app.post("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const body = publicBookSchema.parse(request.body);

    const [link] = await db.select().from(bookingLinks).where(eq(bookingLinks.slug, slug)).limit(1);
    if (!link || !link.isActive) {
      throw { statusCode: 404, message: "Booking link not found" };
    }

    // Verify slot is available
    const slotDate = new Date(body.slot);
    const dayOfWeek = slotDate.getDay();
    const timeStr = slotDate.toTimeString().slice(0, 5);

    if (!link.availability.days.includes(dayOfWeek) || !link.availability.slots.includes(timeStr)) {
      throw { statusCode: 400, message: "This time slot is not available" };
    }

    // Check for conflicts
    const conflicting = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.bookingLinkId, link.id),
          eq(bookings.status, "confirmed"),
          eq(bookings.scheduledAt, slotDate),
        ),
      )
      .limit(1);

    if (conflicting.length > 0) {
      throw { statusCode: 409, message: "This time slot was just booked. Please choose another." };
    }

    // Check if contact already exists (match by email)
    let contactId: string | null = null;
    const [existingContact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.email, body.prospectEmail))
      .limit(1);

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      // Auto-create contact
      const [newContact] = await db
        .insert(contacts)
        .values({
          firstName: body.prospectName.split(" ")[0],
          lastName: body.prospectName.split(" ").slice(1).join(" ") || null,
          email: body.prospectEmail,
          phone: body.prospectPhone ?? null,
          organizationId: link.organizationId,
          source: "booking_link",
          tags: ["booked-appointment"],
        })
        .returning();
      contactId = newContact.id;
    }

    // Create booking
    const [booking] = await db
      .insert(bookings)
      .values({
        bookingLinkId: link.id,
        userId: link.userId,
        contactId,
        prospectName: body.prospectName,
        prospectEmail: body.prospectEmail,
        prospectPhone: body.prospectPhone ?? null,
        prospectNotes: body.prospectNotes ?? null,
        scheduledAt: slotDate,
        durationMinutes: link.durationMinutes,
        timezone: body.timezone,
        status: "confirmed",
      })
      .returning();

    reply.code(201);
    return {
      success: true,
      booking: {
        id: booking.id,
        scheduledAt: booking.scheduledAt,
        durationMinutes: booking.durationMinutes,
        meetingType: link.meetingType,
        location: link.location,
        title: link.title,
      },
    };
  });

  // ── Public booking page (HTML) ────────────────────────────────
  app.get("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const [link] = await db.select().from(bookingLinks).where(eq(bookingLinks.slug, slug)).limit(1);

    if (!link || !link.isActive) {
      return reply.type("text/html").send(renderNotFoundPage());
    }

    return reply.type("text/html").send(renderBookingPage(link));
  });
}

// ── HTML Templates ─────────────────────────────────────────────────────

function renderBookingPage(link: typeof bookingLinks.$inferSelect): string {
  const meetingTypeLabel =
    link.meetingType === "video" ? "Video Call" :
    link.meetingType === "phone" ? "Phone Call" : "In Person";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${link.title} — KeyFlow Booking</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #1a1a2e; }
    .container { max-width: 480px; margin: 0 auto; padding: 24px 16px; }
    .card { background: white; border-radius: 16px; padding: 32px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo span { font-size: 24px; font-weight: 700; color: #4f46e5; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    .meta { color: #6b7280; font-size: 14px; margin-bottom: 4px; }
    .badge { display: inline-block; background: #eef2ff; color: #4f46e5; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-top: 8px; }
    #availability { margin-top: 24px; }
    .day { margin-bottom: 16px; }
    .day-name { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px; }
    .slots { display: flex; flex-wrap: wrap; gap: 8px; }
    .slot { padding: 10px 16px; border: 2px solid #e5e7eb; border-radius: 8px; background: white; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.15s; }
    .slot:hover { border-color: #4f46e5; background: #eef2ff; }
    .slot.selected { background: #4f46e5; color: white; border-color: #4f46e5; }
    .slot.unavailable { opacity: 0.4; cursor: not-allowed; text-decoration: line-through; }
    .loading { text-align: center; padding: 24px; color: #6b7280; }
    #form { display: none; margin-top: 24px; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .field input, .field textarea { width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 15px; }
    .field input:focus, .field textarea:focus { outline: none; border-color: #4f46e5; }
    .btn { width: 100%; padding: 14px; background: #4f46e5; color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; }
    .btn:hover { background: #4338ca; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .success { text-align: center; padding: 32px; }
    .success-icon { font-size: 48px; margin-bottom: 16px; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #9ca3af; }
    .footer a { color: #4f46e5; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo"><span>🔑 KeyFlow</span></div>
      <h1>${link.title}</h1>
      ${link.description ? `<p class="meta">${link.description}</p>` : ""}
      <p class="meta">⏱ ${link.durationMinutes} minutes</p>
      <p class="meta">📍 ${meetingTypeLabel}${link.location ? " — " + link.location : ""}</p>
      <span class="badge">Pick a time below</span>

      <div id="availability"><div class="loading">Loading available times…</div></div>

      <form id="form">
        <input type="hidden" id="selectedSlot" name="slot" />
        <div class="field">
          <label>Your Name *</label>
          <input type="text" id="name" required placeholder="Jane Smith" />
        </div>
        <div class="field">
          <label>Email *</label>
          <input type="email" id="email" required placeholder="jane@email.com" />
        </div>
        <div class="field">
          <label>Phone</label>
          <input type="tel" id="phone" placeholder="(360) 555-0100" />
        </div>
        <div class="field">
          <label>Notes (optional)</label>
          <textarea id="notes" rows="2" placeholder="What would you like to discuss?"></textarea>
        </div>
        <button type="submit" class="btn" id="submitBtn">Confirm Booking</button>
      </form>

      <div id="success" class="success" style="display:none;">
        <div class="success-icon">✅</div>
        <h2>Booking Confirmed!</h2>
        <p id="successDetails" style="margin-top:8px;color:#6b7280;"></p>
      </div>
    </div>
    <div class="footer">Powered by <a href="https://keyflow.raindesignlabs.net">KeyFlow CRM</a></div>
  </div>

  <script>
    const SLUG = "${link.slug}";
    let selectedSlot = null;

    async function loadAvailability() {
      try {
        const res = await fetch('/public/book/' + SLUG + '/availability');
        const data = await res.json();
        renderAvailability(data.availability);
      } catch(e) {
        document.getElementById('availability').innerHTML = '<div class="loading">Unable to load times. Please try again.</div>';
      }
    }

    function renderAvailability(days) {
      if (!days || days.length === 0) {
        document.getElementById('availability').innerHTML = '<div class="loading">No available times in the next ${link.maxAdvanceDays} days.</div>';
        return;
      }
      let html = '';
      for (const day of days.slice(0, 10)) {
        const availableSlots = day.slots.filter(s => s.available);
        if (availableSlots.length === 0) continue;
        html += '<div class="day"><div class="day-name">' + day.dayName + '</div><div class="slots">';
        for (const s of day.slots) {
          const cls = s.available ? 'slot' : 'slot unavailable';
          html += '<button class="' + cls + '"' + (s.available ? '' : ' disabled') + ' data-dt="' + s.datetime + '">' + formatTime(s.time) + '</button>';
        }
        html += '</div></div>';
      }
      document.getElementById('availability').innerHTML = html || '<div class="loading">All booked up! Check back soon.</div>';

      document.querySelectorAll('.slot:not(.unavailable)').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.slot.selected').forEach(s => s.classList.remove('selected'));
          btn.classList.add('selected');
          selectedSlot = btn.dataset.dt;
          document.getElementById('selectedSlot').value = selectedSlot;
          document.getElementById('form').style.display = 'block';
          document.getElementById('form').scrollIntoView({ behavior: 'smooth' });
        });
      });
    }

    function formatTime(time24) {
      const [h, m] = time24.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      return hour12 + ':' + m + ' ' + ampm;
    }

    document.getElementById('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      btn.disabled = true;
      btn.textContent = 'Booking…';
      try {
        const res = await fetch('/public/book/' + SLUG, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospectName: document.getElementById('name').value,
            prospectEmail: document.getElementById('email').value,
            prospectPhone: document.getElementById('phone').value,
            prospectNotes: document.getElementById('notes').value,
            slot: selectedSlot,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles',
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Booking failed');
        document.getElementById('form').style.display = 'none';
        document.getElementById('availability').style.display = 'none';
        const d = new Date(data.booking.scheduledAt);
        document.getElementById('successDetails').textContent =
          d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' at ' +
          d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        document.getElementById('success').style.display = 'block';
      } catch(err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = 'Confirm Booking';
      }
    });

    loadAvailability();
  </script>
</body>
</html>`;
}

function renderNotFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Not Found — KeyFlow</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #f5f7fa; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .msg { text-align: center; }
    h1 { color: #1a1a2e; }
    p { color: #6b7280; }
  </style>
</head>
<body>
  <div class="msg">
    <h1>Booking link not found</h1>
    <p>This link may have expired or been deactivated.</p>
  </div>
</body>
</html>`;
}
