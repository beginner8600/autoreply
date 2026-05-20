import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { startCommentWorker } from "./worker.js";

const app = await createApp();

try {
  await app.listen({
    host: "0.0.0.0",
    port: env.PORT,
  });

  // Run the comment-events worker in the same process as the API.
  // Keeps the deployment to a single service (no separate worker dyno).
  startCommentWorker();
  app.log.info("comment worker started in-process");
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
