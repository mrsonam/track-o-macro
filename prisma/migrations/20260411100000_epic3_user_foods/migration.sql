-- CreateTable
CREATE TABLE "user_foods" (
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

-- CreateIndex
CREATE UNIQUE INDEX "user_foods_user_label_norm_key" ON "user_foods"("user_id", "label_norm");

-- CreateIndex
CREATE INDEX "user_foods_user_id_idx" ON "user_foods"("user_id");

-- AddForeignKey
ALTER TABLE "user_foods" ADD CONSTRAINT "user_foods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
