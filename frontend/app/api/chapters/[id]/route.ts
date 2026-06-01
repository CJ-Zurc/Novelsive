import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import { z } from "zod";

const updateChapterSchema = z.object({
    title: z.string().min(1, "Chapter title is required"),
    slides: z.array(z.string()).min(1, "At least one slide is required"),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserFromToken(req);
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        const chapterId = parseInt(id);
        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterId },
            include: { novel: true },
        });

        if (!chapter || chapter.novel.author_id !== user.id) {
            return NextResponse.json({ message: "Chapter not found or unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const validation = updateChapterSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ message: validation.error.issues[0].message }, { status: 400 });
        }

        const { title, slides } = validation.data;
        const content = slides.join("\n\n---\n\n");

        // Delete old paragraph blocks and recreate from new slides
        await prisma.paragraphBlock.deleteMany({ where: { chapter_id: chapterId } });

        const nextStatus = chapter.status === "DRAFT" ? "DRAFT" : "PENDING_REVIEW";

        const updated = await prisma.chapter.update({
            where: { id: chapterId },
            data: {
                title,
                content,
                status: nextStatus,
                paragraph_blocks: {
                    create: slides
                        .filter(s => s.trim())
                        .map((slideContent, idx) => ({
                            content: slideContent,
                            word_count: slideContent.trim().split(/\s+/).filter(Boolean).length,
                            block_index: idx + 1,
                        }))
                }
            },
        });

        return NextResponse.json({ chapter: updated }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}