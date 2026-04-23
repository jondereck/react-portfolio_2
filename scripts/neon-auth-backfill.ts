import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { runNeonBackfill } from '../lib/auth/neon-migration';

async function main() {
  const write = process.argv.includes('--write');
  const result = await runNeonBackfill({ write });

  console.log(`Neon directory source: ${result.source}`);
  console.log(`Mode: ${write ? 'write' : 'dry-run'}`);

  if (result.normalizedEmails.length > 0) {
    console.log('Normalized local emails:');
    console.table(result.normalizedEmails);
  }

  if (result.linked.length > 0) {
    console.log(write ? 'Linked users:' : 'Linkable users:');
    console.table(result.linked);
  }

  if (result.skipped.length > 0) {
    console.log('Skipped users:');
    console.table(result.skipped);
  }

  if (result.conflicts.length > 0) {
    console.log('Conflicts:');
    for (const conflict of result.conflicts) {
      console.log(`- ${conflict}`);
    }
  }

  if (result.conflicts.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
