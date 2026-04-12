-- Epic 1: goal pace + optional protein target (advanced path)
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "goal_pace" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "target_protein_g" DECIMAL(10,2);
