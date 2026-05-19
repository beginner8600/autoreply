import { DeliveryStatus } from "@prisma/client";
import type { FastifyInstance } from "fastify";

import { getAuthUser, requireAuth } from "../lib/auth.js";
import { prisma } from "../lib/db.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/summary", { preHandler: requireAuth }, async (request) => {
    const user = getAuthUser(request);

    const [accounts, automations, deliveries, sent, failed] = await Promise.all([
      prisma.instagramAccount.count({
        where: { userId: user.sub },
      }),
      prisma.automation.count({
        where: { userId: user.sub },
      }),
      prisma.messageDelivery.count({
        where: { automation: { userId: user.sub } },
      }),
      prisma.messageDelivery.count({
        where: {
          automation: { userId: user.sub },
          status: {
            in: [DeliveryStatus.SENT, DeliveryStatus.SIMULATED],
          },
        },
      }),
      prisma.messageDelivery.count({
        where: {
          automation: { userId: user.sub },
          status: DeliveryStatus.FAILED,
        },
      }),
    ]);

    return {
      accounts,
      automations,
      deliveries,
      sent,
      failed,
    };
  });
}
