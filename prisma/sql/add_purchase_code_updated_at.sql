-- Run once in Supabase SQL Editor (or via `npm run db:push` with production DIRECT_URL).
-- Fixes server errors after deploying purchase-code update tracking.

ALTER TABLE "ServiceRequest"
ADD COLUMN IF NOT EXISTS "purchaseCodeUpdatedAt" TIMESTAMP(3);
