import type { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type NeonDirectorySource = 'neon_auth.user' | 'neon_auth.users_sync' | 'missing';

type NeonDirectoryUser = {
  email: string;
  id: string;
  name: string | null;
};

type LocalDuplicateRow = {
  normalizedEmail: string;
  userIds: string[];
};

type LocalAlbumCountRow = {
  count: bigint;
  userId: string;
};

type LocalPhotoCountRow = {
  count: bigint;
  userId: string;
};

export type NeonMigrationAuditRow = {
  albumCount: number;
  email: string;
  googleLinked: boolean;
  localStatus: 'active' | 'pending' | 'suspended';
  neonAuthUserId: string | null;
  neonLinkState: 'linked' | 'linked_remote_missing' | 'matchable' | 'missing' | 'conflict';
  neonMatchEmail: string | null;
  neonMatchId: string | null;
  photoCount: number;
  profileId: number | null;
  profileSlug: string | null;
  role: UserRole;
  userId: string;
};

export type NeonBackfillResult = {
  conflicts: string[];
  linked: Array<{ email: string; neonAuthUserId: string; userId: string }>;
  normalizedEmails: Array<{ nextEmail: string; previousEmail: string; userId: string }>;
  skipped: Array<{ email: string; reason: string; userId: string }>;
  source: NeonDirectorySource;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function deriveLocalStatus(user: { emailVerified: Date | null; isActive: boolean; role: UserRole }) {
  if (user.role === 'super_admin') {
    return user.isActive ? 'active' : 'suspended';
  }

  if (!user.emailVerified) {
    return 'pending';
  }

  return user.isActive ? 'active' : 'suspended';
}

async function getNeonDirectorySource(): Promise<NeonDirectorySource> {
  const [betterAuthTable] = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT to_regclass('neon_auth."user"') IS NOT NULL AS "exists"`,
  );
  if (betterAuthTable?.exists) {
    return 'neon_auth.user';
  }

  const [legacyTable] = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT to_regclass('neon_auth.users_sync') IS NOT NULL AS "exists"`,
  );
  if (legacyTable?.exists) {
    return 'neon_auth.users_sync';
  }

  return 'missing';
}

export async function listNeonDirectoryUsers() {
  const source = await getNeonDirectorySource();
  if (source === 'missing') {
    return {
      source,
      users: [] as NeonDirectoryUser[],
    };
  }

  const users =
    source === 'neon_auth.user'
      ? await prisma.$queryRawUnsafe<NeonDirectoryUser[]>(
          `
            SELECT
              u.id::text AS "id",
              lower(trim(u.email)) AS "email",
              u.name::text AS "name"
            FROM neon_auth."user" u
            WHERE u.email IS NOT NULL
          `,
        )
      : await prisma.$queryRawUnsafe<NeonDirectoryUser[]>(
          `
            SELECT
              u.id::text AS "id",
              lower(trim(u.email)) AS "email",
              u.name::text AS "name"
            FROM neon_auth.users_sync u
            WHERE u.deleted_at IS NULL
              AND u.email IS NOT NULL
          `,
        );

  return { source, users };
}

export async function findNormalizedEmailDuplicates() {
  return prisma.$queryRawUnsafe<LocalDuplicateRow[]>(
    `
      SELECT
        lower(trim(u.email)) AS "normalizedEmail",
        array_agg(u.id ORDER BY u.id) AS "userIds"
      FROM "User" u
      GROUP BY lower(trim(u.email))
      HAVING count(*) > 1
    `,
  );
}

export async function buildNeonMigrationAudit() {
  const localUsers = await prisma.user.findMany({
    include: {
      accounts: {
        select: {
          provider: true,
        },
      },
      profile: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
  });

  const albumCounts = await prisma.$queryRawUnsafe<LocalAlbumCountRow[]>(
    `
      SELECT
        p."userId" AS "userId",
        count(a.id)::bigint AS "count"
      FROM "Profile" p
      LEFT JOIN "Album" a ON a."profileId" = p.id
      GROUP BY p."userId"
    `,
  );
  const photoCounts = await prisma.$queryRawUnsafe<LocalPhotoCountRow[]>(
    `
      SELECT
        p."userId" AS "userId",
        count(ap.id)::bigint AS "count"
      FROM "Profile" p
      LEFT JOIN "Album" a ON a."profileId" = p.id
      LEFT JOIN "AlbumPhoto" ap ON ap."albumId" = a.id
      GROUP BY p."userId"
    `,
  );

  const albumCountByUserId = new Map(albumCounts.map((row) => [row.userId, Number(row.count)]));
  const photoCountByUserId = new Map(photoCounts.map((row) => [row.userId, Number(row.count)]));

  const { source, users: neonUsers } = await listNeonDirectoryUsers();
  const neonById = new Map(neonUsers.map((user) => [user.id, user]));
  const neonByEmail = new Map<string, NeonDirectoryUser[]>();

  for (const user of neonUsers) {
    const bucket = neonByEmail.get(user.email) ?? [];
    bucket.push(user);
    neonByEmail.set(user.email, bucket);
  }

  const rows: NeonMigrationAuditRow[] = localUsers.map((user) => {
    const normalizedEmail = normalizeEmail(user.email);
    const matches = neonByEmail.get(normalizedEmail) ?? [];
    const linkedUser = user.neonAuthUserId ? neonById.get(user.neonAuthUserId) ?? null : null;

    let neonLinkState: NeonMigrationAuditRow['neonLinkState'] = 'missing';
    let neonMatchEmail: string | null = null;
    let neonMatchId: string | null = null;

    if (user.neonAuthUserId) {
      neonMatchEmail = linkedUser?.email ?? null;
      neonMatchId = linkedUser?.id ?? user.neonAuthUserId;
      neonLinkState = linkedUser ? 'linked' : 'linked_remote_missing';
    } else if (matches.length === 1) {
      neonLinkState = 'matchable';
      neonMatchEmail = matches[0].email;
      neonMatchId = matches[0].id;
    } else if (matches.length > 1) {
      neonLinkState = 'conflict';
    }

    return {
      albumCount: albumCountByUserId.get(user.id) ?? 0,
      email: user.email,
      googleLinked: user.accounts.some((account) => account.provider === 'google'),
      localStatus: deriveLocalStatus(user),
      neonAuthUserId: user.neonAuthUserId,
      neonLinkState,
      neonMatchEmail,
      neonMatchId,
      photoCount: photoCountByUserId.get(user.id) ?? 0,
      profileId: user.profile?.id ?? null,
      profileSlug: user.profile?.slug ?? null,
      role: user.role,
      userId: user.id,
    };
  });

  return {
    rows,
    source,
  };
}

export async function runNeonBackfill(options?: { write?: boolean }) {
  const write = options?.write === true;
  const duplicates = await findNormalizedEmailDuplicates();

  const result: NeonBackfillResult = {
    conflicts: duplicates.map(
      (row) => `Duplicate normalized email ${row.normalizedEmail}: ${row.userIds.join(', ')}`,
    ),
    linked: [],
    normalizedEmails: [],
    skipped: [],
    source: 'missing',
  };

  const { source, users: neonUsers } = await listNeonDirectoryUsers();
  result.source = source;
  if (source === 'missing') {
    result.conflicts.push('Neon auth schema is not available in this database.');
    return result;
  }

  const neonByEmail = new Map<string, NeonDirectoryUser[]>();
  const neonById = new Map<string, NeonDirectoryUser>();
  for (const user of neonUsers) {
    neonById.set(user.id, user);
    const bucket = neonByEmail.get(user.email) ?? [];
    bucket.push(user);
    neonByEmail.set(user.email, bucket);
  }

  const localUsers = await prisma.user.findMany({
    orderBy: [{ createdAt: 'asc' }],
  });

  const linkedNeonIds = new Map(
    localUsers
      .filter((user) => Boolean(user.neonAuthUserId))
      .map((user) => [String(user.neonAuthUserId), user.id]),
  );

  if (write && duplicates.length === 0) {
    for (const user of localUsers) {
      const normalizedEmail = normalizeEmail(user.email);
      if (normalizedEmail !== user.email) {
        await prisma.user.update({
          where: { id: user.id },
          data: { email: normalizedEmail },
        });
        result.normalizedEmails.push({
          nextEmail: normalizedEmail,
          previousEmail: user.email,
          userId: user.id,
        });
        user.email = normalizedEmail;
      }
    }
  }

  for (const user of localUsers) {
    const normalizedEmail = normalizeEmail(user.email);

    if (user.neonAuthUserId) {
      const remoteUser = neonById.get(user.neonAuthUserId);
      if (!remoteUser) {
        result.skipped.push({
          email: normalizedEmail,
          reason: 'Local user is linked, but the remote Neon user is missing.',
          userId: user.id,
        });
      } else {
        result.skipped.push({
          email: normalizedEmail,
          reason: 'Already linked.',
          userId: user.id,
        });
      }
      continue;
    }

    const matches = neonByEmail.get(normalizedEmail) ?? [];
    if (matches.length === 0) {
      result.skipped.push({
        email: normalizedEmail,
        reason: 'No matching Neon user found.',
        userId: user.id,
      });
      continue;
    }

    if (matches.length > 1) {
      result.conflicts.push(`Multiple Neon users match ${normalizedEmail}.`);
      continue;
    }

    const match = matches[0];
    const existingLocalOwner = linkedNeonIds.get(match.id);
    if (existingLocalOwner && existingLocalOwner !== user.id) {
      result.conflicts.push(
        `Neon user ${match.id} is already linked to local user ${existingLocalOwner}, cannot also link ${user.id}.`,
      );
      continue;
    }

    if (write) {
      await prisma.user.update({
        where: { id: user.id },
        data: { neonAuthUserId: match.id },
      });
      linkedNeonIds.set(match.id, user.id);
    }

    result.linked.push({
      email: normalizedEmail,
      neonAuthUserId: match.id,
      userId: user.id,
    });
  }

  return result;
}
