import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import prisma from "@/lib/db";
import { env } from "@/lib/env";
import { z } from "zod";

const registerSchema = z.object({
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(50, "Username must be at most 50 characters"),
    email: z.string().email("Invalid email format"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    date_of_birth: z.string().min(1, "Date of birth is required"),
    hcaptchaToken: z.string().min(1, "Please complete the captcha"),
    profile_image: z.string().url("Profile image must be a valid URL").optional().or(z.literal("")),
});

async function verifyHcaptcha(token: string): Promise<boolean> {
    const response = await fetch("https://api.hcaptcha.com/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${env.HCAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();
    return Boolean(data.success);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const validation = registerSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { username, email, password, date_of_birth, hcaptchaToken, profile_image } = validation.data;

        const isHuman = await verifyHcaptcha(hcaptchaToken);
        if (!isHuman) {
            return NextResponse.json(
                { message: "Captcha verification failed. Please try again." },
                { status: 400 }
            );
        }

        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
            return NextResponse.json(
                { message: "An account with this email already exists" },
                { status: 400 }
            );
        }

        const existingUsername = await prisma.user.findUnique({ where: { username } });
        if (existingUsername) {
            return NextResponse.json(
                { message: "Username already exists" },
                { status: 400 }
            );
        }

        const hashedPassword = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 3,
            parallelism: 2,
        });

        await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
                profile_image: profile_image || null,
                role: "USER"
            }
        });

        return NextResponse.json(
            { message: "Account created successfully" },
            { status: 201 }
        );

    } catch (error: any) {
        console.error(error);
        return NextResponse.json(
            { message: "Server error" },
            { status: 500 }
        );
    }
}