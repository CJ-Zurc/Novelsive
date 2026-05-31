import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

/**
 * GET /api/admin/analytics
 * Fetch enriched platforms analytics for the admin dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // 1. Fetch Summary Stats
    const totalUsers = await prisma.user.count();
    const totalNovels = await prisma.novel.count();
    const totalChapters = await prisma.chapter.count();
    const totalComments = await prisma.comment.count({ where: {} }).catch(() => 0);

    // 2. Fetch Top 10 Novels by view count
    const topNovels = await prisma.novel.findMany({
      select: {
        id: true,
        title: true,
        view_count: true,
        author: { select: { username: true } },
        ratings: { select: { score: true } },
      },
      orderBy: { view_count: "desc" },
      take: 10,
    });

    const topNovelsFormatted = topNovels.map((n) => ({
      ...n,
      averageRating:
        n.ratings.length > 0
          ? n.ratings.reduce((a, c) => a + c.score, 0) / n.ratings.length
          : 0,
      ratings: undefined,
    }));

    // 3. Fetch Genre Distribution with actual counts
    const genreStatsRaw = await prisma.novelGenre.groupBy({
      by: ["genre"],
      _count: {
        novel_id: true,
      },
    });

    const genreStats = genreStatsRaw.map((g) => ({
      genre: g.genre,
      count: g._count.novel_id,
    }));

    // 4. Chapter status breakdown
    const chapterStatusRaw = await prisma.chapter.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    });

    const chapterStatusStats = chapterStatusRaw.map((c) => ({
      status: c.status,
      count: c._count.id,
    }));

    // 5. Daily new users over the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const newUsers = await prisma.user.findMany({
      where: {
        created_at: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        created_at: true,
      },
    });

    const userRegistrationsByDate: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      userRegistrationsByDate[dateStr] = 0;
    }

    newUsers.forEach((u) => {
      const dateStr = u.created_at.toISOString().split("T")[0];
      if (userRegistrationsByDate[dateStr] !== undefined) {
        userRegistrationsByDate[dateStr]++;
      }
    });

    const dailyNewUsers = Object.keys(userRegistrationsByDate)
      .map((date) => ({ date, count: userRegistrationsByDate[date] }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      summary: {
        totalUsers,
        totalNovels,
        totalChapters,
        totalComments,
      },
      topNovels: topNovelsFormatted,
      genreStats,
      chapterStatusStats,
      dailyNewUsers,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
