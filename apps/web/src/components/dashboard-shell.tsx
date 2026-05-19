"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiBaseUrl, apiRequest } from "@/lib/api";

type Summary = {
  accounts: number;
  automations: number;
  deliveries: number;
  sent: number;
  failed: number;
};

type InstagramAccount = {
  id: string;
  igUserId: string;
  username: string;
  pageId?: string | null;
  pageName?: string | null;
  tokenExpiresAt?: string | null;
  createdAt: string;
};

type MediaItem = {
  id: string;
  caption?: string;
  permalink?: string;
  media_type?: string;
  timestamp?: string;
};

type Delivery = {
  id: string;
  status: string;
  createdAt: string;
};

type Automation = {
  id: string;
  name: string;
  mediaId: string;
  mediaCaption?: string | null;
  mediaPermalink?: string | null;
  triggerType: "ANY_COMMENT" | "KEYWORD_MATCH";
  keywords: string[];
  dmTemplate: string;
  publicReplyTemplate?: string | null;
  isActive: boolean;
  createdAt: string;
  instagramAccount: {
    username: string;
  };
  deliveries: Delivery[];
};

type AutomationDraft = {
  instagramAccountId: string;
  name: string;
  mediaId: string;
  mediaCaption: string;
  mediaPermalink: string;
  triggerType: "ANY_COMMENT" | "KEYWORD_MATCH";
  keywords: string;
  dmTemplate: string;
};

const initialDraft: AutomationDraft = {
  instagramAccountId: "",
  name: "",
  mediaId: "",
  mediaCaption: "",
  mediaPermalink: "",
  triggerType: "ANY_COMMENT",
  keywords: "",
  dmTemplate: "Thanks for commenting, {{first_name}}. Check your DM for the details.",
};

export function DashboardShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem("autoig.token"),
  );
  const [summary, setSummary] = useState<Summary | null>(null);
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [mediaOptions, setMediaOptions] = useState<MediaItem[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [draft, setDraft] = useState<AutomationDraft>(initialDraft);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const connectMessage = useMemo(() => {
    if (searchParams.get("connected") === "1") {
      const mode = searchParams.get("mode");
      return mode === "mock"
        ? "Instagram mock account connected. Switch MOCK_INSTAGRAM_CONNECT off when your Meta app is approved."
        : "Instagram account connected.";
    }

    if (searchParams.get("connect_error")) {
      return decodeURIComponent(searchParams.get("connect_error") ?? "");
    }

    return null;
  }, [searchParams]);

  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [router, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    async function load() {
      try {
        const [summaryPayload, accountPayload, automationPayload] = await Promise.all([
          apiRequest<Summary>("/dashboard/summary", { token }),
          apiRequest<InstagramAccount[]>("/instagram/accounts", { token }),
          apiRequest<Automation[]>("/automations", { token }),
        ]);

        setSummary(summaryPayload);
        setAccounts(accountPayload);
        setAutomations(automationPayload);
        setDraft((current) => ({
          ...current,
          instagramAccountId: current.instagramAccountId || accountPayload[0]?.id || "",
        }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token]);

  useEffect(() => {
    if (!token || !draft.instagramAccountId) {
      return;
    }

    async function loadMedia() {
      try {
        const items = await apiRequest<MediaItem[]>(
          `/instagram/accounts/${draft.instagramAccountId}/media`,
          { token },
        );
        setMediaOptions(items);
      } catch (mediaError) {
        setError(mediaError instanceof Error ? mediaError.message : "Unable to load media");
      }
    }

    void loadMedia();
  }, [draft.instagramAccountId, token]);

  async function refreshData(currentToken: string) {
    const [summaryPayload, accountPayload, automationPayload] = await Promise.all([
      apiRequest<Summary>("/dashboard/summary", { token: currentToken }),
      apiRequest<InstagramAccount[]>("/instagram/accounts", { token: currentToken }),
      apiRequest<Automation[]>("/automations", { token: currentToken }),
    ]);

    setSummary(summaryPayload);
    setAccounts(accountPayload);
    setAutomations(automationPayload);
  }

  async function createAutomation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest("/automations", {
        method: "POST",
        token,
        body: JSON.stringify({
          instagramAccountId: draft.instagramAccountId,
          name: draft.name,
          mediaId: draft.mediaId,
          mediaCaption: draft.mediaCaption || undefined,
          mediaPermalink: draft.mediaPermalink || undefined,
          triggerType: draft.triggerType,
          keywords:
            draft.triggerType === "KEYWORD_MATCH"
              ? draft.keywords
                  .split(",")
                  .map((keyword) => keyword.trim())
                  .filter(Boolean)
              : [],
          dmTemplate: draft.dmTemplate,
        }),
      });

      await refreshData(token);
      setDraft({
        ...initialDraft,
        instagramAccountId: draft.instagramAccountId,
      });
      setSuccess("Automation created.");
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Unable to create automation",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteAutomation(automationId: string) {
    if (!token) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await apiRequest(`/automations/${automationId}`, {
        method: "DELETE",
        token,
      });
      await refreshData(token);
      setSuccess("Automation deleted.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Unable to delete automation",
      );
    }
  }

  function handleConnectClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!token) {
      event.preventDefault();
      router.push("/login");
      return;
    }

    event.preventDefault();
    window.location.href = `${apiBaseUrl}/instagram/oauth/start?token=${token}`;
  }

  function handleLogout() {
    localStorage.removeItem("autoig.token");
    localStorage.removeItem("autoig.user");
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-stone-200 bg-white/80 p-8 text-stone-700 shadow-xl shadow-orange-100">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-[2rem] border border-stone-200 bg-white/80 p-8 shadow-xl shadow-orange-100 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
            MVP Control Room
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-stone-950">
            Build the webhook-to-DM pipeline first, then add polish.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-stone-600">
            This dashboard is intentionally narrow: one account, one automation
            path, one place to verify the conversion loop works.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
            href={`${apiBaseUrl}/instagram/oauth/start`}
            onClick={handleConnectClick}
          >
            Connect Instagram
          </a>
          <button
            className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
            onClick={handleLogout}
            type="button"
          >
            Log out
          </button>
        </div>
      </header>

      {connectMessage ? (
        <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          {connectMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-[1.5rem] border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-800">
          {success}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Connected accounts", value: summary?.accounts ?? 0 },
          { label: "Automations", value: summary?.automations ?? 0 },
          { label: "Captured deliveries", value: summary?.deliveries ?? 0 },
          { label: "Sent or simulated", value: summary?.sent ?? 0 },
          { label: "Failures", value: summary?.failed ?? 0 },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-lg shadow-stone-100"
          >
            <p className="text-sm text-stone-500">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-xl shadow-stone-100">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                Active automations
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
                Comment triggers
              </h2>
            </div>
            <Link
              className="text-sm font-medium text-orange-700 underline decoration-orange-300 underline-offset-4"
              href="https://developers.facebook.com/docs/graph-api/webhooks"
              target="_blank"
            >
              Meta webhook docs
            </Link>
          </div>

          <div className="space-y-4">
            {automations.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 px-5 py-6 text-sm text-stone-600">
                No automations yet. Connect an account, add a media ID, and send a test comment into the webhook.
              </div>
            ) : (
              automations.map((automation) => (
                <article
                  key={automation.id}
                  className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-stone-950">
                          {automation.name}
                        </h3>
                        <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                          {automation.triggerType === "ANY_COMMENT"
                            ? "Any comment"
                            : "Keyword match"}
                        </span>
                      </div>
                      <p className="text-sm text-stone-600">
                        @{automation.instagramAccount.username} · Media ID{" "}
                        <span className="font-mono text-stone-900">
                          {automation.mediaId}
                        </span>
                      </p>
                      <p className="text-sm leading-6 text-stone-700">
                        {automation.dmTemplate}
                      </p>
                      {automation.keywords.length > 0 ? (
                        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                          Keywords: {automation.keywords.join(", ")}
                        </p>
                      ) : null}
                    </div>

                    <button
                      className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      onClick={() => deleteAutomation(automation.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-500">
                    {automation.deliveries.slice(0, 3).map((delivery) => (
                      <span
                        key={delivery.id}
                        className="rounded-full border border-stone-300 px-3 py-1"
                      >
                        {delivery.status.toLowerCase()} ·{" "}
                        {new Date(delivery.createdAt).toLocaleString()}
                      </span>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-stone-200 bg-[#fff7ed] p-8 shadow-xl shadow-orange-100">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600">
              Create automation
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
              One post, one trigger, one DM
            </h2>
          </div>

          <form className="space-y-4" onSubmit={createAutomation}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Instagram account</span>
              <select
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-orange-500"
                disabled={accounts.length === 0}
                value={draft.instagramAccountId}
                onChange={(event) => {
                  setMediaOptions([]);
                  setDraft((current) => ({
                    ...current,
                    instagramAccountId: event.target.value,
                  }));
                }}
              >
                <option value="">
                  {accounts.length === 0 ? "Connect an account first" : "Select account"}
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    @{account.username}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Automation name</span>
              <input
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-orange-500"
                placeholder="Free guide giveaway"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Media ID</span>
              <select
                className="mb-2 w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-orange-500"
                disabled={mediaOptions.length === 0}
                value={
                  mediaOptions.some((item) => item.id === draft.mediaId)
                    ? draft.mediaId
                    : ""
                }
                onChange={(event) => {
                  const selected = mediaOptions.find((item) => item.id === event.target.value);
                  setDraft((current) => ({
                    ...current,
                    mediaId: selected?.id ?? current.mediaId,
                    mediaCaption: selected?.caption ?? current.mediaCaption,
                    mediaPermalink: selected?.permalink ?? current.mediaPermalink,
                  }));
                }}
              >
                <option value="">
                  {mediaOptions.length === 0
                    ? "No media loaded yet"
                    : "Pick a recent post"}
                </option>
                {mediaOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.caption ? `${item.caption.slice(0, 52)}...` : item.id}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 font-mono text-sm text-stone-900 outline-none transition focus:border-orange-500"
                placeholder="17901234567890123"
                value={draft.mediaId}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, mediaId: event.target.value }))
                }
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Media permalink</span>
              <input
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-orange-500"
                placeholder="https://www.instagram.com/p/..."
                value={draft.mediaPermalink}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    mediaPermalink: event.target.value,
                  }))
                }
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">Trigger type</span>
              <select
                className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-orange-500"
                value={draft.triggerType}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    triggerType: event.target.value as AutomationDraft["triggerType"],
                  }))
                }
              >
                <option value="ANY_COMMENT">Any comment</option>
                <option value="KEYWORD_MATCH">Comment contains keyword</option>
              </select>
            </label>

            {draft.triggerType === "KEYWORD_MATCH" ? (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-stone-700">
                  Keywords
                </span>
                <input
                  className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-orange-500"
                  placeholder="guide, demo, price"
                  value={draft.keywords}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      keywords: event.target.value,
                    }))
                  }
                />
              </label>
            ) : null}

            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">DM template</span>
              <textarea
                className="min-h-36 w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-orange-500"
                placeholder="Thanks for commenting..."
                value={draft.dmTemplate}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dmTemplate: event.target.value,
                  }))
                }
                required
              />
            </label>

            <button
              className="w-full rounded-2xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-orange-300"
              disabled={saving || accounts.length === 0}
              type="submit"
            >
              {saving ? "Saving..." : "Create automation"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
