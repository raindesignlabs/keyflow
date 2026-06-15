/**
 * KeyFlow CRM — Full API Test Suite
 *
 * Tests all routes against the live dev server at localhost:3200.
 * Run `pnpm dev` first, then `pnpm test:api`.
 */

const BASE = "http://localhost:3200/api";
const API_KEY = process.env.KEYFLOW_API_KEY || "";

// Helpers
async function api(method: string, path: string, body?: any) {
  const hasBody = body && method !== "GET" && method !== "DELETE";
  const opts: any = { method, headers: {} };
  // The REST API is guarded — authenticate as an internal service.
  if (API_KEY) opts.headers["x-api-key"] = API_KEY;
  if (hasBody) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();
  return { status: res.status, data: json };
}

let passed = 0;
let failed = 0;
const errors: string[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message}`);
    errors.push(`${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// ── Tests ──────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🧪 KeyFlow CRM API Tests\n");

  // Health check
  console.log("── Health ──");
  await test("GET /api/health returns ok", async () => {
    const { status, data } = await api("GET", "/health");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.status === "ok", `Expected ok, got ${data.status}`);
    assert(data.service === "keyflow-crm", `Expected keyflow-crm, got ${data.service}`);
  });

  // Contacts
  console.log("\n── Contacts ──");
  let contactId: string;

  await test("POST /api/contacts creates a contact", async () => {
    const { status, data } = await api("POST", "/contacts", {
      firstName: "Test",
      lastName: "User",
      email: "test@keyflow.dev",
      phone: "+1-555-0001",
      source: "test",
    });
    assert(status === 201, `Expected 201, got ${status}`);
    assert(data.contact.id, "No contact ID returned");
    assert(data.contact.firstName === "Test", `Expected Test, got ${data.contact.firstName}`);
    contactId = data.contact.id;
  });

  await test("GET /api/contacts lists contacts", async () => {
    const { status, data } = await api("GET", "/contacts");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.contacts), "contacts should be an array");
    assert(data.total >= 1, `Expected total >= 1, got ${data.total}`);
  });

  await test("GET /api/contacts/:id retrieves contact", async () => {
    const { status, data } = await api("GET", `/contacts/${contactId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.contact.id === contactId, "Contact ID mismatch");
    assert(data.contact.firstName === "Test", "Wrong contact returned");
  });

  await test("GET /api/contacts?search= filters contacts", async () => {
    const { status, data } = await api("GET", "/contacts?search=Test");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.contacts.length >= 1, "Search should find at least 1 contact");
  });

  await test("PATCH /api/contacts/:id updates contact", async () => {
    const { status, data } = await api("PATCH", `/contacts/${contactId}`, {
      firstName: "Updated",
      status: "qualified",
      leadScore: 75,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.contact.firstName === "Updated", "First name not updated");
    assert(data.contact.status === "qualified", "Status not updated");
    assert(data.contact.leadScore === 75, "Lead score not updated");
  });

  // Activities
  console.log("\n── Activities ──");
  let activityId: string;

  await test("POST /api/contacts/:id/activities creates activity", async () => {
    const { status, data } = await api("POST", `/contacts/${contactId}/activities`, {
      type: "call",
      direction: "outbound",
      subject: "Discovery call",
      body: "Great conversation about their needs",
      status: "completed",
    });
    assert(status === 201, `Expected 201, got ${status}`);
    assert(data.activity.id, "No activity ID returned");
    assert(data.activity.type === "call", `Expected call, got ${data.activity.type}`);
    activityId = data.activity.id;
  });

  await test("GET /api/contacts/:id/activities lists activities", async () => {
    const { status, data } = await api("GET", `/contacts/${contactId}/activities`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.activities), "activities should be an array");
    assert(data.activities.length >= 1, "Should have at least 1 activity");
  });

  await test("GET /api/contacts/:id/activities/:actId gets activity", async () => {
    const { status, data } = await api("GET", `/contacts/${contactId}/activities/${activityId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.activity.id === activityId, "Activity ID mismatch");
  });

  await test("PATCH /api/contacts/:id/activities/:actId updates activity", async () => {
    const { status, data } = await api("PATCH", `/contacts/${contactId}/activities/${activityId}`, {
      body: "Updated notes here",
      subject: "Updated subject",
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.activity.body === "Updated notes here", "Body not updated");
  });

  // Smart Lists
  console.log("\n── Smart Lists ──");
  let listId: string;

  await test("POST /api/smart-lists creates a list", async () => {
    // Need a user ID — create one from contacts endpoint
    const { status, data } = await api("POST", "/smart-lists", {
      name: "Test Smart List",
      description: "Test list for API tests",
      type: "custom",
      filters: {
        conditions: [
          { field: "leadScore", operator: "gte", value: 70 },
        ],
        logic: "and",
      },
      userId: "00000000-0000-0000-0000-000000000001",
    });
    assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert(data.list.id, "No list ID returned");
    listId = data.list.id;
  });

  await test("GET /api/smart-lists lists all", async () => {
    const { status, data } = await api("GET", "/smart-lists");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.lists), "lists should be an array");
  });

  await test("GET /api/smart-lists/:id gets list", async () => {
    const { status, data } = await api("GET", `/smart-lists/${listId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.list.id === listId, "List ID mismatch");
  });

  await test("PATCH /api/smart-lists/:id updates list", async () => {
    const { status, data } = await api("PATCH", `/smart-lists/${listId}`, {
      name: "Updated Smart List",
      isPinned: true,
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.list.name === "Updated Smart List", "Name not updated");
  });

  // Deals
  console.log("\n── Deals ──");
  let dealId: string;

  await test("GET /api/deals lists deals", async () => {
    const { status, data } = await api("GET", "/deals");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.deals), "deals should be an array");
  });

  // Cleanup
  console.log("\n── Cleanup ──");

  await test("DELETE /api/contacts/:id/activities/:actId deletes activity", async () => {
    const { status, data } = await api("DELETE", `/contacts/${contactId}/activities/${activityId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.deleted === true, "Should return deleted: true");
  });

  await test("DELETE /api/contacts/:id deletes contact", async () => {
    const { status, data } = await api("DELETE", `/contacts/${contactId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.deleted === true, "Should return deleted: true");
  });

  await test("DELETE /api/smart-lists/:id deletes list", async () => {
    const { status, data } = await api("DELETE", `/smart-lists/${listId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.deleted === true, "Should return deleted: true");
  });

  // Summary
  console.log(`\n${"=".repeat(40)}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  if (errors.length > 0) {
    console.log("\n  Failures:");
    errors.forEach((e) => console.log(`    - ${e}`));
  }
  console.log(`${"=".repeat(40)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
