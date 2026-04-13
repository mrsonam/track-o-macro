-- Epic 4: added sugars when FDC/resolver provides; supports total vs added labels in UI
ALTER TABLE "meals" ADD COLUMN IF NOT EXISTS "total_added_sugar_g" DECIMAL(65,30);
ALTER TABLE "meal_line_items" ADD COLUMN IF NOT EXISTS "added_sugar_g" DECIMAL(65,30);
