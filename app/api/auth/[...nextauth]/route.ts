// app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        usernameOrEmail: { label: "Email or Name", type: "text", placeholder: "jsmith@example.com or john" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.usernameOrEmail || !credentials?.password) {
          return null;
        }

        const userResult = await db
          .select()
          .from(users)
          .where(
            or(
              eq(users.email, credentials.usernameOrEmail),
              eq(users.name, credentials.usernameOrEmail)
            )
          )
          .limit(1);

        const user = userResult[0];

        if (!user) {
          return null;
        }

        const passwordsMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (passwordsMatch) {
          await db.update(users).set({ isActive: true, lastActiveAt: new Date() }).where(eq(users.id, user.id));

          return {
            id: user.id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            targetSystem: user.targetSystem,
            getGeocode: user.getGeocode,
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        // @ts-expect-error: role is not in the default user type
        token.role = user.role;
        // @ts-expect-error: targetSystem is not in the default user type
        token.targetSystem = user.targetSystem;
        // @ts-expect-error: getGeocode is not in the default user type
        token.getGeocode = user.getGeocode;
      }

      if (trigger === "update") {
        if (session?.name) token.name = session.name;
        // @ts-expect-error: targetSystem
        if (session?.targetSystem !== undefined) token.targetSystem = session.targetSystem;
        // @ts-expect-error: getGeocode
        if (session?.getGeocode !== undefined) token.getGeocode = session.getGeocode;
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        // @ts-expect-error: id is not in the default session user type
        session.user.id = token.id;
        session.user.name = token.name;
        // @ts-expect-error: role is not in the default session user type
        session.user.role = token.role;
        // @ts-expect-error: targetSystem is not in the default session user type
        session.user.targetSystem = token.targetSystem;
        // @ts-expect-error: getGeocode is not in the default session user type
        session.user.getGeocode = token.getGeocode;
      }

      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
