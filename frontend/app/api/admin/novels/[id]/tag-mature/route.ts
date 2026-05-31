import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

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

        // Set is_mature = true AND admin_locked = true
        const novel = await prisma.novel.update({
            where: { id: novelId },
            data: {
                is_mature: true,
                admin_locked: true
            }
        });

        // Log admin action to AuditLog
        await prisma.auditLog.create({
            data: {
                admin_id: user.id,
                action: "TAG_MATURE_LOCK",
                target_type: "NOVEL",
                target_id: novelId
            }
        }).catch((err) => {
            console.error("Failed to write audit log:", err);
        });

        return NextResponse.json({
            message: "Novel locked as mature by admin",
            novel
        }, { status: 200 });

    } catch (error) {
        console.error("Tag mature error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
