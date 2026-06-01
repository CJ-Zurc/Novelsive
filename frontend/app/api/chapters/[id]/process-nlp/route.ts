import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import axios from "axios";

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
            include: { novel: { include: { genres: true } } }
        });
        
        if (!chapter || (chapter.novel.author_id !== user.id && user.role !== "ADMIN")) {
            return NextResponse.json({ message: "Chapter not found or unauthorized" }, { status: 403 });
        }

        // 1. Call Node.js backend bridge to process NLP and get chunks
        let nlpResponse;
        try {
            const res = await axios.post("http://localhost:5000/api/nlp/analyze-chapter", {
                text: chapter.content
            });
            nlpResponse = res.data;
        } catch (err) {
            console.error("Backend bridge failed. Are you sure Node.js backend is running?", err);
            return NextResponse.json({ message: "NLP Processing failed" }, { status: 500 });
        }

        const { blocks } = nlpResponse;

        // 2. Clear existing blocks just in case it's a re-publish
        await prisma.paragraphEmotion.deleteMany({
            where: { paragraph_block: { chapter_id: chapterId } }
        });
        await prisma.paragraphBlock.deleteMany({
            where: { chapter_id: chapterId }
        });

        // 3. Save paragraph blocks and emotions
        for (const block of blocks) {
            const pb = await prisma.paragraphBlock.create({
                data: {
                    chapter_id: chapterId,
                    content: block.content,
                    word_count: block.word_count,
                    block_index: block.block_index
                }
            });

            await prisma.paragraphEmotion.create({
                data: {
                    paragraph_block_id: pb.id,
                    emotion_label: block.emotion_label,
                    confidence_score: block.confidence_score
                }
            });
        }

        // Also aggregate dominant emotion (mock implementation)
        const counts: Record<string, number> = {};
        for (const block of blocks) {
            counts[block.emotion_label] = (counts[block.emotion_label] || 0) + 1;
        }
        let dominant = "NEUTRAL";
        let maxCount = 0;
        for (const [emo, count] of Object.entries(counts)) {
            if (count > maxCount && emo !== "NEUTRAL") {
                maxCount = count;
                dominant = emo;
            }
        }

        await prisma.chapterNlpMetadata.upsert({
            where: { chapter_id: chapterId },
            update: { 
                dominant_emotion: dominant as any,
                genres: chapter.novel.genres.map(g => g.genre) || []
            },
            create: {
                chapter_id: chapterId,
                dominant_emotion: dominant as any,
                genres: chapter.novel.genres.map(g => g.genre) || [],
                tags: []
            }
        });

        return NextResponse.json({ message: "NLP Processing complete" }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
