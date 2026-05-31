import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Store: IP -> { count, resetTime }
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000;

function getRateLimit(ip: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = loginAttempts.get(ip);

    if (!record || now > record.resetTime) {
        loginAttempts.set(ip, {
            count: 1,
            resetTime: now + WINDOW_MS,
        });
        return { allowed: true, remaining: RATE_LIMIT - 1 };
    }

    if (record.count >= RATE_LIMIT) {
        return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: RATE_LIMIT - record.count };
}

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

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Rate limiting on login
    if (pathname === "/api/auth/login" && req.method === "POST") {
        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0] ??
            req.headers.get("x-real-ip") ??
            "unknown";

        const { allowed, remaining } = getRateLimit(ip);

        if (!allowed) {
            return NextResponse.json(
                {
                    message:
                        "Too many login attempts. Please try again in 15 minutes.",
                },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Limit": RATE_LIMIT.toString(),
                        "X-RateLimit-Remaining": "0",
                    },
                }
            );
        }

        const response = NextResponse.next();
        response.headers.set("X-RateLimit-Remaining", remaining.toString());
        return response;
    }

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