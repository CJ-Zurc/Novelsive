import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";
import { getUserFromToken } from "@/lib/auth";

const updateProfileSchema = z.object({
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(50, "Username must be at most 50 characters"),
    email: z.string().email("Invalid email format"),
    date_of_birth: z.string().optional(),
});


// GET - fetch current user profile
export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromToken(req);
        if (!user) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const profile = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                date_of_birth: true,
                profile_image: true,
                created_at: true
            }
        });

        if (!profile) {
            const response = NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
            response.cookies.delete("token");
            return response;
        }

        return NextResponse.json({ user: profile });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { message: "Server error" },
            { status: 500 }
        );
    }
}

// PUT - update user profile
export async function PUT(req: NextRequest) {
    try {
        const user = await getUserFromToken(req);
        if (!user) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();

        const validation = updateProfileSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { username, email, date_of_birth } = validation.data;

        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ],
                NOT: {
                    id: user.id
                }
            }
        });

        if (existing) {
            return NextResponse.json(
                { message: "Email or username already taken" },
                { status: 400 }
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                username,
                email,
                date_of_birth: date_of_birth ? new Date(date_of_birth) : null
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                date_of_birth: true,
                profile_image: true,
                created_at: true
            }
        });

        return NextResponse.json({
            message: "Profile updated successfully",
            user: updatedUser,
        });

    } catch (error: any) {
        console.error(error);
        return NextResponse.json(
            { message: "Server error" },
            { status: 500 }
        );
    }
}