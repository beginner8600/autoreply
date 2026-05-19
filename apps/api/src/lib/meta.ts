import { env } from "../config/env.js";

type GraphResponse<T> = T & {
  error?: {
    message: string;
    type?: string;
    code?: number;
  };
};

export class InstagramResolutionError extends Error {
  diagnostics: Record<string, unknown>;

  constructor(message: string, diagnostics: Record<string, unknown>) {
    super(message);
    this.name = "InstagramResolutionError";
    this.diagnostics = diagnostics;
  }
}

function scopesLookInstagramBusiness() {
  return /\binstagram_business_/.test(env.META_OAUTH_SCOPES);
}

function hasInstagramAppCreds() {
  return Boolean(env.META_INSTAGRAM_APP_ID && env.META_INSTAGRAM_APP_SECRET);
}

export function buildMetaAuthorizeUrl(state: string) {
  if (hasInstagramAppCreds()) {
    const url = new URL("https://www.instagram.com/oauth/authorize");
    url.searchParams.set("client_id", env.META_INSTAGRAM_APP_ID);
    url.searchParams.set("redirect_uri", env.META_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", env.META_OAUTH_SCOPES);
    url.searchParams.set("state", state);
    return url.toString();
  }

  if (!env.META_APP_ID) {
    throw new Error("META_APP_ID is not configured");
  }

  if (scopesLookInstagramBusiness() && !env.META_CONFIG_ID) {
    const url = new URL("https://www.instagram.com/oauth/authorize");
    url.searchParams.set("client_id", env.META_APP_ID);
    url.searchParams.set("redirect_uri", env.META_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", env.META_OAUTH_SCOPES);
    url.searchParams.set("state", state);
    return url.toString();
  }

  const url = new URL(`https://www.facebook.com/${env.META_GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", env.META_APP_ID);
  url.searchParams.set("redirect_uri", env.META_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  if (env.META_CONFIG_ID) {
    url.searchParams.set("config_id", env.META_CONFIG_ID);
  } else {
    url.searchParams.set("scope", env.META_OAUTH_SCOPES);
  }

  return url.toString();
}

export type ExchangedToken = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  user_id?: string | number;
  source: "instagram" | "facebook";
};

async function exchangeCodeViaInstagram(code: string): Promise<ExchangedToken> {
  const clientId = env.META_INSTAGRAM_APP_ID || env.META_APP_ID;
  const clientSecret = env.META_INSTAGRAM_APP_SECRET || env.META_APP_SECRET;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: env.META_REDIRECT_URI,
    code,
  });

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = (await response.json()) as GraphResponse<{
    access_token: string;
    user_id?: string | number;
    permissions?: string[];
  }> & {
    error_type?: string;
    error_message?: string;
  };

  if (!response.ok || payload.error || payload.error_message) {
    const message =
      payload.error?.message ??
      payload.error_message ??
      `Instagram OAuth exchange failed (status ${response.status})`;
    throw new Error(message);
  }

  let token: ExchangedToken = {
    access_token: payload.access_token,
    user_id: payload.user_id,
    source: "instagram",
  };

  try {
    const longLivedUrl = new URL("https://graph.instagram.com/access_token");
    longLivedUrl.searchParams.set("grant_type", "ig_exchange_token");
    longLivedUrl.searchParams.set("client_secret", clientSecret);
    longLivedUrl.searchParams.set("access_token", payload.access_token);
    const longLivedResp = await fetch(longLivedUrl);
    const longLivedPayload = (await longLivedResp.json()) as GraphResponse<{
      access_token: string;
      token_type?: string;
      expires_in?: number;
    }>;
    if (longLivedResp.ok && !longLivedPayload.error && longLivedPayload.access_token) {
      token = {
        ...token,
        access_token: longLivedPayload.access_token,
        token_type: longLivedPayload.token_type,
        expires_in: longLivedPayload.expires_in,
      };
    }
  } catch {
    // long-lived upgrade is best-effort; keep short-lived token if it fails
  }

  return token;
}

async function exchangeCodeViaFacebook(code: string): Promise<ExchangedToken> {
  const url = new URL(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set("client_id", env.META_APP_ID);
  url.searchParams.set("client_secret", env.META_APP_SECRET);
  url.searchParams.set("redirect_uri", env.META_REDIRECT_URI);
  url.searchParams.set("code", code);

  const response = await fetch(url);
  const payload = (await response.json()) as GraphResponse<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }>;

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "Meta OAuth exchange failed");
  }

  return {
    access_token: payload.access_token,
    token_type: payload.token_type,
    expires_in: payload.expires_in,
    source: "facebook",
  };
}

export const lastExchangeAttempts: { errors: string[]; lastSource?: "instagram" | "facebook" } = {
  errors: [],
};

export async function exchangeCodeForAccessToken(code: string): Promise<ExchangedToken> {
  if (!env.META_APP_ID || !env.META_APP_SECRET) {
    throw new Error("Meta app credentials are not configured");
  }

  const preferInstagram =
    hasInstagramAppCreds() || (scopesLookInstagramBusiness() && !env.META_CONFIG_ID);
  const order: Array<"instagram" | "facebook"> = preferInstagram
    ? ["instagram", "facebook"]
    : ["facebook", "instagram"];

  lastExchangeAttempts.errors = [];
  lastExchangeAttempts.lastSource = undefined;

  for (const flow of order) {
    try {
      const token =
        flow === "instagram"
          ? await exchangeCodeViaInstagram(code)
          : await exchangeCodeViaFacebook(code);
      lastExchangeAttempts.lastSource = flow;
      return token;
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unknown ${flow} exchange error`;
      lastExchangeAttempts.errors.push(`${flow}: ${message}`);
    }
  }

  throw new Error(`Meta OAuth exchange failed (${lastExchangeAttempts.errors.join(" | ")})`);
}

export async function fetchInstagramMedia(input: {
  igUserId: string;
  accessToken: string;
}) {
  const searchParams = {
    fields: "id,caption,permalink,media_type,media_url,thumbnail_url,timestamp",
    limit: "12",
  };

  try {
    const payload = await instagramGraphGet<{
      data?: Array<{
        id: string;
        caption?: string;
        permalink?: string;
        media_type?: string;
        media_url?: string;
        thumbnail_url?: string;
        timestamp?: string;
      }>;
    }>(`/${input.igUserId}/media`, input.accessToken, searchParams);

    return payload.data ?? [];
  } catch {
    const payload = await graphGet<{
      data?: Array<{
        id: string;
        caption?: string;
        permalink?: string;
        media_type?: string;
        media_url?: string;
        thumbnail_url?: string;
        timestamp?: string;
      }>;
    }>(`/${input.igUserId}/media`, input.accessToken, searchParams);

    return payload.data ?? [];
  }
}

async function graphGet<T>(path: string, accessToken: string, searchParams?: Record<string, string>) {
  const url = new URL(`https://graph.facebook.com/${env.META_GRAPH_VERSION}${path}`);
  url.searchParams.set("access_token", accessToken);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url);
  const payload = (await response.json()) as GraphResponse<T>;

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? `Meta request failed for ${path}`);
  }

  return payload;
}

async function instagramGraphGet<T>(
  path: string,
  accessToken: string,
  searchParams?: Record<string, string>,
) {
  const url = new URL(`https://graph.instagram.com${path}`);
  url.searchParams.set("access_token", accessToken);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url);
  const payload = (await response.json()) as GraphResponse<T>;

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? `Instagram Graph request failed for ${path}`);
  }

  return payload;
}

type ResolvedInstagramAccount = {
  igUserId: string;
  username: string;
  pageId?: string;
  pageName?: string;
  accessToken: string;
};

export async function resolveInstagramAccount(
  token: ExchangedToken | string,
): Promise<ResolvedInstagramAccount> {
  const diagnostics: Record<string, unknown> = {};
  const normalized: ExchangedToken =
    typeof token === "string"
      ? { access_token: token, source: "facebook" }
      : token;

  diagnostics.tokenSource = normalized.source;
  if (normalized.user_id !== undefined) {
    diagnostics.tokenUserId = normalized.user_id;
  }

  const directProfile = await tryResolveDirectInstagramProfile(normalized, diagnostics);

  if (directProfile) {
    diagnostics.resolution = "direct-profile";
    return directProfile;
  }

  const pageLinkedProfile = await tryResolvePageLinkedInstagramProfile(
    normalized.access_token,
    diagnostics,
  );

  if (pageLinkedProfile) {
    diagnostics.resolution = "page-linked-profile";
    return pageLinkedProfile;
  }

  const granularProfile = await tryResolveViaGranularScopes(normalized.access_token, diagnostics);

  if (granularProfile) {
    diagnostics.resolution = "granular-scopes";
    return granularProfile;
  }

  throw new InstagramResolutionError(
    "No Instagram Business or Creator account could be resolved from this Meta authorization. Make sure the Instagram account is linked to a Facebook Page you can manage.",
    diagnostics,
  );
}

async function tryResolveDirectInstagramProfile(
  token: ExchangedToken,
  diagnostics: Record<string, unknown>,
): Promise<ResolvedInstagramAccount | null> {
  const fieldVariants = ["user_id,username,name", "id,username,name"];

  for (const fields of fieldVariants) {
    try {
      const profile = await instagramGraphGet<{
        id?: string;
        user_id?: string | number;
        username?: string;
        name?: string;
      }>("/me", token.access_token, { fields });

      diagnostics.directProfile = profile;

      const igUserId =
        (profile.user_id !== undefined ? String(profile.user_id) : undefined) ??
        profile.id ??
        (token.user_id !== undefined ? String(token.user_id) : undefined);

      if (!igUserId || !profile.username) {
        continue;
      }

      return {
        igUserId,
        username: profile.username,
        accessToken: token.access_token,
      };
    } catch (error) {
      diagnostics.directProfileError =
        error instanceof Error ? error.message : "Unknown direct profile error";
    }
  }

  if (token.user_id !== undefined) {
    try {
      const profile = await instagramGraphGet<{
        id?: string;
        username?: string;
        name?: string;
      }>(`/${token.user_id}`, token.access_token, {
        fields: "id,username,name",
      });

      diagnostics.directProfileByUserId = profile;

      if (profile.username) {
        return {
          igUserId: String(token.user_id),
          username: profile.username,
          accessToken: token.access_token,
        };
      }
    } catch (error) {
      diagnostics.directProfileByUserIdError =
        error instanceof Error ? error.message : "Unknown direct profile-by-id error";
    }
  }

  return null;
}

async function tryResolvePageLinkedInstagramProfile(
  accessToken: string,
  diagnostics: Record<string, unknown>,
): Promise<ResolvedInstagramAccount | null> {
  let pages: {
    data?: Array<{
      id: string;
      name?: string;
      access_token?: string;
    }>;
  };

  try {
    pages = await graphGet<{
      data?: Array<{
        id: string;
        name?: string;
        access_token?: string;
      }>;
    }>("/me/accounts", accessToken, {
      fields: "id,name,access_token",
    });
  } catch (error) {
    diagnostics.pageAccountsError =
      error instanceof Error ? error.message : "Unknown /me/accounts error";
    return null;
  }

  diagnostics.pageAccounts = pages;

  const pageChecks: Array<Record<string, unknown>> = [];

  for (const page of pages.data ?? []) {
    const pageToken = page.access_token ?? accessToken;

    try {
      const pageProfile = await graphGet<{
        connected_instagram_account?: {
          id?: string;
          username?: string;
        };
        instagram_business_account?: {
          id?: string;
          username?: string;
        };
      }>(`/${page.id}`, pageToken, {
        fields:
          "connected_instagram_account{id,username},instagram_business_account{id,username}",
      });

      pageChecks.push({
        pageId: page.id,
        pageName: page.name,
        profile: pageProfile,
      });

      const account =
        pageProfile.connected_instagram_account ??
        pageProfile.instagram_business_account;

      if (!account?.id || !account.username) {
        continue;
      }

      return {
        igUserId: account.id,
        username: account.username,
        pageId: page.id,
        pageName: page.name,
        accessToken: pageToken,
      };
    } catch (error) {
      pageChecks.push({
        pageId: page.id,
        pageName: page.name,
        error: error instanceof Error ? error.message : "Unknown page profile error",
      });
      continue;
    }
  }

  diagnostics.pageChecks = pageChecks;

  return null;
}

async function tryResolveViaGranularScopes(
  accessToken: string,
  diagnostics: Record<string, unknown>,
): Promise<ResolvedInstagramAccount | null> {
  const appAccessToken = `${env.META_APP_ID}|${env.META_APP_SECRET}`;

  let debugInfo: {
    data?: {
      user_id?: string | number;
      app_id?: string;
      type?: string;
      scopes?: string[];
      granular_scopes?: Array<{
        scope?: string;
        target_ids?: Array<string | number>;
      }>;
      error?: { message?: string; code?: number };
    };
  };

  try {
    const url = new URL(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/debug_token`);
    url.searchParams.set("input_token", accessToken);
    url.searchParams.set("access_token", appAccessToken);
    const response = await fetch(url);
    debugInfo = (await response.json()) as typeof debugInfo;
    if (!response.ok) {
      diagnostics.debugTokenError = `status ${response.status}`;
      return null;
    }
  } catch (error) {
    diagnostics.debugTokenError =
      error instanceof Error ? error.message : "Unknown /debug_token error";
    return null;
  }

  diagnostics.debugToken = debugInfo;

  const granular = debugInfo.data?.granular_scopes ?? [];
  const candidateIds = new Set<string>();
  for (const entry of granular) {
    if (!entry?.scope) continue;
    if (!/^instagram_/.test(entry.scope)) continue;
    for (const id of entry.target_ids ?? []) {
      if (id !== undefined && id !== null) {
        candidateIds.add(String(id));
      }
    }
  }

  diagnostics.granularCandidateIds = Array.from(candidateIds);

  const granularChecks: Array<Record<string, unknown>> = [];

  for (const candidateId of candidateIds) {
    for (const host of ["graph.instagram.com", "graph.facebook.com"]) {
      try {
        const url = new URL(
          host === "graph.instagram.com"
            ? `https://graph.instagram.com/${candidateId}`
            : `https://graph.facebook.com/${env.META_GRAPH_VERSION}/${candidateId}`,
        );
        url.searchParams.set("access_token", accessToken);
        url.searchParams.set("fields", "id,username,name,account_type");
        const response = await fetch(url);
        const payload = (await response.json()) as GraphResponse<{
          id?: string;
          username?: string;
          name?: string;
          account_type?: string;
        }>;

        granularChecks.push({ candidateId, host, payload });

        if (!response.ok || payload.error || !payload.username) {
          continue;
        }

        return {
          igUserId: payload.id ?? candidateId,
          username: payload.username,
          accessToken,
        };
      } catch (error) {
        granularChecks.push({
          candidateId,
          host,
          error: error instanceof Error ? error.message : "Unknown granular lookup error",
        });
      }
    }
  }

  diagnostics.granularChecks = granularChecks;

  return null;
}

export async function subscribeInstagramAccountToWebhooks(input: {
  igUserId: string;
  accessToken: string;
}): Promise<{ ok: boolean; payload: unknown }> {
  const url = new URL(`https://graph.instagram.com/${input.igUserId}/subscribed_apps`);
  url.searchParams.set("access_token", input.accessToken);
  url.searchParams.set("subscribed_fields", "comments,messages,messaging_postbacks");

  const response = await fetch(url, { method: "POST" });
  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, payload };
}

export async function sendCommentPrivateReply(input: {
  igUserId: string;
  accessToken: string;
  commentId: string;
  text: string;
}) {
  const url = new URL(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/${input.igUserId}/messages`);
  url.searchParams.set("access_token", input.accessToken);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: {
        comment_id: input.commentId,
      },
      message: {
        text: input.text,
      },
    }),
  });

  const payload = (await response.json()) as GraphResponse<{
    message_id?: string;
  }>;

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "Meta Send API request failed");
  }

  return payload;
}

export async function replyToComment(input: {
  commentId: string;
  accessToken: string;
  message: string;
}) {
  const url = new URL(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/${input.commentId}/replies`);
  url.searchParams.set("access_token", input.accessToken);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: input.message,
    }),
  });

  const payload = (await response.json()) as GraphResponse<{
    id?: string;
  }>;

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "Meta comment reply request failed");
  }

  return payload;
}
