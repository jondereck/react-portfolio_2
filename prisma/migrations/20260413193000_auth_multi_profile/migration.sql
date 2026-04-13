-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'admin', 'editor', 'viewer');

-- Drop legacy unique constraints that will become profile-scoped.
DROP INDEX "Album_slug_key";
DROP INDEX "Portfolio_slug_key";
DROP INDEX "AdminAuditEvent_type_createdAt_idx";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- Seed a stable primary actor/profile so existing content can be owned immediately after migration.
INSERT INTO "User" (
    "id",
    "name",
    "email",
    "passwordHash",
    "role",
    "isActive",
    "createdAt",
    "updatedAt"
)
VALUES (
    'primary-admin',
    'Primary Admin',
    'admin@example.com',
    'scrypt$81eb650b8fb653ff8d74c32a9bfedc9e$8cfe5f6f7ee8be49463ba9612bab3a6e6fb04645f4981a5b6ce410a1f9de17c49d7d0cf82b288117c8d2f4e9ec9ab448a79f87928dbb09cb793c27471f2468e5',
    'super_admin',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Profile" (
    "id",
    "userId",
    "slug",
    "displayName",
    "isPublic",
    "isPrimary",
    "createdAt",
    "updatedAt"
)
VALUES (
    1,
    'primary-admin',
    'primary',
    'Primary Admin',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('"Profile"', 'id'),
    GREATEST(COALESCE((SELECT MAX("id") FROM "Profile"), 1), 1),
    true
);

-- Add new audit fields as nullable first so existing rows can be preserved.
ALTER TABLE "AdminAuditEvent"
    ADD COLUMN "action" TEXT,
    ADD COLUMN "actorUserId" TEXT,
    ADD COLUMN "metadata" JSONB,
    ADD COLUMN "targetId" TEXT,
    ADD COLUMN "targetProfileId" INTEGER,
    ADD COLUMN "targetType" TEXT;

UPDATE "AdminAuditEvent"
SET
    "action" = COALESCE("type", 'legacy_event'),
    "metadata" = "details",
    "actorUserId" = 'primary-admin',
    "targetProfileId" = 1
WHERE "action" IS NULL;

ALTER TABLE "AdminAuditEvent"
    ALTER COLUMN "action" SET NOT NULL,
    DROP COLUMN "details",
    DROP COLUMN "type";

-- Add ownership columns as nullable first, then backfill existing rows.
ALTER TABLE "Album" ADD COLUMN "profileId" INTEGER;
ALTER TABLE "Certificate" ADD COLUMN "profileId" INTEGER;
ALTER TABLE "Experience" ADD COLUMN "profileId" INTEGER;
ALTER TABLE "Portfolio" ADD COLUMN "profileId" INTEGER;
ALTER TABLE "Skill" ADD COLUMN "profileId" INTEGER;
ALTER TABLE "SiteConfig" ADD COLUMN "profileId" INTEGER;
ALTER TABLE "SiteContent" ADD COLUMN "profileId" INTEGER;

UPDATE "Album" SET "profileId" = 1 WHERE "profileId" IS NULL;
UPDATE "Certificate" SET "profileId" = 1 WHERE "profileId" IS NULL;
UPDATE "Experience" SET "profileId" = 1 WHERE "profileId" IS NULL;
UPDATE "Portfolio" SET "profileId" = 1 WHERE "profileId" IS NULL;
UPDATE "Skill" SET "profileId" = 1 WHERE "profileId" IS NULL;
UPDATE "SiteConfig" SET "profileId" = 1 WHERE "profileId" IS NULL;
UPDATE "SiteContent" SET "profileId" = 1 WHERE "profileId" IS NULL;

ALTER TABLE "Album" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "Certificate" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "Experience" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "Portfolio" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "Skill" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "SiteConfig" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "SiteContent" ALTER COLUMN "profileId" SET NOT NULL;

-- Convert singleton id columns to generated ids for profile-scoped site tables.
CREATE SEQUENCE IF NOT EXISTS "siteconfig_id_seq";
ALTER TABLE "SiteConfig" ALTER COLUMN "id" SET DEFAULT nextval('"siteconfig_id_seq"');
ALTER SEQUENCE "siteconfig_id_seq" OWNED BY "SiteConfig"."id";
SELECT setval('"siteconfig_id_seq"', GREATEST(COALESCE((SELECT MAX("id") FROM "SiteConfig"), 1), 1), true);

CREATE SEQUENCE IF NOT EXISTS "sitecontent_id_seq";
ALTER TABLE "SiteContent" ALTER COLUMN "id" SET DEFAULT nextval('"sitecontent_id_seq"');
ALTER SEQUENCE "sitecontent_id_seq" OWNED BY "SiteContent"."id";
SELECT setval('"sitecontent_id_seq"', GREATEST(COALESCE((SELECT MAX("id") FROM "SiteContent"), 1), 1), true);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE UNIQUE INDEX "Profile_slug_key" ON "Profile"("slug");
CREATE INDEX "Profile_isPublic_idx" ON "Profile"("isPublic");
CREATE INDEX "Profile_isPrimary_idx" ON "Profile"("isPrimary");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE INDEX "AdminAuditEvent_action_createdAt_idx" ON "AdminAuditEvent"("action", "createdAt");
CREATE INDEX "Album_profileId_isPublished_createdAt_idx" ON "Album"("profileId", "isPublished", "createdAt");
CREATE UNIQUE INDEX "Album_profileId_slug_key" ON "Album"("profileId", "slug");
CREATE INDEX "Certificate_profileId_category_sortOrder_idx" ON "Certificate"("profileId", "category", "sortOrder");
CREATE INDEX "Experience_profileId_isCurrent_sortOrder_idx" ON "Experience"("profileId", "isCurrent", "sortOrder");
CREATE INDEX "Portfolio_profileId_isPublished_sortOrder_idx" ON "Portfolio"("profileId", "isPublished", "sortOrder");
CREATE UNIQUE INDEX "Portfolio_profileId_slug_key" ON "Portfolio"("profileId", "slug");
CREATE UNIQUE INDEX "SiteConfig_profileId_key" ON "SiteConfig"("profileId");
CREATE UNIQUE INDEX "SiteContent_profileId_key" ON "SiteContent"("profileId");
CREATE INDEX "Skill_profileId_category_sortOrder_idx" ON "Skill"("profileId", "category", "sortOrder");

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteContent" ADD CONSTRAINT "SiteContent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteConfig" ADD CONSTRAINT "SiteConfig_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminAuditEvent" ADD CONSTRAINT "AdminAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminAuditEvent" ADD CONSTRAINT "AdminAuditEvent_targetProfileId_fkey" FOREIGN KEY ("targetProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Album" ADD CONSTRAINT "Album_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
