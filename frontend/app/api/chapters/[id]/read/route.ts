import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const chapterId = parseInt(id);

        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterId },
            include: { novel: { select: { title: true } } }
        });

        if (!chapter) {
            return NextResponse.json({ message: "Chapter not found" }, { status: 404 });
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
