"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MyNovelsPage() {
    const [novels, setNovels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNovels = async () => {
            try {
                const res = await axios.get("/api/novels?type=my-novels");
                setNovels(res.data.novels);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchNovels();
    }, []);

    if (loading) return <div className="p-10 text-center text-slate-300">Loading...</div>;

    return (
        <div className="max-w-6xl mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8 gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold text-white">My Novels</h1>
                    <p className="text-slate-400 text-sm mt-1">Manage, revise, and resubmit your stories.</p>
                </div>
                <Link href="/my-novels/create">
                    <Button>+ Create New Novel</Button>
                </Link>
            </div>

            {novels.length === 0 ? (
                <Card className="border-slate-800 bg-slate-950/70">
                    <CardContent className="p-10 text-center text-slate-400">
                        You haven't created any novels yet.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {novels.map(novel => (
                        <Card key={novel.id} className="overflow-hidden border-slate-800 bg-slate-950/80">
                            <div className="h-48 bg-slate-900 relative">
                                {novel.cover_image && <img src={novel.cover_image} alt="Cover" className="w-full h-full object-cover" />}
                                {novel.is_mature && <Badge variant="destructive" className="absolute top-2 right-2">Mature</Badge>}
                            </div>
                            <CardHeader className="space-y-2">
                                <CardTitle className="text-white text-xl">{novel.title}</CardTitle>
                                <CardDescription className="text-slate-400 line-clamp-3">{novel.synopsis}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between border-t border-slate-800 pt-4 mt-0">
                                <span className="text-sm text-slate-400">{novel._count?.chapters || 0} Chapters</span>
                                <Link href={`/my-novels/${novel.id}/write`}>
                                    <Button variant="soft">Manage / Write</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
