-- Epic 1: logging style, dietary pattern, avoid list
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "logging_style" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "dietary_pattern" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "food_avoid_json" JSONB;
