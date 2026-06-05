import "dotenv/config";
import cron from "node-cron";
import { Worker } from "bullmq";
import { batchScore } from "@recolab/api/jobs/batchScore";
import { modelQueue, queueConnection } from "@recolab/api/jobs/queues";

const cronExpression = process.env.MODEL_REFRESH_CRON ?? "*/30 * * * *";

new Worker(
  "model-refresh",
  async () => {
    const result = await batchScore();
    console.log(`model refresh complete: ${result.version}`);
    return result;
  },
  { connection: queueConnection }
);

cron.schedule(cronExpression, async () => {
  const job = await modelQueue.add("refresh", { reason: "scheduled" });
  console.log(`scheduled model-refresh job ${job.id}`);
});

console.log(`RecoLab worker online; refresh schedule ${cronExpression}`);
