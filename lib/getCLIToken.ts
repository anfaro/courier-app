import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function getCLIToken(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const apiToken = auth.slice(7);
    if (apiToken) {
      try {
        const [user] = await db
          .select({ id: users.id, name: users.name, email: users.email, role: users.role })
          .from(users)
          .where(eq(users.apiToken, apiToken))
          .limit(1);
        if (user) {
          return { id: user.id, name: user.name, email: user.email, role: user.role };
        }
      } catch {
        // fall through to JWT check
      }
    }
  }
  return getToken({ req, secret: process.env.NEXTAUTH_SECRET });
}
