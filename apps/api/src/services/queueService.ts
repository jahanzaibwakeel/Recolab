import { modelQueue } from "../jobs/queues.js";

export async function queueStatus() {
  try {
    const [counts, waiting, active, completed, failed, delayed] = await Promise.all([
      modelQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"),
      modelQueue.getJobs(["waiting", "active", "completed", "failed", "delayed"], 0, 10, false),
      modelQueue.getJobs(["active"], 0, 5, false),
      modelQueue.getJobs(["completed"], 0, 5, false),
      modelQueue.getJobs(["failed"], 0, 5, false),
      modelQueue.getJobs(["delayed"], 0, 5, false)
    ]);
    return {
      queue: "model-refresh",
      status: "connected",
      counts,
      recent: waiting.map(formatJob),
      active: active.map(formatJob),
      completed: completed.map(formatJob),
      failed: failed.map(formatJob),
      delayed: delayed.map(formatJob)
    };
  } catch (error) {
    return {
      queue: "model-refresh",
      status: "unavailable",
      counts: {},
      recent: [],
      active: [],
      completed: [],
      failed: [],
      delayed: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function formatJob(job: any) {
  return {
    id: job.id,
    name: job.name,
    data: job.data,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    returnvalue: job.returnvalue
  };
}

