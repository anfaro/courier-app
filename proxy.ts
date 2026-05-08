// proxy.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // 1. Get the requested URL path and the user's token
    const path = req.nextUrl.pathname;
    const token = req.nextauth.token;

    // 2. The VIP Lounge: Protect the /admin route
    if (path.startsWith("/admin")) {
      // If they are NOT a superadmin, kick them back to the Home Dashboard
      if (token?.role !== "superadmin") {
        console.log(`Blocked access to Admin Hub for user: ${token?.email} (Role: ${token?.role})`);
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // Allow the request to proceed if no rules are broken
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      // Ensure the user actually has a valid session token before running the middleware
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  // Keeping your exact matcher! This protects all routes except the public ones listed.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login|signup|forgot-password|reset-password).*)",
  ],
};

