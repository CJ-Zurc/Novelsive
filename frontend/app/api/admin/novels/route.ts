import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const novels = await prisma.novel.findMany({
      include: {
        author: { select: { id: true, username: true } },
        genres: true,
        _count: { select: { chapters: true } },
      },
      orderBy: { created_at: "desc" },
      take: 200,
    });

    return NextResponse.json({ novels });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
