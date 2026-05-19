import crypto from "node:crypto";

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { env } from "../config/env.js";
import type { AuthUser } from "../lib/auth.js";
import { getAuthUser, requireAuth } from "../lib/auth.js";
import { prisma } from "../lib/db.js";
import {
  buildMetaAuthorizeUrl,
  exchangeCodeForAccessToken,
  fetchInstagramMedia,
  InstagramResolutionError,
  lastExchangeAttempts,
  resolveInstagramAccount,
  subscribeInstagramAccountToWebhooks,
} from "../lib/meta.js";

const lastInstagramDebugByUserId = new Map<
  string,
  {
    status: "success" | "error";
    at: string;
    message: string;
    diagnostics?: Record<string, unknown>;
  }
>();

async function createMockInstagramAccount(userId: string) {
  return prisma.instagramAccount.upsert({
    where: {
      userId_igUserId: {
        userId,
        igUserId: "17841400000000000",
      },
    },
    update: {
      username: "demo.creator",
      accessToken: "mock-access-token",
      pageId: "1234567890",
      pageName: "Demo Page",
    },
    create: {
      userId,
      igUserId: "17841400000000000",
      username: "demo.creator",
      accessToken: "mock-access-token",
      pageId: "1234567890",
      pageName: "Demo Page",
    },
  });
}

function buildMetaStatusResponse(action: "deauthorize" | "data-deletion") {
  const confirmationCode = crypto.randomUUID();

  return {
    url: `${env.FRONTEND_URL}/meta/${action}?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  };
}

export async function instagramRoutes(app: FastifyInstance) {
  app.get("/instagram/accounts", { preHandler: requireAuth }, async (request) => {
    const user = getAuthUser(request);

    return prisma.instagramAccount.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        igUserId: true,
        username: true,
        pageId: true,
        pageName: true,
        tokenExpiresAt: true,
        createdAt: true,
      },
    });
  });

  app.get("/instagram/accounts/:accountId/media", { preHandler: requireAuth }, async (request, reply) => {
    const user = getAuthUser(request);
    const params = z.object({ accountId: z.string().min(1) }).parse(request.params);

    const account = await prisma.instagramAccount.findFirst({
      where: {
        id: params.accountId,
        userId: user.sub,
      },
    });

    if (!account) {
      return reply.code(404).send({ error: "Instagram account not found" });
    }

    if (env.MOCK_INSTAGRAM_CONNECT || account.accessToken === "mock-access-token") {
      return [
        {
          id: "17910000000000001",
          caption: "Comment GUIDE for the lead magnet",
          permalink: "https://www.instagram.com/p/mock-post-1/",
          media_type: "IMAGE",
          timestamp: new Date().toISOString(),
        },
        {
          id: "17910000000000002",
          caption: "Comment DEMO to get the walkthrough",
          permalink: "https://www.instagram.com/p/mock-post-2/",
          media_type: "IMAGE",
          timestamp: new Date().toISOString(),
        },
        {
          id: "17910000000000003",
          caption: "Comment PRICE for the pricing PDF",
          permalink: "https://www.instagram.com/p/mock-post-3/",
          media_type: "VIDEO",
          timestamp: new Date().toISOString(),
        },
      ];
    }

    return fetchInstagramMedia({
      igUserId: account.igUserId,
      accessToken: account.accessToken,
    });
  });

  app.get("/instagram/oauth/start", async (request, reply) => {
    const query = request.query as { token?: string };
    const bearerToken = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    const token = bearerToken ?? query.token;

    if (!token) {
      return reply.code(401).send({ error: "Missing auth token" });
    }

    let user: AuthUser;

    try {
      user = app.jwt.verify<AuthUser>(token);
    } catch {
      return reply.code(401).send({ error: "Invalid auth token" });
    }

    if (env.MOCK_INSTAGRAM_CONNECT) {
      await createMockInstagramAccount(user.sub);
      return reply.redirect(`${env.FRONTEND_URL}/dashboard?connected=1&mode=mock`);
    }

    if (!env.META_APP_ID || !env.META_APP_SECRET) {
      return reply.redirect(
        `${env.FRONTEND_URL}/dashboard?connect_error=${encodeURIComponent("META_APP_ID and META_APP_SECRET are required for live Instagram connect.")}`,
      );
    }

    const state = Buffer.from(
      JSON.stringify({
        userId: user.sub,
        nonce: crypto.randomUUID(),
      }),
    ).toString("base64url");

    return reply.redirect(buildMetaAuthorizeUrl(state));
  });

  app.get("/instagram/oauth/callback", async (request, reply) => {
    const query = request.query as {
      code?: string;
      state?: string;
      error?: string;
      error_message?: string;
    };

    if (query.error) {
      return reply.redirect(
        `${env.FRONTEND_URL}/dashboard?connect_error=${encodeURIComponent(query.error_message ?? query.error)}`,
      );
    }

    if (!query.code || !query.state) {
      return reply.code(400).send({ error: "Missing OAuth code or state" });
    }

    const state = JSON.parse(Buffer.from(query.state, "base64url").toString("utf8")) as {
      userId: string;
      nonce: string;
    };

    try {
      const token = await exchangeCodeForAccessToken(query.code);
      const resolvedAccount = await resolveInstagramAccount(token);

      await prisma.instagramAccount.upsert({
        where: {
          userId_igUserId: {
            userId: state.userId,
            igUserId: resolvedAccount.igUserId,
          },
        },
        update: {
          username: resolvedAccount.username,
          pageId: resolvedAccount.pageId,
          pageName: resolvedAccount.pageName,
          accessToken: resolvedAccount.accessToken,
          tokenExpiresAt: token.expires_in
            ? new Date(Date.now() + token.expires_in * 1000)
            : null,
        },
        create: {
          userId: state.userId,
          igUserId: resolvedAccount.igUserId,
          username: resolvedAccount.username,
          pageId: resolvedAccount.pageId,
          pageName: resolvedAccount.pageName,
          accessToken: resolvedAccount.accessToken,
          tokenExpiresAt: token.expires_in
            ? new Date(Date.now() + token.expires_in * 1000)
            : null,
        },
      });

      let subscriptionResult: { ok: boolean; payload: unknown } | { error: string };
      try {
        subscriptionResult = await subscribeInstagramAccountToWebhooks({
          igUserId: resolvedAccount.igUserId,
          accessToken: resolvedAccount.accessToken,
        });
      } catch (subError) {
        subscriptionResult = {
          error: subError instanceof Error ? subError.message : "Unknown subscription error",
        };
      }

      lastInstagramDebugByUserId.set(state.userId, {
        status: "success",
        at: new Date().toISOString(),
        message: `Resolved Instagram account ${resolvedAccount.username}`,
        diagnostics: {
          igUserId: resolvedAccount.igUserId,
          username: resolvedAccount.username,
          pageId: resolvedAccount.pageId,
          pageName: resolvedAccount.pageName,
          subscription: subscriptionResult,
        },
      });

      return reply.redirect(`${env.FRONTEND_URL}/dashboard?connected=1&mode=live`);
    } catch (error) {
      const diagnostics =
        error instanceof InstagramResolutionError ? error.diagnostics : undefined;

      request.log.error(
        {
          message: error instanceof Error ? error.message : "Unknown Instagram connect error",
          diagnostics,
        },
        "instagram oauth callback failed",
      );

      const message =
        error instanceof Error
          ? error.message
          : "Instagram connect failed during account resolution.";

      lastInstagramDebugByUserId.set(state.userId, {
        status: "error",
        at: new Date().toISOString(),
        message,
        diagnostics: {
          ...(diagnostics ?? {}),
          exchangeAttempts: lastExchangeAttempts.errors,
          exchangeWinner: lastExchangeAttempts.lastSource,
          authorizeUrlHost: env.META_OAUTH_SCOPES.includes("instagram_business_")
            ? "www.instagram.com"
            : "www.facebook.com",
        },
      });

      return reply.redirect(
        `${env.FRONTEND_URL}/dashboard?connect_error=${encodeURIComponent(message)}`,
      );
    }
  });

  app.post(
    "/instagram/accounts/:id/subscribe",
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = getAuthUser(request);
      const { id } = request.params as { id: string };

      const account = await prisma.instagramAccount.findFirst({
        where: { id, userId: user.sub },
      });

      if (!account) {
        return reply.code(404).send({ error: "Account not found" });
      }

      const result = await subscribeInstagramAccountToWebhooks({
        igUserId: account.igUserId,
        accessToken: account.accessToken,
      });

      return reply.send(result);
    },
  );

  app.post(
    "/instagram/debug/simulate-comment",
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = getAuthUser(request);
      const body = (request.body ?? {}) as {
        automationId?: string;
        commentText?: string;
        actorUsername?: string;
      };

      const automation = body.automationId
        ? await prisma.automation.findFirst({
            where: { id: body.automationId, userId: user.sub, isActive: true },
            include: { instagramAccount: true },
          })
        : await prisma.automation.findFirst({
            where: { userId: user.sub, isActive: true },
            include: { instagramAccount: true },
            orderBy: { createdAt: "desc" },
          });

      if (!automation) {
        return reply.code(404).send({ error: "No active automation found" });
      }

      const commentText =
        body.commentText ??
        (automation.keywords[0] ? `i want the ${automation.keywords[0]} please` : "hello");

      const simulatedPayload = {
        object: "instagram",
        entry: [
          {
            id: automation.instagramAccount.igUserId,
            time: Math.floor(Date.now() / 1000),
            changes: [
              {
                field: "comments",
                value: {
                  id: `sim_${crypto.randomUUID()}`,
                  from: {
                    id: "sim_actor",
                    username: body.actorUsername ?? "sim_user",
                  },
                  text: commentText,
                  media: {
                    id: automation.mediaId,
                    media_product_type: "FEED",
                  },
                },
              },
            ],
          },
        ],
      };

      const upstream = await fetch(`http://localhost:${env.PORT}/webhooks/meta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(simulatedPayload),
      });

      return reply.send({
        injectedTo: "/webhooks/meta",
        upstreamStatus: upstream.status,
        simulatedPayload,
        nextStep:
          "Wait ~1s, then check MessageDelivery: docker exec -i autoig-postgres psql -U postgres -d autoig -c \"SELECT \\\"createdAt\\\", status, \\\"messageText\\\", \\\"errorMessage\\\" FROM \\\"MessageDelivery\\\" ORDER BY \\\"createdAt\\\" DESC LIMIT 3;\"",
      });
    },
  );

  app.get(
    "/instagram/accounts/:id/debug/state",
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = getAuthUser(request);
      const { id } = request.params as { id: string };
      const account = await prisma.instagramAccount.findFirst({
        where: { id, userId: user.sub },
      });
      if (!account) {
        return reply.code(404).send({ error: "Account not found" });
      }

      const out: Record<string, unknown> = {
        igUserId: account.igUserId,
        username: account.username,
      };

      try {
        const subResp = await fetch(
          `https://graph.instagram.com/v23.0/${account.igUserId}/subscribed_apps?access_token=${encodeURIComponent(account.accessToken)}`,
        );
        out.subscribedApps = await subResp.json();
      } catch (e) {
        out.subscribedAppsError = e instanceof Error ? e.message : "unknown";
      }

      try {
        const meResp = await fetch(
          `https://graph.instagram.com/v23.0/me?fields=id,username,account_type&access_token=${encodeURIComponent(account.accessToken)}`,
        );
        out.profile = await meResp.json();
      } catch (e) {
        out.profileError = e instanceof Error ? e.message : "unknown";
      }

      try {
        const mediaResp = await fetch(
          `https://graph.instagram.com/v23.0/me/media?fields=id,media_type,permalink,timestamp&limit=5&access_token=${encodeURIComponent(account.accessToken)}`,
        );
        out.recentMedia = await mediaResp.json();
      } catch (e) {
        out.recentMediaError = e instanceof Error ? e.message : "unknown";
      }

      return out;
    },
  );

  app.get("/instagram/debug/last-result", { preHandler: requireAuth }, async (request) => {
    const user = getAuthUser(request);
    return (
      lastInstagramDebugByUserId.get(user.sub) ?? {
        status: "error",
        at: new Date().toISOString(),
        message: "No Instagram connect attempt has been recorded in this API process yet.",
      }
    );
  });

  app.all("/instagram/deauthorize", async (_request, reply) => {
    return reply.code(200).send({
      success: true,
    });
  });

  app.all("/instagram/data-deletion", async (_request, reply) => {
    return reply.code(200).send(buildMetaStatusResponse("data-deletion"));
  });
}
