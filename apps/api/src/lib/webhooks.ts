type WebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        id?: string;
        text?: string;
        media?: {
          id?: string;
        };
        from?: {
          id?: string;
          username?: string;
        };
      };
    }>;
  }>;
};

export type ExtractedCommentEvent = {
  entryId?: string;
  mediaId: string;
  commentId: string;
  commentText: string;
  actorId?: string;
  actorUsername?: string;
  raw: Record<string, unknown>;
};

export function extractCommentEvents(payload: WebhookPayload): ExtractedCommentEvent[] {
  if (!payload.entry?.length) {
    return [];
  }

  const extracted: ExtractedCommentEvent[] = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "comments" || !change.value?.id || !change.value?.media?.id) {
        continue;
      }

      extracted.push({
        entryId: entry.id,
        mediaId: change.value.media.id,
        commentId: change.value.id,
        commentText: change.value.text ?? "",
        actorId: change.value.from?.id,
        actorUsername: change.value.from?.username,
        raw: change.value as Record<string, unknown>,
      });
    }
  }

  return extracted;
}
