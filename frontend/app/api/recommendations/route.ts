import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import { aggregateUserPreferenceProfile } from "@/lib/recommendations";

/**
 * GET /api/recommendations
 * Fetch personalized recommendations for a user based on:
 * - Reading history (genres, emotions)
 * - Favorite genres
 * - Previously read novels
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch or aggregate user preference profile
    let profile = await prisma.userPreferenceProfile.findUnique({
      where: { user_id: user.id }
    });

    if (!profile) {
      profile = await aggregateUserPreferenceProfile(user.id);
    }

    const favGenres = profile?.favorite_genres ? (profile.favorite_genres as string[]) : [];
    const favEmotion = profile?.favorite_emotion || null;
    const readNovelIds = profile?.read_novel_ids ? (profile.read_novel_ids as number[]) : [];

    // 2. Fetch candidate active novels that the user has not read yet
    const candidates = await prisma.novel.findMany({
      where: {
        is_active: true,
        id: { notIn: readNovelIds },
      },
      include: {
        genres: true,
        author: { select: { username: true } },
        ratings: { select: { score: true } },
        _count: { select: { chapters: true } },
        chapters: {
          select: {
            nlp_metadata: {
              select: { dominant_emotion: true }
            }
          }
        }
      },
      orderBy: { view_count: "desc" },
      take: 100, // retrieve a candidate pool
    });

    // 3. Score and rank candidates in memory
    const scored = candidates.map((novel) => {
      let score = 0;

      // A. Genre matching
      const novelGenres = novel.genres.map((g) => g.genre);
      const matchedGenresCount = novelGenres.filter((g) => favGenres.includes(g)).length;
      score += matchedGenresCount * 30; // 30 points per matching genre

      // B. Emotion matching
      if (favEmotion) {
        const matchesEmotion = novel.chapters.some(
          (ch) => ch.nlp_metadata?.dominant_emotion === favEmotion
        );
        if (matchesEmotion) {
          score += 50; // 50 points for matching favorite emotion
        }
      }

      // C. Average rating score
      const averageRating =
        novel.ratings.length > 0
          ? novel.ratings.reduce((sum, r) => sum + r.score, 0) / novel.ratings.length
          : 0;
      score += averageRating * 10; // up to 50 points for perfect 5-star rating

      // D. View count score (cap at 20 points)
      score += Math.min(novel.view_count / 20, 20);

      return {
        id: novel.id,
        author_id: novel.author_id,
        title: novel.title,
        synopsis: novel.synopsis,
        cover_image: novel.cover_image,
        title_image: novel.title_image,
        is_mature: novel.is_mature,
        is_active: novel.is_active,
        view_count: novel.view_count,
        created_at: novel.created_at,
        genres: novel.genres,
        author: novel.author,
        _count: novel._count,
        averageRating,
        recommendationScore: score
      };
    });

    // Sort by recommendationScore desc
    const sorted = scored
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 20);

    return NextResponse.json({
      recommendations: sorted,
      count: sorted.length,
      profile: {
        favorite_genres: favGenres,
        favorite_emotion: favEmotion
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
