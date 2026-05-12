-- Prepared meals: batch recipe + weighed output; portions scale by grams.

CREATE TABLE "prepared_meals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "recipe_raw_input" TEXT NOT NULL,
    "prepared_grams" DECIMAL(14,4) NOT NULL,
    "batch_total_kcal" DECIMAL(14,4) NOT NULL,
    "batch_total_protein_g" DECIMAL(14,4) NOT NULL,
    "batch_total_carbs_g" DECIMAL(14,4) NOT NULL,
    "batch_total_fat_g" DECIMAL(14,4) NOT NULL,
    "batch_total_fiber_g" DECIMAL(14,4),
    "batch_total_sodium_mg" DECIMAL(14,4),
    "batch_total_sugar_g" DECIMAL(14,4),
    "batch_total_added_sugar_g" DECIMAL(14,4),
    "line_items_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "prepared_meals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "prepared_meals_user_id_idx" ON "prepared_meals"("user_id");

ALTER TABLE "prepared_meals" ADD CONSTRAINT "prepared_meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
