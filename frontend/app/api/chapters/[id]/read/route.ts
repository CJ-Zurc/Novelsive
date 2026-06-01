import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserFromToken(req);
        const { id } = await params;
        const chapterId = parseInt(id);

        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterId },
            include: { novel: { select: { title: true, author_id: true } } }
        });

        if (!chapter) {
            return NextResponse.json({ message: "Chapter not found" }, { status: 404 });
        }

        if (chapter.status !== "PUBLISHED") {
            const canBypass = Boolean(user && (user.role === "ADMIN" || chapter.novel.author_id === user.id));
            if (!canBypass) {
                return NextResponse.json({ message: "This chapter is currently disabled" }, { status: 423 });
            }
        }

        const blocks = await prisma.paragraphBlock.findMany({
            where: { chapter_id: chapterId },
            include: { emotion: true },
            orderBy: { block_index: "asc" }
        });

        return NextResponse.json({ chapter, blocks }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
