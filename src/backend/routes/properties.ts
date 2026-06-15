import { FastifyInstance } from "fastify";
import { properties } from "../models/schema.js";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Validation schemas
const propertyCreateSchema = z.object({
  contactId: z.string().uuid(),
  address: z.string().min(1),
  yearBuilt: z.number().int().optional(),
  yearPurchased: z.number().int().optional(),
  bedrooms: z.number().int().optional(),
  fullBathrooms: z.number().int().optional(),
  halfBathrooms: z.number().int().optional(),
  garageType: z.string().max(50).optional(),
  garageCapacity: z.number().int().optional(),
  electricProvider: z.string().max(100).optional(),
  electricAvgBill: z.string().max(50).optional(),
  waterProvider: z.string().max(100).optional(),
  waterAvgBill: z.string().max(50).optional(),
  trashProvider: z.string().max(100).optional(),
  trashAvgBill: z.string().max(50).optional(),
  internetProvider: z.string().max(100).optional(),
  internetAvgBill: z.string().max(50).optional(),
  internetSpeed: z.string().max(50).optional(),
  heatingType: z.string().max(100).optional(),
  heatingAge: z.string().max(50).optional(),
  coolingType: z.string().max(100).optional(),
  coolingAge: z.string().max(50).optional(),
  waterHeaterType: z.string().max(50).optional(),
  roofType: z.string().max(50).optional(),
  roofAge: z.string().max(50).optional(),
  septicSewer: z.string().max(20).optional(),
  septicSize: z.string().max(50).optional(),
  septicLastCleaned: z.string().max(50).optional(),
  waterSource: z.string().max(100).optional(),
  securitySystem: z.string().max(100).optional(),
  camerasConvey: z.string().max(20).optional(),
  insuranceCompany: z.string().max(100).optional(),
  insuranceAnnualPremium: z.string().max(50).optional(),
  annualTaxes: z.string().max(50).optional(),
  termiteCompany: z.string().max(100).optional(),
  termiteAnnualCost: z.string().max(50).optional(),
  appliancesNotes: z.string().optional(),
  negotiationItems: z.string().optional(),
  marketingLoveNotes: z.string().optional(),
});

const propertyUpdateSchema = propertyCreateSchema.partial();

export async function propertyRoutes(app: FastifyInstance) {
  // Get all properties
  app.get("/properties", async (_request, _reply) => {
    const allProperties = await db.select().from(properties);
    return { properties: allProperties };
  });

  // Get properties by contact ID
  app.get("/properties/contact/:contactId", async (request, _reply) => {
    const { contactId } = request.params as { contactId: string };
    const contactProperties = await db
      .select()
      .from(properties)
      .where(eq(properties.contactId, contactId));
    return { properties: contactProperties };
  });

  // Get single property by ID
  app.get("/properties/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id));

    if (!property) {
      reply.code(404);
      return { error: "Property not found" };
    }

    return { property };
  });

  // Create property
  app.post("/properties", async (request, reply) => {
    try {
      const body = propertyCreateSchema.parse(request.body);

      const [newProperty] = await db
        .insert(properties)
        .values(body)
        .returning();

      reply.code(201);
      return { property: newProperty };
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return { error: "Invalid property data" };
    }
  });

  // Update property
  app.put("/properties/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const body = propertyUpdateSchema.parse(request.body);

      const [updatedProperty] = await db
        .update(properties)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(properties.id, id))
        .returning();

      if (!updatedProperty) {
        reply.code(404);
        return { error: "Property not found" };
      }

      return { property: updatedProperty };
    } catch (error) {
      request.log.error(error);
      reply.code(400);
      return { error: "Invalid property data" };
    }
  });

  // Delete property
  app.delete("/properties/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const [deletedProperty] = await db
      .delete(properties)
      .where(eq(properties.id, id))
      .returning();

    if (!deletedProperty) {
      reply.code(404);
      return { error: "Property not found" };
    }

    return { message: "Property deleted", id };
  });
}