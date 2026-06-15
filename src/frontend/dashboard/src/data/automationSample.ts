export type AutomationMode = "auto" | "ask" | "never";

export type AutomationCapability = {
  label: string;
  description: string;
  defaultMode: AutomationMode;
};

export const leadHandlingCapabilities: AutomationCapability[] = [
  { label: "Reply to a brand-new lead", description: "Within 5 minutes, any hour", defaultMode: "auto" },
  { label: "Ask qualifying questions", description: "Budget, timeline, area, financing", defaultMode: "auto" },
  { label: "Capture buyer & seller needs", description: "Save to the lead profile", defaultMode: "auto" },
  { label: "Suggest appointment times", description: "From your live calendar", defaultMode: "ask" },
  { label: "Book directly on your calendar", description: "Without checking with you first", defaultMode: "ask" },
];

export const outreachCapabilities: AutomationCapability[] = [
  { label: "Send a follow-up email or text", description: "Outbound messages to leads", defaultMode: "ask" },
  { label: "Re-engage a cold lead", description: "After 7 days of silence", defaultMode: "auto" },
  { label: "Quote a price or price range", description: "Any listing or offer", defaultMode: "never" },
  { label: "Discuss contract or legal terms", description: "Disclosures, contingencies", defaultMode: "never" },
];

export const escalationRules = [
  "Asks for Diana by name",
  "Budget over $1M",
  "Upset or complaint",
  "Legal question",
  "Mentions another agent",
] as const;
