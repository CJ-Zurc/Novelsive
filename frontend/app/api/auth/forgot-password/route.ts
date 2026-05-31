import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";
import prisma from "@/lib/db";
import { env } from "@/lib/env";
import { z } from "zod";

const forgotSchema = z.object({
    email: z.string().email("Invalid email format"),
});

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASSWORD,
    },
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const validation = forgotSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { email } = validation.data;

        const token = crypto.randomBytes(32).toString("hex");

        const user = await prisma.user.findUnique({ where: { email } });
        
        if (user) {
            await prisma.passwordResetToken.create({
                data: {
                    user_id: user.id,
                    token_hash: token,
                    expires_at: new Date(Date.now() + 60 * 60 * 1000)
                }
            });

            const resetLink = `${env.NEXT_PUBLIC_URL}/reset-password?token=${token}`;

            await transporter.sendMail({
                from: env.EMAIL_USER,
                to: email,
                subject: "Novelsive - Password Reset Request",
                html: `
                    <h2>Password Reset Request</h2>
                    <p>You requested to reset your password.</p>
                    <p>Click the link below to reset it. This link expires in 1 hour.</p>
                    <a href="${resetLink}" style="
                        background-color: #4F46E5;
                        color: white;
                        padding: 12px 24px;
                        text-decoration: none;
                        border-radius: 6px;
                        display: inline-block;
                        margin: 16px 0;
                    ">Reset Password</a>
                    <p>If you didn't request this, ignore this email.</p>
                `,
            });
        }

        return NextResponse.json(
            { message: "If that email exists, a reset link has been sent" },
            { status: 200 }
        );

    } catch (error: any) {
        console.error(error);
        return NextResponse.json(
            { message: "Server error" },
            { status: 500 }
        );
    }
}