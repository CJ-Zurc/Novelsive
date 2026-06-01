import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Define which routes require which roles
const protectedRoutes = {
    "/admin": ["admin"],
    "/dashboard": ["admin"],
    "/profile": ["user", "admin"],
    "/my-novels": ["user", "admin"],
    "/write": ["user", "admin"],
};

const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password", "/banned"];

async function verifyToken(token: string) {
    try {
        const secret = new TextEncoder().encode(
            process.env.JWT_SECRET ?? "novelsive_secret_change_this_later"
        );
        const { payload } = await jwtVerify(token, secret);
        return payload;
    } catch {
        return null;
    }
}

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Get token from cookie
    const token = req.cookies.get("token")?.value;

    // If user is logged in and tries to access auth pages, redirect to home
    if (authRoutes.some((route) => pathname.startsWith(route))) {
        if (token) {
            const payload = await verifyToken(token);
            if (payload) {
                return NextResponse.redirect(new URL("/", req.url));
            }
        }
        return NextResponse.next();
    }

    // Check protected routes
    for (const [route, allowedRoles] of Object.entries(protectedRoutes)) {
        if (pathname.startsWith(route)) {
            // Not logged in
            if (!token) {
                return NextResponse.redirect(new URL("/login", req.url));
            }

            // Verify token
            const payload = await verifyToken(token);
            if (!payload) {
                return NextResponse.redirect(new URL("/login", req.url));
            }

            // Check role
            const userRole = (payload.role as string).toUpperCase();
            if (!allowedRoles.map(r => r.toUpperCase()).includes(userRole)) {
                return NextResponse.redirect(new URL("/", req.url));
            }

            return NextResponse.next();
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
    ],
};
