import prisma from "@/lib/db";

export async function aggregateUserPreferenceProfile(userId: number) {
    try {
        // 1. Get user's reading history (all unique novel IDs they read)
        const history = await prisma.readingHistory.findMany({
            where: { user_id: userId },
            select: { novel_id: true },
            distinct: ["novel_id"]
        });
        const readNovelIds = history.map((h) => h.novel_id);

        // 2. Fetch genres of novels the user has read
        const genres = await prisma.novelGenre.findMany({
            where: { novel_id: { in: readNovelIds } },
            select: { genre: true }
        });

        // Count frequencies of each genre
        const genreCounts: Record<string, number> = {};
        for (const g of genres) {
            genreCounts[g.genre] = (genreCounts[g.genre] || 0) + 1;
        }

        // Sort and select top genres (up to 5)
        const favoriteGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .map((entry) => entry[0])
            .slice(0, 5);

        // 3. Fetch emotions encountered from reading events
        const events = await prisma.userReadingEvent.findMany({
            where: { user_id: userId },
            select: { emotions_encountered: true }
        });

        const emotionCounts: Record<string, number> = {};
        for (const ev of events) {
            const emotions = (ev.emotions_encountered as string[]) || [];
            for (const emo of emotions) {
                if (emo && emo !== "NEUTRAL") {
                    emotionCounts[emo] = (emotionCounts[emo] || 0) + 1;
                }
            }
        }

        // Sort emotions by count and get dominant favorite emotion
        const sortedEmotions = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
        const favoriteEmotion = sortedEmotions.length > 0 ? sortedEmotions[0][0] : null;

        // 4. Upsert UserPreferenceProfile
        const profile = await prisma.userPreferenceProfile.upsert({
            where: { user_id: userId },
            update: {
                favorite_genres: favoriteGenres,
                favorite_emotion: favoriteEmotion as any,
                read_novel_ids: readNovelIds,
                updated_at: new Date()
            },
            create: {
                user_id: userId,
                favorite_genres: favoriteGenres,
                favorite_emotion: favoriteEmotion as any,
                read_novel_ids: readNovelIds
            }
        });

        return profile;

    } catch (error) {
        console.error(`Failed to aggregate preference profile for user ${userId}:`, error);
        return null;
    }
}
