import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import { z } from "zod";
import { env } from "@/lib/env";

const rejectSchema = z.object({
  rejection_title: z.string().min(5, "Title must be at least 5 characters"),
  rejection_reason: z.string().min(10, "Reason must be at least 10 characters"),
});

/**
 * POST /api/admin/manuscripts/:id/reject
 * Admin rejects a manuscript with a rejection reason
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

    const body = await req.json();
    const validation = rejectSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { rejection_title, rejection_reason } = validation.data;

    const chapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: { 
        status: "REJECTED",
      },
      include: { novel: { select: { id: true, author_id: true, author: { select: { email: true } } } } },
    });

    // Create manuscript review entry in database
    await prisma.manuscriptReview.create({
      data: {
        chapter_id: chapterId,
        admin_id: user.id,
        action: "REJECT",
        rejection_reason: `${rejection_title}\n${rejection_reason}`,
      }
    });

    // Log admin action (audit trail)
    await prisma.auditLog.create({
      data: {
        admin_id: user.id,
        action: "REJECT_MANUSCRIPT",
        target_type: "CHAPTER",
        target_id: chapterId,
      },
    }).catch(() => {}); // ignore if table doesn't exist yet

    // Notify backend socket server to push a real-time notification to the author
    try {
      await fetch(`${env.BACKEND_URL}/api/notify`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-notify-secret": process.env.BACKEND_NOTIFY_SECRET || process.env.NOTIFY_SECRET || "",
        },
        body: JSON.stringify({
          userId: chapter.novel.author_id,
          type: "manuscript_rejected",
          payload: {
            chapterId,
            rejection_title,
            rejection_reason,
          },
        }),
      });
    } catch (err) {
      console.error("Notify backend failed", err);
    }

    return NextResponse.json(
      { message: "Manuscript rejected and author notified", chapter },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
