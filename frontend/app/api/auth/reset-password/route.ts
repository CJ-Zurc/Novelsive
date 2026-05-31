import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import prisma from "@/lib/db";
import { z } from "zod";

const resetSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const validation = resetSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { token, password } = validation.data;

        // Hash new password
        const hashedPassword = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 3,
            parallelism: 1,
        });

        const resetToken = await prisma.passwordResetToken.findFirst({
            where: {
                token_hash: token,
                used_at: null,
                expires_at: { gt: new Date() }
            }
        });

        if (!resetToken) {
            return NextResponse.json(
                { message: "Invalid or expired reset token" },
                { status: 400 }
            );
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetToken.user_id },
                data: { password: hashedPassword }
            }),
            prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used_at: new Date() }
            })
        ]);

        return NextResponse.json(
            { message: "Password reset successfully" },
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