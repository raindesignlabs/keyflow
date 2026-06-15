import { Queue } from "bullmq";
import connection from "./connection.js";

/** Daily briefing queue — one repeatable job per user */
export const dailyBriefingQueue = new Queue("daily-briefing", { connection });

/** Pipeline alert queue — triggered on deal stage changes */
export const pipelineAlertQueue = new Queue("pipeline-alert", { connection });

/** Lead alert queue — triggered on new/high-score leads */
export const leadAlertQueue = new Queue("lead-alert", { connection });

/** Voice agent health monitoring queue — connectivity, tunnel, call watcher, daily report */
export const voiceHealthQueue = new Queue("voice-health", {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});
