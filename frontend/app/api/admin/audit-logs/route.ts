import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromToken(req);
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
        }

        const auditLogs = await prisma.auditLog.findMany({
            orderBy: { created_at: "desc" },
            take: 100
        });

        // Resolve admin usernames in memory
        const adminIds = Array.from(new Set(auditLogs.map(log => log.admin_id)));
        const admins = await prisma.user.findMany({
            where: { id: { in: adminIds } },
            select: { id: true, username: true }
        });
        const adminMap = new Map(admins.map(a => [a.id, a.username]));

        const logs = auditLogs.map(log => ({
            ...log,
            admin_username: adminMap.get(log.admin_id) || `Admin #${log.admin_id}`
        }));

        return NextResponse.json({ logs }, { status: 200 });

    } catch (error) {
        console.error("Fetch audit logs error:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
