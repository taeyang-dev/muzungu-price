-- Run in Supabase SQL Editor (or via npm run db:push with DIRECT_URL on port 5432).

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RequestDocument_requestId_fkey'
  ) THEN
    ALTER TABLE "RequestDocument"
      ADD CONSTRAINT "RequestDocument_requestId_fkey"
      FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
