import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import { z } from "zod";

const createNovelSchema = z.object({
    title: z.string().min(1, "Title is required"),
    synopsis: z.string().min(10, "Synopsis must be at least 10 characters"),
    cover_image: z.string().min(1, "Cover image is required"),
    title_image: z.string().min(1, "Title image is required"),
    genres: z.array(z.string()).min(1, "Select at least one genre"),
    is_mature: z.boolean().default(false)
});

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromToken(req);
        if (!user) {
            return NextResponse.json({ message: "Unauthorized: Login required" }, { status: 403 });
        }

        const body = await req.json();
        const validation = createNovelSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ message: validation.error.issues[0].message }, { status: 400 });
        }

        const { title, synopsis, cover_image, title_image, genres, is_mature } = validation.data;

        const novel = await prisma.novel.create({
            data: {
                author_id: user.id,
                title,
                synopsis,
                cover_image,
                title_image,
                is_mature,
                is_active: is_mature ? false : true,
                genres: {
                    create: genres.map(g => ({ genre: g }))
                }
            }
        });

        return NextResponse.json({ novel }, { status: 201 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const type = url.searchParams.get("type");

        if (type === "my-novels") {
            const user = await getUserFromToken(req);
            if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

            const novels = await prisma.novel.findMany({
                where: { author_id: user.id },
                include: { _count: { select: { chapters: true } } },
                orderBy: { created_at: "desc" }
            });
            return NextResponse.json({ novels });
        }

        if (type === "trending") {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Group reading events in the last 7 days by novel_id
            const trendingEvents = await prisma.userReadingEvent.groupBy({
                by: ["novel_id"],
                where: {
                    created_at: {
                        gte: sevenDaysAgo
                    }
                },
                _count: {
                    id: true
                }
            });

            const eventCounts = new Map<number, number>();
            trendingEvents.forEach(e => {
                eventCounts.set(e.novel_id, e._count.id);
            });

            const novels = await prisma.novel.findMany({
                where: {
                    is_active: true,
                    chapters: { some: { status: "PUBLISHED" } }
                },
                include: {
                    genres: true,
                    author: { select: { username: true } },
                    ratings: { select: { score: true } },
                    _count: { select: { chapters: { where: { status: "PUBLISHED" } } } }
                }
            });

            const novelsWithRating = novels.map(n => {
                const avg = n.ratings && n.ratings.length > 0
                    ? n.ratings.reduce((a: number, c: { score: number }) => a + c.score, 0) / n.ratings.length
                    : 0;
                return {
                    ...n,
                    averageRating: avg,
                    trendingCount: eventCounts.get(n.id) || 0,
                    ratings: undefined
                };
            });

            novelsWithRating.sort((a, b) => {
                if (b.trendingCount !== a.trendingCount) {
                    return b.trendingCount - a.trendingCount;
                }
                return b.view_count - a.view_count;
            });

            return NextResponse.json({ novels: novelsWithRating });
        }

        // Public novels — only show novels that have at least one published chapter
        const novels = await prisma.novel.findMany({
            where: {
                is_active: true,
                chapters: { some: { status: "PUBLISHED" } }
            },
            include: {
                genres: true,
                author: { select: { username: true } },
                ratings: { select: { score: true } },
                _count: { select: { chapters: { where: { status: "PUBLISHED" } } } }
            },
            orderBy: { view_count: "desc" }
        });

        const novelsWithRating = novels.map(n => {
            const avg = n.ratings && n.ratings.length > 0
                ? n.ratings.reduce((a: number, c: { score: number }) => a + c.score, 0) / n.ratings.length
                : 0;
            return {
                ...n,
                averageRating: avg,
                ratings: undefined
            };
        });

        return NextResponse.json({ novels: novelsWithRating });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
