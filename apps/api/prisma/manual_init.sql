DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TriggerType') THEN
    CREATE TYPE "TriggerType" AS ENUM ('ANY_COMMENT', 'KEYWORD_MATCH');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliveryStatus') THEN
    CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED', 'SIMULATED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "InstagramAccount" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "igUserId" TEXT NOT NULL,
  "pageId" TEXT,
  "username" TEXT NOT NULL,
  "pageName" TEXT,
  "accessToken" TEXT NOT NULL,
  "tokenExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InstagramAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "InstagramAccount_userId_igUserId_key"
  ON "InstagramAccount"("userId", "igUserId");

CREATE TABLE IF NOT EXISTS "Automation" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "instagramAccountId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "mediaCaption" TEXT,
  "mediaPermalink" TEXT,
  "triggerType" "TriggerType" NOT NULL,
  "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "dmTemplate" TEXT NOT NULL,
  "publicReplyTemplate" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Automation_instagramAccountId_fkey"
    FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Automation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Automation_instagramAccountId_mediaId_isActive_idx"
  ON "Automation"("instagramAccountId", "mediaId", "isActive");

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  "id" TEXT PRIMARY KEY,
  "object" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CommentEvent" (
  "id" TEXT PRIMARY KEY,
  "instagramAccountId" TEXT,
  "entryId" TEXT,
  "mediaId" TEXT NOT NULL,
  "commentId" TEXT NOT NULL UNIQUE,
  "commentText" TEXT NOT NULL,
  "actorId" TEXT,
  "actorUsername" TEXT,
  "raw" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommentEvent_instagramAccountId_fkey"
    FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CommentEvent_entryId_mediaId_idx"
  ON "CommentEvent"("entryId", "mediaId");

CREATE TABLE IF NOT EXISTS "MessageDelivery" (
  "id" TEXT PRIMARY KEY,
  "automationId" TEXT NOT NULL,
  "commentEventId" TEXT NOT NULL,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "messageText" TEXT NOT NULL,
  "externalId" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageDelivery_automationId_fkey"
    FOREIGN KEY ("automationId") REFERENCES "Automation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MessageDelivery_commentEventId_fkey"
    FOREIGN KEY ("commentEventId") REFERENCES "CommentEvent"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MessageDelivery_automationId_status_idx"
  ON "MessageDelivery"("automationId", "status");
