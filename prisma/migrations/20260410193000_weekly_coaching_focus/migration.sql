-- Epic 5: optional user-chosen weekly coaching theme (Settings + week cards)
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "weekly_coaching_focus" TEXT;
