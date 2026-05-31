import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import prisma from "@/lib/db";
import { env } from "@/lib/env";
import { authenticator } from "otplib";

authenticator.options = { window: 1 };

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const code = body.code as string | undefined;
        if (!code) return NextResponse.json({ message: "Code is required" }, { status: 400 });

        const mfaToken = req.cookies.get("mfa_challenge")?.value;
        if (!mfaToken) return NextResponse.json({ message: "No MFA challenge present" }, { status: 401 });

        const secretKey = new TextEncoder().encode(env.JWT_SECRET);
        let payload: any;
        try {
            const verified = await jwtVerify(mfaToken, secretKey);
            payload = verified.payload as any;
        } catch {
            return NextResponse.json({ message: "Invalid or expired MFA challenge" }, { status: 401 });
        }

        if (payload.purpose !== "mfa" || !payload.id) {
            return NextResponse.json({ message: "Invalid MFA challenge" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { id: Number(payload.id) } });
        if (!user || !user.mfa_secret) return NextResponse.json({ message: "MFA not configured" }, { status: 400 });

        const isValid = authenticator.check(code, user.mfa_secret);
        if (!isValid) return NextResponse.json({ message: "Invalid code" }, { status: 401 });

        // Issue final session token
        const token = await new SignJWT({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("24h")
            .sign(secretKey);

        const response = NextResponse.json({ message: "Login successful" });
        response.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24,
            path: "/",
        });

        // Clear challenge cookie
        response.cookies.set("mfa_challenge", "", { maxAge: 0, path: "/" });

        return response;
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

