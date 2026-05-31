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
            where: {
                is_mature: true,
                is_active: false
            },
            include: {
                author: { select: { id: true, username: true } },
                genres: true
            },
            orderBy: { created_at: "asc" }
        });

        return NextResponse.json({ novels }, { status: 200 });

    } catch (error) {
        console.error("Fetch pending mature novels error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
