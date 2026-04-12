-- CreateTable
CREATE TABLE "saved_meals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "raw_input" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "saved_meals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_meals_user_id_idx" ON "saved_meals"("user_id");

-- AddForeignKey
ALTER TABLE "saved_meals" ADD CONSTRAINT "saved_meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
