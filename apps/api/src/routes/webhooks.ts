import type { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";
import { prisma } from "../lib/db.js";
import { commentQueue } from "../lib/queue.js";
import { extractCommentEvents } from "../lib/webhooks.js";

export async function webhookRoutes(app: FastifyInstance) {
  app.get("/webhooks/meta", async (request, reply) => {
    const query = request.query as {
      "hub.mode"?: string;
      "hub.verify_token"?: string;
      "hub.challenge"?: string;
    };

    if (
      query["hub.mode"] === "subscribe" &&
      query["hub.verify_token"] === env.WEBHOOK_VERIFY_TOKEN &&
      query["hub.challenge"]
    ) {
      return reply.code(200).send(query["hub.challenge"]);
    }

    return reply.code(403).send({ error: "Webhook verification failed" });
  });

  app.post("/webhooks/meta", async (request, reply) => {
    const payload = (request.body ?? {}) as Prisma.InputJsonValue;
    const rawPayload = payload as Record<string, unknown>;

    await prisma.webhookEvent.create({
      data: {
        object: String(rawPayload.object ?? "unknown"),
        payload,
      },
    });

    const extractedEvents = extractCommentEvents(rawPayload);

    for (const event of extractedEvents) {
      const linkedAccount =
        event.entryId
          ? await prisma.instagramAccount.findFirst({
              where: {
                OR: [
                  { igUserId: event.entryId },
                  { pageId: event.entryId },
                ],
              },
              select: { id: true },
            })
          : null;

      const commentEvent = await prisma.commentEvent.upsert({
        where: { commentId: event.commentId },
        update: {
          instagramAccountId: linkedAccount?.id ?? null,
          entryId: event.entryId,
          mediaId: event.mediaId,
          commentText: event.commentText,
          actorId: event.actorId,
          actorUsername: event.actorUsername,
          raw: event.raw as Prisma.InputJsonValue,
        },
        create: {
          instagramAccountId: linkedAccount?.id ?? null,
          entryId: event.entryId,
          mediaId: event.mediaId,
          commentId: event.commentId,
          commentText: event.commentText,
          actorId: event.actorId,
          actorUsername: event.actorUsername,
          raw: event.raw as Prisma.InputJsonValue,
        },
      });

      await commentQueue.add(
        "comment.received",
        {
          commentEventId: commentEvent.id,
        },
        {
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      );
    }

    return reply.code(200).send({ received: true, events: extractedEvents.length });
  });
}
