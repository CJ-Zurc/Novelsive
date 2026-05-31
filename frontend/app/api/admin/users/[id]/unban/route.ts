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

        const targetUser = await prisma.user.update({
            where: { id: targetUserId },
            data: { is_banned: false }
        });

        // Write Audit Log
        await prisma.auditLog.create({
            data: {
                admin_id: user.id,
                action: "UNBAN_USER",
                target_type: "USER",
                target_id: targetUserId
            }
        }).catch((err) => {
            console.error("Failed to write audit log:", err);
        });

        return NextResponse.json({
            message: "User unbanned successfully",
            user: { id: targetUser.id, username: targetUser.username, is_banned: targetUser.is_banned }
        });

    } catch (error) {
        console.error("Unban user error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
