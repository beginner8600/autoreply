import { Queue } from "bullmq";
import { Redis } from "ioredis";

import { env } from "../config/env.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const commentQueue = new Queue("comment-events", {
  connection: redis,
});
