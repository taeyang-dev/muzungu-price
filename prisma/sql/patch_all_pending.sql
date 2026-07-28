-- Run once in Supabase SQL Editor (without RLS).
-- Safe to re-run: uses IF NOT EXISTS everywhere.

-- PR #21: upload notify + chat
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

-- Request documents (customer can see vendor uploads)
CREATE TABLE IF NOT EXISTS "RequestDocument" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "dataUrl" TEXT NOT NULL,
  "vendorProfileId" TEXT,
  "vendorName" TEXT NOT NULL,
  "uploadedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RequestDocument_requestId_createdAt_idx"
ON "RequestDocument"("requestId", "createdAt");

-- PR #23: service category Other custom text
ALTER TABLE "ProviderProfile"
ADD COLUMN IF NOT EXISTS "categoryOtherDetail" TEXT;

-- Unified chat read cursors + customer thread index
CREATE INDEX IF NOT EXISTS "VendorChatMessage_customerUserId_createdAt_idx"
ON "VendorChatMessage"("customerUserId", "createdAt");

CREATE TABLE IF NOT EXISTS "VendorChatReadCursor" (
  "id" TEXT NOT NULL,
  "providerProfileId" TEXT NOT NULL,
  "customerUserId" TEXT NOT NULL,
  "readerUserId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VendorChatReadCursor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VendorChatReadCursor_providerProfileId_customerUserId_readerUserId_key"
ON "VendorChatReadCursor"("providerProfileId", "customerUserId", "readerUserId");

CREATE INDEX IF NOT EXISTS "VendorChatReadCursor_readerUserId_idx"
ON "VendorChatReadCursor"("readerUserId");
