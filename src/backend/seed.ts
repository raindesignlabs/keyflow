/**
 * Seed script — creates initial data for testing
 */

import { db } from "./db/index.js";
import { pipelines, contacts, activities, deals, smartLists, users, organizations } from "./models/schema.js";

async function seed() {
  console.log("🌱 Seeding KeyFlow CRM...");

  // Create organization (idempotent)
  const existingOrgs = await db.select().from(organizations);
  if (existingOrgs.length > 0) {
    console.log("  ⏭️  Data already exists, skipping seed.");
    process.exit(0);
  }

  // Create organization
  const [org] = await db.insert(organizations).values({
    name: "Rain Design Labs",
    industry: "AI Consulting",
    website: "https://raindesignlabs.net",
    phone: "+1-555-0100",
  }).returning();
  console.log(`  ✅ Organization: ${org.name}`);

  // Create user
  const [user] = await db.insert(users).values({
    email: "james@raindesignlabs.net",
    name: "James Jameson",
    role: "owner",
    organizationId: org.id,
    phone: "+1-555-0101",
  }).returning();
  console.log(`  ✅ User: ${user.name}`);

  // Create pipeline
  const [pipeline] = await db.insert(pipelines).values({
    name: "Sales Pipeline",
    stages: ["new_lead", "active_client", "under_contract", "inspection", "appraisal", "clear_to_close", "closed"],
    isDefault: true,
    organizationId: org.id,
  }).returning();
  console.log(`  ✅ Pipeline: ${pipeline.name}`);

  // Create contacts
  const contactData = [
    { firstName: "Sarah", lastName: "Wilson", email: "sarah@acme.com", phone: "+1-555-1001", source: "linkedin", status: "qualified" as const, leadScore: 72, organizationId: org.id },
    { firstName: "Mike", lastName: "Chen", email: "mike@startup.io", phone: "+1-555-1002", source: "referral", status: "new" as const, leadScore: 45, organizationId: org.id },
    { firstName: "Emily", lastName: "Rodriguez", email: "emily@realestate.com", phone: "+1-555-1003", source: "website", status: "contacted" as const, leadScore: 88, organizationId: org.id },
    { firstName: "David", lastName: "Kim", email: "david@tech.co", phone: "+1-555-1004", source: "cold_call", status: "negotiation" as const, leadScore: 91, organizationId: org.id },
    { firstName: "Lisa", lastName: "Thompson", email: "lisa@agency.net", phone: "+1-555-1005", source: "event", status: "new" as const, leadScore: 33, organizationId: org.id },
  ];

  const createdContacts = await db.insert(contacts).values(contactData).returning();
  console.log(`  ✅ ${createdContacts.length} contacts created`);

  // Create activities for each contact
  const activityData = createdContacts.flatMap((c) => [
    { contactId: c.id, type: "call" as const, direction: "outbound", subject: "Initial discovery call", body: "Discussed needs and timeline. Very interested.", status: "completed", userId: user.id },
    { contactId: c.id, type: "note" as const, subject: "Follow-up notes", body: `Note for ${c.firstName}: needs proposal by end of week`, status: "completed", userId: user.id },
  ]);

  await db.insert(activities).values(activityData);
  console.log(`  ✅ ${activityData.length} activities created`);

  // Create deals for some contacts
  const dealData = [
    { title: "1234 Oak Lane — Martinez Family", contactId: createdContacts[0].id, pipelineId: pipeline.id, stage: "under_contract", value: "425000", assignedUserId: user.id },
    { title: "5678 Maple Dr — Chen Investment", contactId: createdContacts[1].id, pipelineId: pipeline.id, stage: "new_lead", value: "310000", assignedUserId: user.id },
    { title: "910 Elm Ct — Rodriguez Upgrade", contactId: createdContacts[2].id, pipelineId: pipeline.id, stage: "inspection", value: "589000", assignedUserId: user.id },
    { title: "222 Cedar Blvd — Kim Relocation", contactId: createdContacts[3].id, pipelineId: pipeline.id, stage: "clear_to_close", value: "475000", assignedUserId: user.id },
  ];

  await db.insert(deals).values(dealData);
  console.log(`  ✅ ${dealData.length} deals created`);

  // Create smart lists
  const smartListData = [
    { name: "Hot Leads", description: "Contacts with lead score > 70", type: "custom" as const, filters: { conditions: [{ field: "leadScore", operator: "gte", value: 70 }], logic: "and" as const }, isPinned: true, userId: user.id },
    { name: "New This Week", description: "Contacts created in the last 7 days", type: "custom" as const, filters: { conditions: [{ field: "status", operator: "eq", value: "new" }], logic: "and" as const }, isPinned: false, userId: user.id },
    { name: "Needs Follow-up", description: "AI suggested follow-up list", type: "ai_suggested" as const, filters: { conditions: [{ field: "status", operator: "in", value: ["contacted", "qualified"] }], logic: "and" as const }, aiPrompt: "contacts that need a follow-up this week", isPinned: false, userId: user.id },
  ];

  await db.insert(smartLists).values(smartListData);
  console.log(`  ✅ ${smartListData.length} smart lists created`);

  console.log("\n🎉 Seed complete! You can now test the API.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
