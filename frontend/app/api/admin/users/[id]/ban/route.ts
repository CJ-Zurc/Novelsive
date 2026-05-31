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
        const targetUserId = parseInt(id);
        if (isNaN(targetUserId)) {
            return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
        }

        // Prevent self-ban
        if (targetUserId === user.id) {
            return NextResponse.json({ message: "Cannot ban your own administrator account" }, { status: 400 });
        }

        const targetUser = await prisma.user.update({
            where: { id: targetUserId },
            data: { is_banned: true }
        });

        // Write Audit Log
        await prisma.auditLog.create({
            data: {
                admin_id: user.id,
                action: "BAN_USER",
                target_type: "USER",
                target_id: targetUserId
            }
        }).catch((err) => {
            console.error("Failed to write audit log:", err);
        });

        return NextResponse.json({
            message: "User banned successfully",
            user: { id: targetUser.id, username: targetUser.username, is_banned: targetUser.is_banned }
        });

    } catch (error) {
        console.error("Ban user error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
