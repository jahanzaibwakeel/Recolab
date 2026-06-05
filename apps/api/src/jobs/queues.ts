import { Queue } from "bullmq";
import { config } from "../config.js";

const valkeyUrl = new URL(config.valkeyUrl);

export const queueConnection = {
  host: valkeyUrl.hostname,
  port: Number(valkeyUrl.port || 6379),
  password: valkeyUrl.password || undefined,
  maxRetriesPerRequest: null,
  lazyConnect: true
};

export const modelQueue = new Queue("model-refresh", {
  connection: queueConnection
});
