ALTER TABLE "meals" ADD COLUMN IF NOT EXISTS "meal_tags" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "meals" ADD COLUMN IF NOT EXISTS "place_label" TEXT;
CREATE INDEX IF NOT EXISTS "meals_user_place_label_idx" ON "meals" ("user_id", "place_label");
