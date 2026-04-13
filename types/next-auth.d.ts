import type { DefaultSession } from 'next-auth';
import type { UserRole } from '@prisma/client';
import type { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role: UserRole;
      isActive: boolean;
      profileId: number | null;
      profileSlug: string | null;
    };
  }

  interface User {
    role?: UserRole;
    isActive?: boolean;
    profileId?: number | null;
    profileSlug?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: UserRole;
    isActive?: boolean;
    profileId?: number | null;
    profileSlug?: string | null;
  }
}
