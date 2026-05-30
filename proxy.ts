// proxy.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const path = req.nextUrl.pathname;
    const token = req.nextauth.token;
    const userAgent = req.headers.get("user-agent") || "";

    // 1. DEVICE DETECTION
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|Windows Phone/i.test(userAgent);
    if (!isMobile && path !== "/not-mobile") {
        return NextResponse.redirect(new URL("/not-mobile", req.url));
    }

    // 2. ADMIN PROTECTION
    if (path.startsWith("/admin")) {
      if (token?.role !== "superadmin") {
        console.warn(`[AUTH] Blocked access to Admin Hub for user: ${token?.email} (Role: ${token?.role})`);
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path === "/not-mobile") return true;
        if (path === "/login" || path === "/register" || path === "/forgot-password" || path === "/reset-password" || path.startsWith("/share")) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
