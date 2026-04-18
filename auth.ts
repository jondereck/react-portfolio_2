import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { UserRole } from '@prisma/client';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { GOOGLE_DRIVE_LINK_COOKIE, isGoogleDriveOAuthConfigured } from '@/lib/auth/google-drive';
import { verifyPassword } from '@/lib/password/password';

const credentialsSchema = {
  email: { label: 'Email', type: 'email' },
  password: { label: 'Password', type: 'password' },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET || process.env.ADMIN_SESSION_SECRET,
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/admin/login',
  },
  providers: [
    Credentials({
      name: 'Email and Password',
      credentials: credentialsSchema,
      async authorize(credentials) {
        const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';
        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { profile: true },
        });
        if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          isActive: user.isActive,
          profileId: user.profile?.id ?? null,
          profileSlug: user.profile?.slug ?? null,
        };
      },
    }),
    ...(isGoogleDriveOAuthConfigured()
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID ?? '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
            authorization: {
              params: {
                access_type: 'offline',
                prompt: 'consent',
                scope: 'openid email profile https://www.googleapis.com/auth/drive.readonly',
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google') {
        return true;
      }

      const cookieStore = await cookies();
      const expectedUserId = cookieStore.get(GOOGLE_DRIVE_LINK_COOKIE)?.value;
      if (!expectedUserId) {
        return '/admin/gallery/import?googleDrive=connect-denied';
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: expectedUserId },
      });
      if (!targetUser?.isActive) {
        return '/admin/gallery/import?googleDrive=connect-denied';
      }

      if (!account.providerAccountId) {
        return '/admin/gallery/import?googleDrive=connect-denied';
      }

      const existingGoogleAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
      });

      if (existingGoogleAccount && existingGoogleAccount.userId !== targetUser.id) {
        return '/admin/gallery/import?googleDrive=already-linked';
      }

      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
        update: {
          userId: targetUser.id,
          type: account.type,
          refresh_token: account.refresh_token ?? undefined,
          access_token: account.access_token ?? undefined,
          expires_at: account.expires_at ?? undefined,
          token_type: account.token_type ?? undefined,
          scope: account.scope ?? undefined,
          id_token: account.id_token ?? undefined,
          session_state:
            typeof account.session_state === 'string' ? account.session_state : account.session_state != null ? String(account.session_state) : undefined,
        },
        create: {
          userId: targetUser.id,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token ?? null,
          access_token: account.access_token ?? null,
          expires_at: account.expires_at ?? null,
          token_type: account.token_type ?? null,
          scope: account.scope ?? null,
          id_token: account.id_token ?? null,
          session_state:
            typeof account.session_state === 'string' ? account.session_state : account.session_state != null ? String(account.session_state) : null,
        },
      });

      cookieStore.delete(GOOGLE_DRIVE_LINK_COOKIE);

      return '/admin/gallery/import?googleDrive=connected';
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        if (user.role !== undefined || user.profileId !== undefined || user.profileSlug !== undefined) {
          token.role = (user.role ?? 'viewer') as UserRole;
          token.isActive = user.isActive ?? true;
          token.profileId = user.profileId ?? null;
          token.profileSlug = user.profileSlug ?? null;
        } else {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { profile: true },
          });

          if (dbUser) {
            token.role = dbUser.role;
            token.isActive = dbUser.isActive;
            token.profileId = dbUser.profile?.id ?? null;
            token.profileSlug = dbUser.profile?.slug ?? null;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      const role = (token.role ?? 'viewer') as UserRole;
      const isActive = token.isActive ?? true;

      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = role;
        session.user.isActive = isActive;
        session.user.profileId = typeof token.profileId === 'number' ? token.profileId : null;
        session.user.profileSlug = typeof token.profileSlug === 'string' ? token.profileSlug : null;
      }

      return session;
    },
  },
});
