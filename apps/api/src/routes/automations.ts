import { TriggerType } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { getAuthUser, requireAuth } from "../lib/auth.js";
import { prisma } from "../lib/db.js";

const automationSchema = z
  .object({
    instagramAccountId: z.string().min(1),
    name: z.string().min(3).max(80),
    mediaId: z.string().min(1),
    mediaCaption: z.string().optional(),
    mediaPermalink: z.string().url().optional(),
    triggerType: z.enum(["ANY_COMMENT", "KEYWORD_MATCH"]),
    keywords: z.array(z.string().min(1)).default([]),
    dmTemplate: z.string().min(1).max(1000),
    publicReplyTemplate: z.string().max(280).optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((input, ctx) => {
    if (input.triggerType === "KEYWORD_MATCH" && input.keywords.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one keyword is required for keyword matching",
        path: ["keywords"],
      });
    }
  });

export async function automationRoutes(app: FastifyInstance) {
  app.get("/automations", { preHandler: requireAuth }, async (request) => {
    const user = getAuthUser(request);

    return prisma.automation.findMany({
      where: { userId: user.sub },
      include: {
        instagramAccount: {
          select: {
            id: true,
            username: true,
          },
        },
        deliveries: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  app.post("/automations", { preHandler: requireAuth }, async (request, reply) => {
    const user = getAuthUser(request);
    const input = automationSchema.parse(request.body);

    const account = await prisma.instagramAccount.findFirst({
      where: {
        id: input.instagramAccountId,
        userId: user.sub,
      },
    });

    if (!account) {
      return reply.code(404).send({ error: "Instagram account not found" });
    }

    const automation = await prisma.automation.create({
      data: {
        userId: user.sub,
        instagramAccountId: input.instagramAccountId,
        name: input.name,
        mediaId: input.mediaId,
        mediaCaption: input.mediaCaption,
        mediaPermalink: input.mediaPermalink,
        triggerType: input.triggerType as TriggerType,
        keywords: input.keywords.map((keyword) => keyword.toLowerCase()),
        dmTemplate: input.dmTemplate,
        publicReplyTemplate: input.publicReplyTemplate,
        isActive: input.isActive,
      },
    });

    return reply.code(201).send(automation);
  });

  app.patch("/automations/:automationId", { preHandler: requireAuth }, async (request, reply) => {
    const user = getAuthUser(request);
    const params = z.object({ automationId: z.string().min(1) }).parse(request.params);
    const input = automationSchema.partial().parse(request.body);

    const existing = await prisma.automation.findFirst({
      where: {
        id: params.automationId,
        userId: user.sub,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: "Automation not found" });
    }

    const automation = await prisma.automation.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        mediaId: input.mediaId,
        mediaCaption: input.mediaCaption,
        mediaPermalink: input.mediaPermalink,
        triggerType: input.triggerType as TriggerType | undefined,
        keywords: input.keywords?.map((keyword) => keyword.toLowerCase()),
        dmTemplate: input.dmTemplate,
        publicReplyTemplate: input.publicReplyTemplate,
        isActive: input.isActive,
      },
    });

    return automation;
  });

  app.delete("/automations/:automationId", { preHandler: requireAuth }, async (request, reply) => {
    const user = getAuthUser(request);
    const params = z.object({ automationId: z.string().min(1) }).parse(request.params);

    const existing = await prisma.automation.findFirst({
      where: {
        id: params.automationId,
        userId: user.sub,
      },
    });

    if (!existing) {
      return reply.code(404).send({ error: "Automation not found" });
    }

    await prisma.automation.delete({
      where: { id: existing.id },
    });

    return reply.code(204).send();
  });
}
