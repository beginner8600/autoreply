import { DeliveryStatus, TriggerType } from "@prisma/client";
import { Worker } from "bullmq";

import { env } from "./config/env.js";
import { prisma } from "./lib/db.js";
import { replyToComment, sendCommentPrivateReply } from "./lib/meta.js";
import { redis } from "./lib/queue.js";
import { renderTemplate } from "./lib/templates.js";

function matchesAutomation(triggerType: TriggerType, keywords: string[], commentText: string) {
  if (triggerType === TriggerType.ANY_COMMENT) {
    return true;
  }

  const normalizedComment = commentText.toLowerCase();
  return keywords.some((keyword) => normalizedComment.includes(keyword));
}

export function startCommentWorker() {
  const worker = new Worker(
    "comment-events",
    async (job) => {
    const payload = job.data as {
      commentEventId: string;
    };

    const commentEvent = await prisma.commentEvent.findUnique({
      where: { id: payload.commentEventId },
      include: {
        instagramAccount: true,
      },
    });

    if (!commentEvent) {
      return;
    }

    const account = commentEvent.instagramAccount
      ? commentEvent.instagramAccount
      : commentEvent.entryId
        ? await prisma.instagramAccount.findFirst({
            where: {
              OR: [
                { igUserId: commentEvent.entryId },
                { pageId: commentEvent.entryId },
              ],
            },
          })
        : null;

    if (!account) {
      return;
    }

    const automations = await prisma.automation.findMany({
      where: {
        instagramAccountId: account.id,
        mediaId: commentEvent.mediaId,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    });

    for (const automation of automations) {
      if (!matchesAutomation(automation.triggerType, automation.keywords, commentEvent.commentText)) {
        continue;
      }

      const messageText = renderTemplate(automation.dmTemplate, {
        first_name: commentEvent.actorUsername?.split(/[.\s_]/)[0],
        username: commentEvent.actorUsername ?? undefined,
        comment: commentEvent.commentText,
      });

      const delivery = await prisma.messageDelivery.create({
        data: {
          automationId: automation.id,
          commentEventId: commentEvent.id,
          status: DeliveryStatus.QUEUED,
          messageText,
        },
      });

      const isSimulated =
        commentEvent.commentId.startsWith("sim_") ||
        env.MOCK_INSTAGRAM_CONNECT ||
        account.accessToken === "mock-access-token";

      try {
        if (isSimulated) {
          await prisma.messageDelivery.update({
            where: { id: delivery.id },
            data: {
              status: DeliveryStatus.SIMULATED,
              externalId: `simulated:${delivery.id}`,
            },
          });
        } else {
          const response = await sendCommentPrivateReply({
            igUserId: account.igUserId,
            accessToken: account.accessToken,
            commentId: commentEvent.commentId,
            text: messageText,
          });

          await prisma.messageDelivery.update({
            where: { id: delivery.id },
            data: {
              status: DeliveryStatus.SENT,
              externalId: response.message_id,
            },
          });
        }

        if (automation.publicReplyTemplate) {
          if (isSimulated) {
            await prisma.messageDelivery.update({
              where: { id: delivery.id },
              data: {
                errorMessage: "Public reply simulated",
              },
            });
          } else {
            await replyToComment({
              commentId: commentEvent.commentId,
              accessToken: account.accessToken,
              message: automation.publicReplyTemplate,
            });
          }
        }
      } catch (error) {
        await prisma.messageDelivery.update({
          where: { id: delivery.id },
          data: {
            status: DeliveryStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : "Unknown delivery error",
          },
        });
      }
    }
  },
  {
    connection: redis,
  },
);

  worker.on("ready", () => {
    console.log("comment worker ready");
  });

  worker.on("failed", (job, error) => {
    console.error("comment worker failed", {
      jobId: job?.id,
      error: error.message,
    });
  });

  return worker;
}
