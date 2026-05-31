import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromToken(req);
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
        }

        // Server-side validation
        // 1. Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ message: "File size exceeds the 2MB limit" }, { status: 400 });
        }

        // 2. Check file type
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ message: "Invalid file type. Only JPG, PNG, and WEBP are allowed" }, { status: 400 });
        }

        // Prepare file storage
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = path.join(process.cwd(), "public", "uploads", "profile-images");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Clean extension to avoid vulnerability, fallback to .jpg
        let ext = path.extname(file.name).toLowerCase();
        if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
            if (file.type === "image/png") ext = ".png";
            else if (file.type === "image/webp") ext = ".webp";
            else ext = ".jpg";
        }

        const filename = `avatar-${user.id}-${Date.now()}${ext}`;
        const filePath = path.join(uploadDir, filename);

        // Delete old profile image if it exists and is local
        try {
            const currentUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { profile_image: true }
            });
            if (currentUser?.profile_image && currentUser.profile_image.startsWith("/uploads/profile-images/")) {
                const oldFilePath = path.join(process.cwd(), "public", currentUser.profile_image);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }
        } catch (e) {
            console.error("Failed to delete old avatar file:", e);
        }

        // Write file
        await fs.promises.writeFile(filePath, buffer);

        const imageUrl = `/uploads/profile-images/${filename}`;

        // Update database
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { profile_image: imageUrl },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                date_of_birth: true,
                profile_image: true,
                created_at: true
            }
        });

        return NextResponse.json({
            message: "Profile image uploaded successfully",
            user: updatedUser,
            profile_image: imageUrl
        }, { status: 200 });

    } catch (error) {
        console.error("Profile image upload error:", error);
        return NextResponse.json({ message: "Server error during upload" }, { status: 500 });
    }
}
