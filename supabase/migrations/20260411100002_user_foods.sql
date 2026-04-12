-- Epic 3: user-defined foods (per 100 g), versioned edits
CREATE TABLE IF NOT EXISTS "user_foods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "label_norm" TEXT NOT NULL,
    "kcal_per_100g" DECIMAL(65,30) NOT NULL,
    "protein_per_100g" DECIMAL(65,30) NOT NULL,
    "carbs_per_100g" DECIMAL(65,30) NOT NULL,
    "fat_per_100g" DECIMAL(65,30) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_foods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_foods_user_label_norm_key" ON "user_foods"("user_id", "label_norm");
CREATE INDEX IF NOT EXISTS "user_foods_user_id_idx" ON "user_foods"("user_id");

ALTER TABLE "user_foods" DROP CONSTRAINT IF EXISTS "user_foods_user_id_fkey";
ALTER TABLE "user_foods" ADD CONSTRAINT "user_foods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
