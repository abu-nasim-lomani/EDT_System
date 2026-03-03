import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that don't require authentication
const PUBLIC_PATHS = ["/login", "/register"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public routes
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // Allow non-dashboard routes (API, static files, etc.)
    if (!pathname.startsWith("/dashboard")) {
        return NextResponse.next();
    }

    // Check for auth token in cookies (set on login)
    const token = request.cookies.get("edt_token")?.value;

    if (!token) {
        // Redirect to login with next param so we can redirect back after login
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
