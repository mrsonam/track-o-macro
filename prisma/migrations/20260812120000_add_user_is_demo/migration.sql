-- Add isDemo flag to User for locating the public demo account
ALTER TABLE "users" ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;
