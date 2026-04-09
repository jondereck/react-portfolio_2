-- AlterTable
ALTER TABLE "Portfolio"
  ALTER COLUMN "tech" TYPE JSONB USING to_jsonb("tech");
