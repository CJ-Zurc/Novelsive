import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserFromToken(req);
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const novelId = parseInt(id);
        const body = await req.json();
        const { score } = body;

        if (typeof score !== "number" || score < 1 || score > 5) {
            return NextResponse.json({ message: "Invalid rating score" }, { status: 400 });
        }

        const rating = await prisma.rating.upsert({
            where: {
                user_id_novel_id: {
                    user_id: user.id,
                    novel_id: novelId
                }
            },
            update: {
                score
            },
            create: {
                user_id: user.id,
                novel_id: novelId,
                score
            }
        });

        // Recalculate average and return
        const allRatings = await prisma.rating.findMany({
            where: { novel_id: novelId },
            select: { score: true }
        });
        const average = allRatings.reduce((acc, curr) => acc + curr.score, 0) / allRatings.length;

        return NextResponse.json({ rating, average }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
