import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import { z } from "zod";

const trackSchema = z.object({
  novel_id: z.number().int().positive(),
  chapter_id: z.number().int().positive(),
  duration_seconds: z.number().int().min(0).default(0),
  emotions_encountered: z.array(z.string()).optional().default([]),
});

/**
 * POST /api/user-behavior/track-reading
 * Record user reading behavior for recommendations and analytics
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = trackSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { novel_id, chapter_id, duration_seconds, emotions_encountered } =
      validation.data;

    // Import helper
    const { aggregateUserPreferenceProfile } = require("@/lib/recommendations");

    // 1. Record reading event in UserReadingEvent table
    await prisma.userReadingEvent.create({
      data: {
        user_id: user.id,
        novel_id,
        chapter_id,
        duration_seconds,
        emotions_encountered,
      }
    });

    // 2. Update or create reading history entry
    const readingHistoryEntry = await prisma.readingHistory.upsert({
      where: {
        user_id_novel_id: {
          user_id: user.id,
          novel_id,
        },
      },
      update: {
        chapter_id,
        last_read_at: new Date(),
      },
      create: {
        user_id: user.id,
        novel_id,
        chapter_id,
        paragraph_index: 0,
        last_read_at: new Date(),
      },
    });

    // 3. Trigger aggregation background job (sync-in-line)
    await aggregateUserPreferenceProfile(user.id);

    return NextResponse.json(
      {
        message: "Reading behavior tracked",
        entry: readingHistoryEntry,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
