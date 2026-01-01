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
          console.log('Authorize: Missing credentials');
          return null;
        }

        try {
          const user = await db.user.findByEmail(credentials.email);
          if (!user) {
            console.log('Authorize: User not found for email:', credentials.email);
            return null;
          }
          
          if (!user.password) {
            console.log('Authorize: User has no password (OAuth user?)');
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            console.log('Authorize: Invalid password for email:', credentials.email);
            return null;
          }

          console.log('Authorize: Success for user:', user.id, user.email);
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
      try {
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
              tokenLimit: 1000, // 1k tokens for trial users
            });
          }
        }
        
        // For credentials provider, user should already exist and be validated
        // Just ensure user has an ID
        if (account?.provider === 'credentials' && !user.id) {
          console.error('Credentials sign-in: user missing ID', user);
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      // Store user id in token during sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      // Use token.id if available (set during signIn via jwt callback)
      if (token.id) {
        (session.user as any).id = token.id as string;
      } else if (token.email || session.user?.email) {
        // Fallback: try to get from database using email from token or session
        try {
          const email = token.email || session.user?.email;
          if (email) {
            const user = await db.user.findByEmail(email);
            if (user?.id) {
              (session.user as any).id = user.id;
            } else {
              console.warn('User not found in database for email:', email);
            }
          }
        } catch (error) {
          // If database query fails, log but don't break the session
          console.error('Error fetching user in session callback:', error);
          // Session can still work without the user ID from database
        }
      } else {
        console.warn('No user ID or email available in session callback');
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

