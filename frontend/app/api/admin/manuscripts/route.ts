import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

/**
 * GET /api/admin/manuscripts
 * List all chapters with status "PENDING" for admin review
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const manuscripts = await prisma.chapter.findMany({
      where: { status: "PENDING_REVIEW" },
      include: {
        novel: {
          select: {
            id: true,
            title: true,
            cover_image: true,
            author_id: true,
            author: { select: { username: true, email: true } },
          },
        },
        _count: {
          select: { paragraph_blocks: true }
        }
      },
      orderBy: { created_at: "asc" },
      take: 100,
    });

    return NextResponse.json({ manuscripts });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
