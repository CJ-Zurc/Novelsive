import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

/**
 * POST /api/admin/manuscripts/:id/approve
 * Admin approves a manuscript and publishes it
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(req) as { id: number; role: string; username: string; email: string } | null;
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const chapterId = parseInt(id);
    if (isNaN(chapterId)) {
      return NextResponse.json({ message: "Invalid chapter ID" }, { status: 400 });
    }

    const chapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: { status: "PUBLISHED" },
      include: { novel: { select: { id: true, author_id: true } } },
    });

    // Create manuscript review entry in database
    await prisma.manuscriptReview.create({
      data: {
        chapter_id: chapterId,
        admin_id: user.id,
        action: "APPROVE",
      }
    });

    // Log admin action (audit trail)
    await prisma.auditLog.create({
      data: {
        admin_id: user.id,
        action: "APPROVE_MANUSCRIPT",
        target_type: "CHAPTER",
        target_id: chapterId,
      },
    }).catch(() => {}); // ignore if table doesn't exist yet

    return NextResponse.json(
      { message: "Manuscript approved and published", chapter },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
