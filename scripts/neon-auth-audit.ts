import 'dotenv/config';
import { buildNeonMigrationAudit } from '../lib/auth/neon-migration';
import { prisma } from '../lib/prisma';

async function main() {
  const audit = await buildNeonMigrationAudit();

  console.log(`Neon directory source: ${audit.source}`);
  console.table(
    audit.rows.map((row) => ({
      albums: row.albumCount,
      email: row.email,
      googleLinked: row.googleLinked ? 'yes' : 'no',
      localStatus: row.localStatus,
      neonAuthUserId: row.neonAuthUserId ?? '',
      neonLinkState: row.neonLinkState,
      neonMatchId: row.neonMatchId ?? '',
      photos: row.photoCount,
      profile: row.profileSlug ?? '',
      role: row.role,
      userId: row.userId,
    })),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
