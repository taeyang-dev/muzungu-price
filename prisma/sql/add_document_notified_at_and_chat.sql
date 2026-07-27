-- Run in Supabase SQL editor (without RLS) after deploying app code.

ALTER TABLE "ServiceRequest"
ADD COLUMN IF NOT EXISTS "documentNotifiedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "VendorChatMessage" (
  "id" TEXT NOT NULL,
  "providerProfileId" TEXT NOT NULL,
  "customerUserId" TEXT NOT NULL,
  "sender" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "attachmentsJson" TEXT,
  "translationsJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VendorChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VendorChatMessage_providerProfileId_customerUserId_createdAt_idx"
ON "VendorChatMessage"("providerProfileId", "customerUserId", "createdAt");
