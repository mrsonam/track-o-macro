-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "activity_level" TEXT,
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "bmr_kcal" DECIMAL(65,30),
ADD COLUMN     "goal_intent" TEXT,
ADD COLUMN     "height_cm" DECIMAL(65,30),
ADD COLUMN     "sex" TEXT,
ADD COLUMN     "target_kcal" DECIMAL(65,30),
ADD COLUMN     "tdee_kcal" DECIMAL(65,30),
ADD COLUMN     "weight_kg" DECIMAL(65,30);
