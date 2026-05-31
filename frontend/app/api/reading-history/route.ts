import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromToken(req);
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { novel_id, chapter_id, paragraph_index } = body;

        if (!novel_id || !chapter_id || paragraph_index === undefined) {
            return NextResponse.json({ message: "Missing fields" }, { status: 400 });
        }

        const history = await prisma.readingHistory.upsert({
            where: {
                user_id_novel_id: {
                    user_id: user.id,
                    novel_id: novel_id
                }
            },
            update: {
                chapter_id,
                paragraph_index,
                last_read_at: new Date()
            },
            create: {
                user_id: user.id,
                novel_id,
                chapter_id,
                paragraph_index
            }
        });

        return NextResponse.json({ history }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromToken(req);
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const history = await prisma.readingHistory.findMany({
            where: { user_id: user.id },
            include: {
                novel: {
                    select: { id: true, title: true, cover_image: true, is_mature: true }
                },
                chapter: {
                    select: { id: true, title: true, order_index: true }
                }
            },
            orderBy: { last_read_at: 'desc' }
        });

        return NextResponse.json({ history }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
