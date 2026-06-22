import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import { z } from "zod";

const createChapterSchema = z.object({
    title: z.string().min(1, "Chapter title is required"),
    slides: z.array(z.string()).min(1, "At least one slide is required"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserFromToken(req);
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        const novelId = parseInt(id);
        const novel = await prisma.novel.findUnique({ where: { id: novelId } });
        
        if (!novel || novel.author_id !== user.id) {
            return NextResponse.json({ message: "Novel not found or unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const validation = createChapterSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ message: validation.error.issues[0].message }, { status: 400 });
        }

        const { title, slides } = validation.data;
        const content = slides.join("\n\n---\n\n"); // join slides with separator

        // Get max order_index
        const lastChapter = await prisma.chapter.findFirst({
            where: { novel_id: novelId },
            orderBy: { order_index: "desc" }
        });
        const order_index = lastChapter ? lastChapter.order_index + 1 : 1;

        const chapter = await prisma.chapter.create({
            data: {
                novel_id: novelId,
                title,
                content,
                order_index,
                status: "DRAFT",
                paragraph_blocks: {
                    create: slides
                        .filter(s => s.trim())
                        .map((slideContent, idx) => ({
                            content: slideContent,
                            word_count: slideContent.trim().split(/\s+/).filter(Boolean).length,
                            block_index: idx,  // 0-based, consistent with NLP backend
                        }))
                }
            }
        });

        return NextResponse.json({ chapter }, { status: 201 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserFromToken(req);
        const { id } = await params;
        const novelId = parseInt(id);
        
        const novel = await prisma.novel.findUnique({ where: { id: novelId } });
        if (!novel) return NextResponse.json({ message: "Not found" }, { status: 404 });

        const isAdmin = user?.role === "ADMIN";
        const isAuthor = user && novel.author_id === user.id;

        if (!novel.is_active && !isAdmin && !isAuthor) {
            return NextResponse.json({ message: "This novel is currently deactivated" }, { status: 403 });
        }

        const chapters = await prisma.chapter.findMany({
            where: {
                novel_id: novelId,
                ...(isAuthor ? {} : { status: "PUBLISHED" })
            },
            orderBy: { order_index: "asc" },
            select: {
                id: true,
                title: true,
                status: true,
                order_index: true,
                created_at: true,
                paragraph_blocks: {
                    orderBy: { block_index: "asc" },
                    select: { id: true, content: true, block_index: true }
                },
                reviews: {
                    orderBy: { reviewed_at: "desc" },
                    take: 1,
                    select: { action: true, rejection_reason: true, reviewed_at: true }
                }
            }
        });

        return NextResponse.json({ chapters });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
