import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import prisma from "@/lib/db";
import { z } from "zod";
import { SignJWT } from "jose";
import { env } from "@/lib/env";

const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
    hcaptchaToken: z.string().min(1, "Please complete the captcha"),
});

async function verifyHcaptcha(token: string): Promise<boolean> {
    const response = await fetch("https://api.hcaptcha.com/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${env.HCAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();
    return data.success;
}

interface RateLimitRecord {
    attempts: number;
    lockoutUntil: number | null;
}

const loginAttempts = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function getRateLimitRecord(key: string): RateLimitRecord {
    const record = loginAttempts.get(key);
    if (!record) {
        return { attempts: 0, lockoutUntil: null };
    }
    return record;
}

function checkLockout(key: string): { locked: boolean; timeLeftMinutes: number } {
    const record = getRateLimitRecord(key);
    if (record.lockoutUntil) {
        if (Date.now() < record.lockoutUntil) {
            return { locked: true, timeLeftMinutes: Math.ceil((record.lockoutUntil - Date.now()) / 60000) };
        } else {
            // Lockout expired, reset
            record.attempts = 0;
            record.lockoutUntil = null;
            loginAttempts.set(key, record);
        }
    }
    return { locked: false, timeLeftMinutes: 0 };
}

function recordLoginFailure(key: string) {
    const record = getRateLimitRecord(key);
    record.attempts += 1;
    if (record.attempts >= MAX_ATTEMPTS) {
        record.lockoutUntil = Date.now() + LOCKOUT_DURATION;
    }
    loginAttempts.set(key, record);
}

function clearLoginAttempts(key: string) {
    loginAttempts.delete(key);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const validation = loginSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { email, password, hcaptchaToken } = validation.data;

        const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "127.0.0.1";
        const emailKey = email.toLowerCase();

        // Check lockouts
        const emailLock = checkLockout(emailKey);
        if (emailLock.locked) {
            return NextResponse.json(
                { message: `Too many failed attempts. This account is locked. Please try again in ${emailLock.timeLeftMinutes} minute(s).` },
                { status: 429 }
            );
        }

        const ipLock = checkLockout(ip);
        if (ipLock.locked) {
            return NextResponse.json(
                { message: `Too many failed attempts from your IP. Please try again in ${ipLock.timeLeftMinutes} minute(s).` },
                { status: 429 }
            );
        }

        // Verify hCaptcha
        const isHuman = await verifyHcaptcha(hcaptchaToken);
        if (!isHuman) {
            return NextResponse.json(
                { message: "Captcha verification failed. Please try again." },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            recordLoginFailure(emailKey);
            recordLoginFailure(ip);
            return NextResponse.json(
                { message: "Invalid email or password" },
                { status: 401 }
            );
        }

        if (user.is_banned) {
            return NextResponse.json(
                { message: "ACCOUNT_BANNED" },
                { status: 403 }
            );
        }

        if (!user.is_active) {
            return NextResponse.json(
                { message: "Account is deactivated" },
                { status: 403 }
            );
        }

        const isPasswordValid = await argon2.verify(
            user.password,
            password
        );

        if (!isPasswordValid) {
            recordLoginFailure(emailKey);
            recordLoginFailure(ip);
            return NextResponse.json(
                { message: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Clear attempts on success
        clearLoginAttempts(emailKey);
        clearLoginAttempts(ip);

        const secret = new TextEncoder().encode(env.JWT_SECRET);

        const token = await new SignJWT({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("24h")
            .sign(secret);

        const response = NextResponse.json({
            message: "Login successful",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });

        response.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24,
            path: "/",
        });

        return response;

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { message: "Server error" },
            { status: 500 }
        );
    }
}