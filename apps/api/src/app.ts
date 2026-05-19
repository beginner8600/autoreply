import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import Fastify from "fastify";

import { env } from "./config/env.js";
import { authRoutes } from "./routes/auth.js";
import { automationRoutes } from "./routes/automations.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { healthRoutes } from "./routes/health.js";
import { instagramRoutes } from "./routes/instagram.js";
import { webhookRoutes } from "./routes/webhooks.js";

export async function createApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: false,
  });

  await app.register(sensible);
  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await healthRoutes(app);
  await authRoutes(app);
  await dashboardRoutes(app);
  await instagramRoutes(app);
  await automationRoutes(app);
  await webhookRoutes(app);

  return app;
}
