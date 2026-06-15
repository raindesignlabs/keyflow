import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.5,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

interface BriefingData {
  newLeads: Array<{
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    leadScore: number | null;
    source: string | null;
    createdAt: Date;
  }>;
  dealUpdates: Array<{
    title: string;
    stage: string;
    value: string | null;
    probability: number | null;
    updatedAt: Date;
  }>;
  recentActivity: Array<{
    type: string;
    subject: string | null;
    aiSummary: string | null;
    direction: string | null;
    createdAt: Date;
  }>;
  isAdmin: boolean;
  userName: string;
}

export async function generateAIBriefing(data: BriefingData): Promise<string> {
  const { newLeads, dealUpdates, recentActivity, isAdmin, userName } = data;

  // If no data at all, return a simple message without calling the AI
  if (newLeads.length === 0 && dealUpdates.length === 0 && recentActivity.length === 0) {
    return `Good morning, ${userName}! Nothing new since yesterday. You're all caught up. 🎉`;
  }

  const roleContext = isAdmin
    ? "You are writing to the business owner/admin. Include org-wide insights and strategic recommendations."
    : "You are writing to an agent. Focus on their personal pipeline and actionable next steps.";

  const prompt = `You are KeyFlow's AI assistant writing a daily briefing email.
${roleContext}

USER: ${userName}

DATA FROM THE LAST 24 HOURS:

New Leads (${newLeads.length}):
${newLeads.map(l => `- ${l.firstName} ${l.lastName || ""} | Score: ${l.leadScore || 0} | Source: ${l.source || "unknown"} | ${l.email || l.phone || "no contact"}`).join("\n")}

Deal Updates (${dealUpdates.length}):
${dealUpdates.map(d => `- ${d.title} | Stage: ${d.stage} | Value: $${d.value || "N/A"} | Probability: ${d.probability || "N/A"}%`).join("\n")}

Recent Activity (${recentActivity.length}):
${recentActivity.map(a => `- [${a.type}] ${a.subject || "No subject"} ${a.aiSummary ? "| " + a.aiSummary : ""} (${a.direction || "N/A"})`).join("\n")}

Write a concise, friendly daily briefing. Rules:
- Start with a personalized greeting
- Lead with the most important items (high-score leads, deal changes)
- Include 1-2 actionable recommendations
- Keep it under 200 words
- Use plain English, no jargon
- End with a quick summary line
- Do NOT use words like "leverage", "delve", "robust", "seamless", "synergy"
- Use bullet points for clarity`;

  try {
    const response = await model.invoke(prompt);
    return response.content as string;
  } catch (err) {
    console.error("[AI Briefing] Failed to generate, falling back to template:", err);
    // Fallback to template
    return buildFallbackBriefing(newLeads, dealUpdates, recentActivity, isAdmin, userName);
  }
}

function buildFallbackBriefing(
  newLeads: BriefingData["newLeads"],
  dealUpdates: BriefingData["dealUpdates"],
  recentActivity: BriefingData["recentActivity"],
  isAdmin: boolean,
  userName: string
): string {
  const parts: string[] = [];
  const greeting = isAdmin ? "📊 KeyFlow Daily Digest" : "📋 Your KeyFlow Daily Briefing";
  parts.push(`${greeting}\n\nGood morning, ${userName}!\n`);

  if (newLeads.length > 0) {
    parts.push(`📋 ${newLeads.length} new lead(s):`);
    newLeads.slice(0, 5).forEach((c) => {
      parts.push(`  • ${c.firstName} ${c.lastName || ""} (score: ${c.leadScore})`);
    });
  }

  if (dealUpdates.length > 0) {
    parts.push(`\n💰 ${dealUpdates.length} deal update(s):`);
    dealUpdates.slice(0, 5).forEach((d) => {
      parts.push(`  • ${d.title} — stage: ${d.stage}`);
    });
  }

  if (recentActivity.length > 0) {
    parts.push(`\n📝 ${recentActivity.length} activit(ies) recorded`);
  }

  return parts.join("\n");
}
