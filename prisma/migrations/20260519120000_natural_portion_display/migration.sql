-- Natural portion display on line items; optional default serving on user foods
ALTER TABLE "meal_line_items" ADD COLUMN IF NOT EXISTS "display_quantity" DECIMAL(14,4);
ALTER TABLE "meal_line_items" ADD COLUMN IF NOT EXISTS "display_unit" TEXT;
ALTER TABLE "meal_line_items" ADD COLUMN IF NOT EXISTS "display_label" TEXT;
ALTER TABLE "meal_line_items" ADD COLUMN IF NOT EXISTS "conversion_source" TEXT;
ALTER TABLE "meal_line_items" ADD COLUMN IF NOT EXISTS "assumption" TEXT;

ALTER TABLE "user_foods" ADD COLUMN IF NOT EXISTS "default_serving_qty" DECIMAL(14,4);
ALTER TABLE "user_foods" ADD COLUMN IF NOT EXISTS "default_serving_unit" TEXT;
ALTER TABLE "user_foods" ADD COLUMN IF NOT EXISTS "default_serving_grams" DECIMAL(14,4);
