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
        console.log("before")
        // 1. Ensure credentials exist
        if (!credentials?.usernameOrEmail || !credentials?.password) {
          return null;
        }

        console.log("after")

        // 2. Query the database using Drizzle
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
        console.log(user.name)

        // 3. If no user is found, return null
        if (!user) {
          return null;
        }

        // 4. Compare the provided password with the hashed password in the DB
        const passwordsMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        // 5. If successful, return the user object (this gets saved in the JWT)
        if (passwordsMatch) {
          return {
            id: user.id.toString(),
            name: user.name,
            email: user.email
          };
        }

        // Return null if passwords don't match
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
        token.id = user.id
        token.name = user.name
      }

      if (trigger === "update" && session?.name) {
        token.name = session.name
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        // @ts-ignore
        session.user.id = token.id
        session.user.name = token.name
      }

      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
