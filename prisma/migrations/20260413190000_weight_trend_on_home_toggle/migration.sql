ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "weight_trend_on_home_enabled" BOOLEAN NOT NULL DEFAULT false;
