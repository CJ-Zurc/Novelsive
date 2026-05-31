import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import { z } from "zod";

const updateNovelSchema = z.object({
    title: z.string().min(1, "Title is required").optional(),
    synopsis: z.string().min(10, "Synopsis must be at least 10 characters").optional(),
    cover_image: z.string().min(1, "Cover image is required").optional(),
    title_image: z.string().min(1, "Title image is required").optional(),
    genres: z.array(z.string()).min(1, "Select at least one genre").optional(),
    is_mature: z.boolean().optional()
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const novelId = parseInt(id);
        if (isNaN(novelId)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

        const novel = await prisma.novel.findUnique({
            where: { id: novelId },
            include: {
                author: { select: { username: true } },
                genres: true,
                chapters: {
                    where: { status: "PUBLISHED" },
                    orderBy: { order_index: "asc" },
                    select: { id: true, title: true, created_at: true, order_index: true }
                },
                ratings: { select: { score: true } }
            }
        });

        if (!novel) return NextResponse.json({ message: "Novel not found" }, { status: 404 });

        // Calculate average rating
        const avgRating = novel.ratings.length > 0 
            ? novel.ratings.reduce((acc, curr) => acc + curr.score, 0) / novel.ratings.length 
            : 0;

        return NextResponse.json({ 
            novel: {
                ...novel,
                averageRating: avgRating,
                ratings: undefined // don't send all rating objects
            }
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getUserFromToken(req);
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const novelId = parseInt(id);
        if (isNaN(novelId)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

        const existingNovel = await prisma.novel.findUnique({
            where: { id: novelId },
            include: { genres: true }
        });

        if (!existingNovel) return NextResponse.json({ message: "Novel not found" }, { status: 404 });

        // Check if user is the author or admin
        if (existingNovel.author_id !== user.id && user.role !== "ADMIN") {
            return NextResponse.json({ message: "Forbidden: You are not the author" }, { status: 403 });
        }

        const body = await req.json();
        const validation = updateNovelSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ message: validation.error.issues[0].message }, { status: 400 });
        }

        const { title, synopsis, cover_image, title_image, genres, is_mature } = validation.data;

        // Mature lock check
        if (existingNovel.admin_locked && is_mature === false) {
            return NextResponse.json({ message: "This novel is locked as mature by an administrator and cannot be made non-mature." }, { status: 400 });
        }

        // Prepare data to update
        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (synopsis !== undefined) updateData.synopsis = synopsis;
        if (cover_image !== undefined) updateData.cover_image = cover_image;
        if (title_image !== undefined) updateData.title_image = title_image;
        if (is_mature !== undefined) updateData.is_mature = is_mature;

        // If genres is updated, recreate relationships
        if (genres !== undefined) {
            await prisma.novelGenre.deleteMany({
                where: { novel_id: novelId }
            });
            updateData.genres = {
                create: genres.map(g => ({ genre: g }))
            };
        }

        const updatedNovel = await prisma.novel.update({
            where: { id: novelId },
            data: updateData
        });

        return NextResponse.json({ novel: updatedNovel });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
