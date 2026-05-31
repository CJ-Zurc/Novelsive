import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import { authenticator } from "otplib";
import qrcode from "qrcode";
import { env } from "@/lib/env";

authenticator.options = { window: 1 };

export async function GET(req: NextRequest) {
    try {
        const userToken = await getUserFromToken(req);
        if (!userToken) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { id: Number(userToken.id) } });
        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

        const payload: any = { mfaEnabled: Boolean(user.mfa_enabled) };
        if (user.mfa_temp_secret) {
            const manual = user.mfa_temp_secret;
            const uri = authenticator.keyuri(user.email, "Novelsive", manual);
            const qr = await qrcode.toDataURL(uri);
            payload.setup = { qr, manual };
        }

        return NextResponse.json(payload);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const userToken = await getUserFromToken(req);
        if (!userToken) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { id: Number(userToken.id) } });
        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

        const body = await req.json();
        const action = body.action as string | undefined;

        if (action === "setup") {
            const temp = authenticator.generateSecret();
            await prisma.user.update({ where: { id: user.id }, data: { mfa_temp_secret: temp } });
            const uri = authenticator.keyuri(user.email, "Novelsive", temp);
            const qr = await qrcode.toDataURL(uri);
            return NextResponse.json({ setup: { qr, manual: temp } });
        }

        if (action === "confirm") {
            const code = body.code as string | undefined;
            if (!code || !user.mfa_temp_secret) return NextResponse.json({ message: "Invalid request" }, { status: 400 });
            const valid = authenticator.check(code, user.mfa_temp_secret);
            if (!valid) return NextResponse.json({ message: "Invalid code" }, { status: 401 });
            await prisma.user.update({ where: { id: user.id }, data: { mfa_secret: user.mfa_temp_secret, mfa_temp_secret: null, mfa_enabled: true } });
            return NextResponse.json({ message: "MFA enabled" });
        }

        if (action === "disable") {
            await prisma.user.update({ where: { id: user.id }, data: { mfa_enabled: false, mfa_secret: null, mfa_temp_secret: null } });
            return NextResponse.json({ message: "MFA disabled" });
        }

        return NextResponse.json({ message: "Unknown action" }, { status: 400 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

