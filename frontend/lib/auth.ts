import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { env } from "./env";

export interface UserToken {
    id: number;
    username: string;
    email: string;
    role: string;
}

export async function getUserFromToken(req: NextRequest): Promise<UserToken | null> {
    const token = req.cookies.get("token")?.value;
    if (!token) return null;

    try {
        const secret = new TextEncoder().encode(env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        return payload as unknown as UserToken;
    } catch {
        return null;
    }
}