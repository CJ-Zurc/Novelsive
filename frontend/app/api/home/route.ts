import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromToken(req);

        if (user) {
            // For Logged-In Users: Only return their ReadingHistory and Newly Updated from history
            const history = await prisma.readingHistory.findMany({
                where: { user_id: user.id },
                include: {
                    novel: {
                        include: {
                            genres: true,
                            author: { select: { username: true } },
                            ratings: { select: { score: true } },
                            chapters: {
                                where: { status: "PUBLISHED" },
                                orderBy: { created_at: "desc" },
                                take: 1
                            }
                        }
                    },
                    chapter: { select: { id: true, order_index: true, title: true } }
                },
                orderBy: { last_read_at: "desc" }
            });

            // Format history items in the original ReadingHistory nested structure
            const formattedHistory = history.map(h => {
                const n = h.novel;
                const avg = n.ratings && n.ratings.length > 0 
                    ? n.ratings.reduce((a: number, c: { score: number }) => a + c.score, 0) / n.ratings.length 
                    : 0;
                return {
                    id: h.id,
                    user_id: h.user_id,
                    novel_id: h.novel_id,
                    chapter_id: h.chapter_id,
                    paragraph_index: h.paragraph_index,
                    last_read_at: h.last_read_at,
                    novel: {
                        id: n.id,
                        title: n.title,
                        cover_image: n.cover_image,
                        synopsis: n.synopsis,
                        is_mature: n.is_mature,
                        author: n.author,
                        averageRating: avg,
                        genres: n.genres
                    },
                    chapter: h.chapter
                };
            });

            // Newly Updated from history: novels in history where a chapter was published after last_read_at
            const newlyUpdatedHistory = history
                .filter(h => {
                    const latestChapter = h.novel.chapters[0];
                    return latestChapter && new Date(latestChapter.created_at) > new Date(h.last_read_at);
                })
                .map(h => {
                    const n = h.novel;
                    const avg = n.ratings && n.ratings.length > 0 
                        ? n.ratings.reduce((a: number, c: { score: number }) => a + c.score, 0) / n.ratings.length 
                        : 0;
                    return {
                        id: h.id,
                        user_id: h.user_id,
                        novel_id: h.novel_id,
                        chapter_id: h.chapter_id,
                        paragraph_index: h.paragraph_index,
                        last_read_at: h.last_read_at,
                        novel: {
                            id: n.id,
                            title: n.title,
                            cover_image: n.cover_image,
                            is_mature: n.is_mature,
                            author: n.author,
                            averageRating: avg,
                            genres: n.genres,
                            synopsis: n.synopsis
                        },
                        chapter: h.chapter,
                        latestChapterPublishAt: h.novel.chapters[0].created_at
                    };
                });

            return NextResponse.json({
                history: formattedHistory,
                newlyUpdatedHistory
            });
        }

        // For Guest (Logged Out) Users: Return the standard landing public feeds
        // Fetch Top Viewed
        const topViewed = await prisma.novel.findMany({
            where: { is_active: true },
            orderBy: { view_count: "desc" },
            take: 10,
            include: { genres: true, author: { select: { username: true } }, ratings: { select: { score: true } } }
        });

        // Fetch Newly Updated
        const newlyUpdated = await prisma.novel.findMany({
            where: { is_active: true },
            orderBy: { created_at: "desc" },
            take: 10,
            include: { genres: true, author: { select: { username: true } }, ratings: { select: { score: true } } }
        });

        // Fetch Top Rated (Using JS sort since we don't have avg stored directly)
        const allForRating = await prisma.novel.findMany({
            where: { is_active: true },
            include: { genres: true, author: { select: { username: true } }, ratings: { select: { score: true } } }
        });

        const topRated = allForRating
            .map(novel => {
                const avg = novel.ratings.length > 0 
                    ? novel.ratings.reduce((a, c) => a + c.score, 0) / novel.ratings.length 
                    : 0;
                return { ...novel, averageRating: avg };
            })
            .sort((a, b) => b.averageRating - a.averageRating)
            .slice(0, 10);

        // Format novels to include averageRating
        const formatNovels = (arr: any[]) => arr.map(n => ({
            ...n,
            averageRating: n.ratings ? (n.ratings.length > 0 ? n.ratings.reduce((a:any, c:any) => a + c.score, 0) / n.ratings.length : 0) : n.averageRating,
            ratings: undefined
        }));

        return NextResponse.json({
            topViewed: formatNovels(topViewed),
            newlyUpdated: formatNovels(newlyUpdated),
            topRated: formatNovels(topRated),
            history: []
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
