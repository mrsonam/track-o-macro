-- Epic 5: optional recovery-friendly "active days in last 14" coaching (no streak pressure)
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "active_days_14_enabled" BOOLEAN NOT NULL DEFAULT false;
