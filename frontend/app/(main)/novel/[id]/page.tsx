"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";

export default function NovelProfilePage() {
    const params = useParams();
    const novelId = params.id as string;
    const [novel, setNovel] = useState<any>(null);
    const [history, setHistory] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Rating state
    const [hoverRating, setHoverRating] = useState(0);
    const [userRating, setUserRating] = useState(0);

    useEffect(() => {
        const fetchNovelAndHistory = async () => {
            try {
                const res = await axios.get(`/api/novels/${novelId}`);
                setNovel(res.data.novel);

                // Try fetching reading history (will fail if not logged in, which is fine)
                try {
                    const histRes = await axios.get("/api/reading-history");
                    const myHistory = histRes.data.history.find((h: any) => h.novel_id === parseInt(novelId));
                    if (myHistory) setHistory(myHistory);
                } catch (e) {
                    // Not logged in
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchNovelAndHistory();
    }, [novelId]);

    const handleRate = async (score: number) => {
        try {
            const res = await axios.post(`/api/novels/${novelId}/rating`, { score });
            setUserRating(score);
            setNovel((prev: any) => ({ ...prev, averageRating: res.data.average }));
            alert("Rating submitted!");
        } catch (err: any) {
            if (err.response?.status === 401) {
                alert("You must be logged in to rate.");
            } else {
                alert("Failed to submit rating.");
            }
        }
    };

    if (loading) return <div className="p-10 text-center">Loading novel profile...</div>;
    if (!novel) return <div className="p-10 text-center text-red-500">Novel not found.</div>;

    const firstChapterId = novel.chapters[0]?.id;

    return (
        <div className="max-w-5xl mx-auto py-10 px-4 flex flex-col md:flex-row gap-10">
            {/* Sidebar / Cover */}
            <div className="w-full md:w-1/3 flex flex-col items-center">
                <div className="w-full aspect-[2/3] bg-gray-200 rounded-lg overflow-hidden shadow-lg mb-6 relative">
                    <img src={novel.cover_image} alt="Cover" className={`w-full h-full object-cover ${novel.is_mature ? 'blur-md' : ''}`} />
                </div>
                <div className="w-full bg-white p-4 rounded-lg shadow border border-gray-100 text-center mb-6">
                    <div className="text-3xl text-yellow-400 mb-2 font-bold">★ {novel.averageRating.toFixed(1)}</div>
                    <p className="text-gray-500 text-sm">Average Rating</p>
                </div>
                
                {/* Rating Widget */}
                <div className="w-full bg-white p-4 rounded-lg shadow border border-gray-100 text-center">
                    <p className="text-sm font-bold text-gray-700 mb-2">Rate this novel</p>
                    <div className="flex justify-center space-x-1">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button 
                                key={star}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => handleRate(star)}
                                className="text-3xl focus:outline-none transition-colors"
                            >
                                <span className={(hoverRating || userRating) >= star ? "text-yellow-400" : "text-gray-300"}>★</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Info */}
            <div className="w-full md:w-2/3">
                <h1 className="text-4xl font-bold mb-2">{novel.title}</h1>
                <p className="text-lg text-gray-600 mb-4 border-b pb-4">
                    By <span className="font-semibold text-gray-900">{novel.author.username}</span>
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                    {novel.genres.map((g: any) => (
                        <span key={g.genre} className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
                            {g.genre}
                        </span>
                    ))}
                    {novel.is_mature && <span className="bg-red-100 text-red-800 text-sm font-bold px-3 py-1 rounded-full">MATURE</span>}
                </div>

                <div className="mb-8">
                    <h3 className="text-xl font-bold mb-3">Synopsis</h3>
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">{novel.synopsis}</p>
                </div>

                <div className="mb-8 flex space-x-4">
                    {history ? (
                        <Link href={`/read/${novel.id}/chapter/${history.chapter_id}?p=${history.paragraph_index}`} 
                            className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold shadow hover:bg-indigo-700 transition">
                            Continue Reading
                        </Link>
                    ) : firstChapterId ? (
                        <Link href={`/read/${novel.id}/chapter/${firstChapterId}`} 
                            className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow hover:bg-blue-700 transition">
                            Start Reading
                        </Link>
                    ) : (
                        <button disabled className="bg-gray-300 text-white px-8 py-3 rounded-full font-bold cursor-not-allowed">
                            No Chapters Yet
                        </button>
                    )}
                </div>

                <div>
                    <h3 className="text-2xl font-bold mb-4 border-b pb-2">Table of Contents</h3>
                    <ul className="space-y-2">
                        {novel.chapters.length === 0 ? <p className="text-gray-500 italic">No chapters available yet.</p> : null}
                        {novel.chapters.map((ch: any) => (
                            <li key={ch.id}>
                                <Link href={`/read/${novel.id}/chapter/${ch.id}`} className="block p-4 bg-white rounded-lg border border-gray-100 hover:border-blue-300 hover:shadow-md transition flex justify-between items-center">
                                    <span className="font-medium">Chapter {ch.order_index}: {ch.title}</span>
                                    <span className="text-sm text-gray-400">{new Date(ch.created_at).toLocaleDateString()}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
