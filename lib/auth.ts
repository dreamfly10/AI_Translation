import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { db } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await db.user.findByEmail(credentials.email);
          if (!user || !user.password) {
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error('Error in authorize callback:', error);
          return null;
        }
      },
    }),
    // Only add Google Provider if credentials are configured
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        // Handle Google sign-in
        const existingUser = await db.user.findByEmail(user.email!);
        if (!existingUser) {
          await db.user.create({
            email: user.email!,
            name: user.name || undefined,
            image: user.image || undefined,
            userType: 'trial',
            tokensUsed: 0,
            tokenLimit: 100000, // 100k tokens for trial users
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // Store user id in token during sign in
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Use token.id if available (set during signIn via jwt callback)
      if (token.id) {
        (session.user as any).id = token.id as string;
      } else if (session.user?.email) {
        // Fallback: try to get from database, but don't block if it fails
        try {
          const user = await db.user.findByEmail(session.user.email);
          if (user?.id) {
            (session.user as any).id = user.id;
          }
        } catch (error) {
          // If database query fails, log but don't break the session
          console.error('Error fetching user in session callback:', error);
          // Session can still work without the user ID from database
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

