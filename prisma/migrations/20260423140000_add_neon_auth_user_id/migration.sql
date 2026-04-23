ALTER TABLE "User" ADD COLUMN "neonAuthUserId" TEXT;

CREATE UNIQUE INDEX "User_neonAuthUserId_key" ON "User"("neonAuthUserId");
