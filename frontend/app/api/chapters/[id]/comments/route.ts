import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const chapterId = parseInt(id);
        const comments = await prisma.comment.findMany({
            where: { chapter_id: chapterId },
            include: {
                user: { select: { username: true, profile_image: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        return NextResponse.json({ comments });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserFromToken(req);
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const chapterId = parseInt(id);
        const body = await req.json();
        const { content } = body;

        if (!content || typeof content !== "string" || content.trim() === "") {
            return NextResponse.json({ message: "Comment content is required" }, { status: 400 });
        }

        const comment = await prisma.comment.create({
            data: {
                user_id: user.id,
                chapter_id: chapterId,
                content: content.trim()
            },
            include: {
                user: { select: { username: true, profile_image: true } }
            }
        });

        return NextResponse.json({ comment }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
