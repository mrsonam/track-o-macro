-- Fluid intake logs + optional daily hydration goal on profile
CREATE TABLE "fluid_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "volume_ml" DECIMAL(65,30) NOT NULL,
    "kind" TEXT,
    "note" TEXT,
    "logged_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fluid_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fluid_logs_user_logged_at_idx" ON "fluid_logs"("user_id", "logged_at");

ALTER TABLE "fluid_logs" ADD CONSTRAINT "fluid_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_profiles" ADD COLUMN "target_hydration_ml" INTEGER;
