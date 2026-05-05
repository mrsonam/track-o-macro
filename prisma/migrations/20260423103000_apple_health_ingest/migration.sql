-- Apple Health Shortcuts ingestion: samples + sync tokens; weight log mirror columns.

ALTER TABLE "weight_logs" ADD COLUMN "ingest_source" TEXT;
ALTER TABLE "weight_logs" ADD COLUMN "ingest_dedupe_key" TEXT;

CREATE UNIQUE INDEX "weight_logs_user_ingest_dedupe_key" ON "weight_logs"("user_id", "ingest_dedupe_key");

CREATE TABLE "health_sync_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "last_used_at" TIMESTAMPTZ(6),

    CONSTRAINT "health_sync_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "health_sync_tokens_token_hash_key" ON "health_sync_tokens"("token_hash");
CREATE INDEX "health_sync_tokens_user_id_idx" ON "health_sync_tokens"("user_id");

ALTER TABLE "health_sync_tokens" ADD CONSTRAINT "health_sync_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "health_samples" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "metric_type" TEXT NOT NULL,
    "value" DECIMAL(24,10) NOT NULL,
    "unit" TEXT NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL,
    "time_zone" TEXT,
    "ingested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "external_id" TEXT,
    "metadata" JSONB,
    "dedupe_key" TEXT NOT NULL,
    "raw_payload" JSONB,

    CONSTRAINT "health_samples_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "health_samples_user_dedupe_key" ON "health_samples"("user_id", "dedupe_key");
CREATE INDEX "health_samples_user_recorded_at_idx" ON "health_samples"("user_id", "recorded_at");

ALTER TABLE "health_samples" ADD CONSTRAINT "health_samples_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
