import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserFromToken(req);
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        const chapterId = parseInt(id);
        const chapter = await prisma.chapter.findUnique({ 
            where: { id: chapterId },
            include: { novel: true }
        });
        
        if (!chapter || (chapter.novel.author_id !== user.id && user.role !== "ADMIN")) {
            return NextResponse.json({ message: "Chapter not found or unauthorized" }, { status: 403 });
        }

        const updated = await prisma.chapter.update({
            where: { id: chapterId },
            data: { status: "PENDING_REVIEW" }
        });

        return NextResponse.json({ message: "Chapter submitted for review", chapter: updated }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
