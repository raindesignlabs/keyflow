/**
 * KeyFlow AI Content Studio
 *
 * Generates real estate content in the agent's voice:
 * - Property descriptions
 * - Follow-up emails
 * - Social media captions
 * - Listing copy
 * - Market update posts
 *
 * Uses the same LangChain/OpenAI pattern as the briefing service.
 * Falls back to quality templates when OPENAI_API_KEY is not set.
 */

import { ChatOpenAI } from "@langchain/openai";

// ── Types ──────────────────────────────────────────────────────────────

export type ContentType =
  | "property_description"
  | "follow_up_email"
  | "social_caption"
  | "listing_copy"
  | "market_update";

interface VoiceProfile {
  tone?: string;
  exampleMessages?: string[];
  phrasesToAvoid?: string[];
  signature?: string;
  styleNotes?: string;
}

interface PropertyContext {
  address?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  yearBuilt?: number | null;
  notes?: string | null;
  marketingNotes?: string | null;
}

interface ContactContext {
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  status?: string;
  communicationStyle?: {
    tone?: string;
    preferredChannel?: string;
    notes?: string;
  } | null;
}

interface GenerationRequest {
  type: ContentType;
  prompt?: string;
  property?: PropertyContext;
  contact?: ContactContext;
  voiceProfile?: VoiceProfile | null;
  organizationName?: string;
  agentName?: string;
  variants?: number; // number of alternative versions (1-3)
}

interface GenerationResult {
  content: string;
  variants?: string[];
  model: string;
  voiceProfileUsed: boolean;
}

// ── Model ──────────────────────────────────────────────────────────────

function getModel(): ChatOpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
}

// ── Prompt Builders ────────────────────────────────────────────────────

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  property_description: "MLS property description",
  follow_up_email: "client follow-up email",
  social_caption: "social media caption",
  listing_copy: "listing marketing copy",
  market_update: "market update post",
};

function buildSystemPrompt(
  type: ContentType,
  voiceProfile: VoiceProfile | null | undefined,
  agentName?: string,
  orgName?: string,
): string {
  const base = `You are KeyFlow's AI Content Studio writing ${CONTENT_TYPE_LABELS[type]} for a real estate professional.`;

  const voice = voiceProfile?.tone
    ? `\n\nVOICE PROFILE:\n- Tone: ${voiceProfile.tone}`
    : "";

  const examples = voiceProfile?.exampleMessages?.length
    ? `\n- Example messages in this agent's voice:\n${voiceProfile.exampleMessages.map((m) => `  "${m}"`).join("\n")}`
    : "";

  const avoid = voiceProfile?.phrasesToAvoid?.length
    ? `\n- NEVER use these phrases: ${voiceProfile.phrasesToAvoid.join(", ")}`
    : "";

  const signature = voiceProfile?.signature
    ? `\n- Sign emails/messages with: ${voiceProfile.signature}`
    : "";

  const notes = voiceProfile?.styleNotes
    ? `\n- Style notes: ${voiceProfile.styleNotes}`
    : "";

  const identity = agentName || orgName
    ? `\n- Agent name: ${agentName || "N/A"}\n- Brokerage: ${orgName || "N/A"}`
    : "";

  const rules = `\n\nRULES:\n- Write in third person for property descriptions and listing copy\n- Write in first person for emails and social posts\n- Be specific — reference actual features, not generic platitudes\n- Do NOT use words like "leverage", "delve", "robust", "seamless", "synergy", "nestled", "quintessential"\n- Keep property descriptions under 250 words (MLS standard)\n- Keep emails under 150 words\n- Keep social captions under 280 characters\n- Use plain English\n- Be warm but professional`;

  return `${base}${voice}${examples}${avoid}${signature}${notes}${identity}${rules}`;
}

function buildPropertyContext(property: PropertyContext): string {
  const parts: string[] = [];
  if (property.address) parts.push(`Address: ${property.address}`);
  if (property.bedrooms) parts.push(`Bedrooms: ${property.bedrooms}`);
  if (property.bathrooms) parts.push(`Bathrooms: ${property.bathrooms}`);
  if (property.yearBuilt) parts.push(`Year built: ${property.yearBuilt}`);
  if (property.marketingNotes) parts.push(`Agent notes about the property: ${property.marketingNotes}`);
  if (property.notes) parts.push(`Additional details: ${property.notes}`);
  return parts.length > 0 ? `PROPERTY DETAILS:\n${parts.join("\n")}` : "";
}

function buildContactContext(contact: ContactContext): string {
  const parts: string[] = [];
  if (contact.firstName) parts.push(`Name: ${contact.firstName} ${contact.lastName || ""}`);
  if (contact.email) parts.push(`Email: ${contact.email}`);
  if (contact.status) parts.push(`Status: ${contact.status}`);
  if (contact.communicationStyle?.tone)
    parts.push(`Communication preference: ${contact.communicationStyle.tone}`);
  if (contact.communicationStyle?.notes)
    parts.push(`Notes: ${contact.communicationStyle.notes}`);
  return parts.length > 0 ? `CONTACT DETAILS:\n${parts.join("\n")}` : "";
}

function buildUserPrompt(request: GenerationRequest): string {
  const sections: string[] = [];

  const property = request.property ? buildPropertyContext(request.property) : "";
  const contact = request.contact ? buildContactContext(request.contact) : "";

  if (property) sections.push(property);
  if (contact) sections.push(contact);
  if (request.prompt) sections.push(`SPECIFIC REQUEST:\n${request.prompt}`);

  const instruction = buildContentInstruction(request.type);
  sections.push(instruction);

  if (request.variants && request.variants > 1) {
    sections.push(`\nGenerate ${request.variants} distinct versions. Separate them with "---VARIANT---".`);
  }

  return sections.filter(Boolean).join("\n\n");
}

function buildContentInstruction(type: ContentType): string {
  switch (type) {
    case "property_description":
      return `Write a compelling MLS-ready property description. Lead with the strongest feature. Include room-by-room highlights if details available. End with a call to action to schedule a showing.`;

    case "follow_up_email":
      return `Write a follow-up email to this contact. Reference their current status and stage in the pipeline. Include a specific next step (schedule a call, see a property, review listings). Be warm, not pushy.`;

    case "social_caption":
      return `Write a social media caption suitable for Instagram or Facebook. Include relevant hashtags. If property details are available, reference key selling points. End with a question or CTA to drive engagement.`;

    case "listing_copy":
      return `Write full listing marketing copy — headline + body + bullet points of key features. This goes on the agent's website and marketing materials. Make it persuasive and specific.`;

    case "market_update":
      return `Write a market update post for social media or email newsletter. If no specific data is provided, write a general market awareness message encouraging buyers/sellers to reach out for a personalized analysis.`;
  }
}

// ── Fallback Templates ─────────────────────────────────────────────────

function fallbackGenerate(request: GenerationRequest): GenerationResult {
  const name = request.contact?.firstName || "there";

  switch (request.type) {
    case "property_description":
      return {
        content: `Beautiful ${request.property?.bedrooms || ""} bed, ${request.property?.bathrooms || ""} bath home${request.property?.address ? ` at ${request.property.address}` : ""}. ${request.property?.marketingNotes || "This property offers exceptional value and thoughtful design throughout."} Don't miss this opportunity — schedule your private showing today.`,
        model: "template",
        voiceProfileUsed: false,
      };

    case "follow_up_email":
      return {
        content: `Hi ${name},\n\nThanks for connecting with us${request.agentName ? ` at ${request.agentName}` : ""}. I wanted to follow up and see if you have any questions about the current market or any properties you've been interested in.\n\nI'd love to schedule a quick call to discuss your goals. What works best for you this week?\n\nBest regards,\n${request.agentName || "Your Agent"}`,
        model: "template",
        voiceProfileUsed: false,
      };

    case "social_caption":
      return {
        content: `Just listed! 🏡 ${request.property?.bedrooms || ""} bed / ${request.property?.bathrooms || ""} bath${request.property?.address ? ` in ${request.property.address.split(",").slice(-2).join(",").trim()}` : ""}. This one won't last — DM me for details or to schedule a tour! #realestate #justlisted #homeforsale`,
        model: "template",
        voiceProfileUsed: false,
      };

    case "listing_copy":
      return {
        content: `STUNNING ${request.property?.bedrooms || ""}-Bedroom Home Awaits\n\n${request.property?.marketingNotes || "Exceptional property with outstanding features and prime location."}\n\nKey Features:\n• ${request.property?.bedrooms || "Spacious"} bedrooms\n• ${request.property?.bathrooms || "Updated"} bathrooms\n${request.property?.yearBuilt ? `• Built in ${request.property.yearBuilt}\n` : ""}• Prime location with easy access to amenities\n\nContact us today for your private tour.`,
        model: "template",
        voiceProfileUsed: false,
      };

    case "market_update":
      return {
        content: `📊 Market Update: The real estate market is always moving. Whether you're thinking about buying, selling, or just curious about your home's value, I'm here to help. Reach out for a personalized market analysis — no obligation, just honest advice. What questions do you have about today's market?`,
        model: "template",
        voiceProfileUsed: false,
      };
  }
}

// ── Main Generation Function ───────────────────────────────────────────

export async function generateContent(
  request: GenerationRequest,
): Promise<GenerationResult> {
  const model = getModel();

  if (!model) {
    return fallbackGenerate(request);
  }

  const systemPrompt = buildSystemPrompt(
    request.type,
    request.voiceProfile,
    request.agentName,
    request.organizationName,
  );
  const userPrompt = buildUserPrompt(request);

  try {
    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const rawContent = response.content as string;

    // Handle variants
    if (request.variants && request.variants > 1 && rawContent.includes("---VARIANT---")) {
      const parts = rawContent.split("---VARIANT---").map((s) => s.trim()).filter(Boolean);
      return {
        content: parts[0] || rawContent,
        variants: parts.slice(1),
        model: "gpt-4o-mini",
        voiceProfileUsed: !!request.voiceProfile?.tone,
      };
    }

    return {
      content: rawContent,
      model: "gpt-4o-mini",
      voiceProfileUsed: !!request.voiceProfile?.tone,
    };
  } catch (err) {
    console.error("[Content Studio] AI generation failed, using template:", err);
    return fallbackGenerate(request);
  }
}

// ── Content Type Metadata (for UI) ─────────────────────────────────────

export const CONTENT_TYPES: Array<{
  type: ContentType;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    type: "property_description",
    label: "Property Description",
    description: "MLS-ready description highlighting key features",
    icon: "🏠",
  },
  {
    type: "follow_up_email",
    label: "Follow-Up Email",
    description: "Personalized email to nurture a contact",
    icon: "✉️",
  },
  {
    type: "social_caption",
    label: "Social Media Caption",
    description: "Instagram/Facebook post with hashtags",
    icon: "📱",
  },
  {
    type: "listing_copy",
    label: "Listing Marketing Copy",
    description: "Full listing copy for website and flyers",
    icon: "📋",
  },
  {
    type: "market_update",
    label: "Market Update Post",
    description: "Market awareness post for social or email",
    icon: "📊",
  },
];
