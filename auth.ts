import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
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
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user.role ?? 'viewer') as UserRole;
        token.isActive = user.isActive ?? true;
        token.profileId = user.profileId ?? null;
        token.profileSlug = user.profileSlug ?? null;
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
