export const snapshotBase = [
  ["Business", "Reyes Realty Group"],
  ["Industry", "Residential real estate"],
  ["Primary contact", "Diana Reyes"],
  ["Serves", "Buyers & sellers, Skagit County"],
  ["Team size", "Solo agent + 1 assistant"],
  ["Current tools", "Spreadsheet, phone, Gmail"],
] as const;

export const snapshotExpert = [
  ["New leads / month", "~60"],
  ["Avg. deal size", "$540k"],
  ["Response SLA target", "5 min"],
  ["After-hours share", "41% of calls"],
] as const;

export const painPoints = [
  {
    icon: "phone",
    title: "Missed calls after hours",
    body: "Most new-buyer calls land after 5 PM and go to voicemail. By morning, the lead has already called another agent.",
  },
  {
    icon: "clock",
    title: "Slow first follow-up",
    body: "Manual replies take 3–6 hours. Speed-to-lead is the single biggest factor in who wins the listing.",
  },
  {
    icon: "doc",
    title: "Repetitive intake",
    body: "The same 8 qualifying questions — budget, timeline, area, financing — typed out by hand for every lead.",
  },
] as const;

export const aiHandles = [
  "Respond to every new lead within 5 minutes",
  "Ask the qualifying questions",
  "Capture budget, timeline & preferred areas",
  "Suggest appointment times from your calendar",
  "Flag and escalate hot leads to you",
] as const;

export const humanControls = [
  "Pricing & market strategy",
  "Negotiations & offers",
  "Contract & legal questions",
  "Emotional, high-stakes conversations",
] as const;

export const knowledgeRows = [
  { name: "Buyer Intake Brief", status: "ready", channels: "Voice · Email · SMS", date: "Jun 11", owner: "Diana", progress: 100 },
  { name: "Seller Listing Brief", status: "ready", channels: "Voice · Email", date: "Jun 10", owner: "Diana", progress: 100 },
  { name: "Closing Timeline Brief", status: "review", channels: "Voice", date: "Jun 13", owner: "Assistant", progress: 70 },
  { name: "Escalation Rules", status: "ready", channels: "All channels", date: "Jun 9", owner: "Diana", progress: 100 },
  { name: "Tone & Voice Rules", status: "draft", channels: "All channels", date: "Jun 13", owner: "Diana", progress: 40 },
] as const;

export const successTargets = [
  { target: "10+", label: "leads contacted", sub: "in the first 2 weeks", value: 14, goal: 10 },
  { target: "3+", label: "qualified conversations", sub: "budget + timeline captured", value: 4, goal: 3 },
  { target: "1+", label: "booked appointment", sub: "on Diana's calendar", value: 2, goal: 1 },
] as const;

export const checklist = [
  { label: "Business profile complete", state: "done", owner: "Diana", date: "Jun 9" },
  { label: "Voice & tone approved", state: "done", owner: "Diana", date: "Jun 10" },
  { label: "Knowledge briefs approved", state: "done", owner: "Diana", date: "Jun 11" },
  { label: "Escalation rules approved", state: "done", owner: "Diana", date: "Jun 11" },
  { label: "Test conversation reviewed", state: "now", owner: "You", date: "—" },
  { label: "Pilot ready to launch", state: "todo", owner: "—", date: "—" },
] as const;

export const kpis = [
  { label: "Leads contacted", value: "14", delta: "+6", trend: "up", sub: "vs target 10" },
  { label: "Qualified", value: "4", delta: "+2", trend: "up", sub: "budget + timeline" },
  { label: "Appointments", value: "2", delta: "+1", trend: "up", sub: "on your calendar" },
  { label: "Avg. response", value: "2m 41s", delta: "−18m", trend: "up", sub: "was 21m manual" },
  { label: "Awaiting approval", value: "2", delta: "", trend: "flat", sub: "follow-up drafts" },
  { label: "Escalations", value: "1", delta: "", trend: "flat", sub: "one hot buyer" },
] as const;

export const liveActivity = [
  { action: "Followed up with new lead", lead: "Sarah Miller", status: "Qualified", kind: "ok", when: "4m ago" },
  { action: "Answered after-hours call", lead: "Marcus Lee", status: "Summarized", kind: "info", when: "32m ago" },
  { action: "Drafted reply", lead: "T. Okafor", status: "Needs approval", kind: "warn", when: "1h ago" },
  { action: "Escalated hot buyer", lead: "Sarah Miller", status: "Escalated", kind: "bad", when: "1h ago" },
] as const;
