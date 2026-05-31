import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

/**
 * POST /api/admin/novels/:id/reactivate
 * Admin reactivates a deactivated novel
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const novelId = parseInt(id);
    if (isNaN(novelId)) {
      return NextResponse.json({ message: "Invalid novel ID" }, { status: 400 });
    }

    const novel = await prisma.novel.update({
      where: { id: novelId },
      data: { is_active: true },
    });

    // Log admin action
    await prisma.auditLog.create({
      data: {
        admin_id: user.id,
        action: "REACTIVATE_NOVEL",
        target_type: "NOVEL",
        target_id: novelId,
      },
    }).catch(() => {});

    return NextResponse.json(
      { message: "Novel reactivated successfully", novel },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
