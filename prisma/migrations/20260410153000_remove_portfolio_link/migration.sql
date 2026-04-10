UPDATE "Portfolio"
SET "demoUrl" = COALESCE("demoUrl", "link")
WHERE "link" IS NOT NULL;

ALTER TABLE "Portfolio"
DROP COLUMN "link";
