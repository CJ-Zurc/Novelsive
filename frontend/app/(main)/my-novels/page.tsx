"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";

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

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="max-w-6xl mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">My Novels</h1>
                <Link href="/my-novels/create" className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">
                    + Create New Novel
                </Link>
            </div>

            {novels.length === 0 ? (
                <div className="bg-white p-10 rounded shadow text-center text-gray-500">
                    You haven't created any novels yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {novels.map(novel => (
                        <div key={novel.id} className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden flex flex-col">
                            <div className="h-48 bg-gray-200 relative">
                                {novel.cover_image && <img src={novel.cover_image} alt="Cover" className="w-full h-full object-cover" />}
                                {novel.is_mature && <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">MATURE</span>}
                            </div>
                            <div className="p-4 flex-grow flex flex-col justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold mb-2">{novel.title}</h2>
                                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{novel.synopsis}</p>
                                </div>
                                <div className="flex justify-between items-center border-t pt-4 mt-4">
                                    <span className="text-sm text-gray-500">{novel._count?.chapters || 0} Chapters</span>
                                    <Link href={`/my-novels/${novel.id}/write`} className="text-blue-600 font-medium hover:underline">
                                        Manage / Write
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
