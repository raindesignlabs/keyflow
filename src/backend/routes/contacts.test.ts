/**
 * Contact Routes Tests
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { contactsRoutes } from "./contacts";

describe("Contacts API", () => {
  let app: any;

  beforeAll(async () => {
    app = Fastify({
      logger: false,
    });

    await app.register(cors);
    await app.register(contactsRoutes, { prefix: "/api/contacts" });

    await app.listen({ port: 3201, host: "127.0.0.1" });
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET / should list contacts", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/contacts",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("contacts");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page");
    expect(Array.isArray(body.contacts)).toBe(true);
  });

  it("POST / should create a contact", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/contacts",
      payload: {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phone: "+1-555-0456",
        source: "referral",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.contact).toHaveProperty("id");
    expect(body.contact.firstName).toBe("Jane");
    expect(body.contact.email).toBe("jane@example.com");
  });

  it("GET /:id should retrieve a contact", async () => {
    // First create a contact
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/contacts",
      payload: {
        firstName: "Bob",
        lastName: "Johnson",
        email: "bob@example.com",
      },
    });

    const contactId = JSON.parse(createResponse.body).contact.id;

    // Then retrieve it
    const getResponse = await app.inject({
      method: "GET",
      url: `/api/contacts/${contactId}`,
    });

    expect(getResponse.statusCode).toBe(200);
    const body = JSON.parse(getResponse.body);
    expect(body.contact.id).toBe(contactId);
    expect(body.contact.firstName).toBe("Bob");
  });

  it("PATCH /:id should update a contact", async () => {
    // Create a contact
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/contacts",
      payload: {
        firstName: "Alice",
        lastName: "Brown",
        email: "alice@example.com",
      },
    });

    const contactId = JSON.parse(createResponse.body).contact.id;

    // Update it
    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/api/contacts/${contactId}`,
      payload: {
        firstName: "Alicia",
        status: "qualified",
      },
    });

    expect(updateResponse.statusCode).toBe(200);
    const body = JSON.parse(updateResponse.body);
    expect(body.contact.firstName).toBe("Alicia");
    expect(body.contact.status).toBe("qualified");
  });

  it("DELETE /:id should delete a contact", async () => {
    // Create a contact
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/contacts",
      payload: {
        firstName: "Charlie",
        lastName: "Davis",
        email: "charlie@example.com",
      },
    });

    const contactId = JSON.parse(createResponse.body).contact.id;

    // Delete it
    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/contacts/${contactId}`,
    });

    expect(deleteResponse.statusCode).toBe(200);

    // Verify it's gone
    const getResponse = await app.inject({
      method: "GET",
      url: `/api/contacts/${contactId}`,
    });

    expect(getResponse.statusCode).toBe(404);
  });
});
