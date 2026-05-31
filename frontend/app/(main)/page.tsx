"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";

export default function HomePage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHome = async () => {
            try {
                const res = await axios.get("/api/home");
                setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchHome();
    }, []);

    const renderNovelCard = (novel: any) => (
        <Link key={novel.id} href={`/novel/${novel.id}`} className="flex-none w-40 md:w-48 flex flex-col group scroll-snap-align-start transition duration-300">
            <div className="w-full aspect-[2/3] bg-gray-100 rounded-2xl overflow-hidden shadow-sm relative mb-3 group-hover:shadow-md border border-gray-100 group-hover:border-indigo-100 transition duration-300 transform group-hover:-translate-y-1">
                <img 
                    src={novel.cover_image} 
                    alt={novel.title} 
                    className={`w-full h-full object-cover transition duration-500 group-hover:scale-105 ${novel.is_mature ? 'blur-xl scale-110' : ''}`} 
                />
                {novel.is_mature && <span className="absolute top-2.5 right-2.5 bg-red-650 text-white text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full shadow-sm">18+</span>}
            </div>
            <h3 className="font-extrabold text-xs text-gray-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">{novel.title}</h3>
            <p className="text-[10px] text-gray-500 font-medium mt-1">By {novel.author?.username}</p>
            <div className="text-[11px] text-yellow-500 font-bold mt-1.5 flex items-center gap-0.5">★ {novel.averageRating ? novel.averageRating.toFixed(1) : "0.0"}</div>
        </Link>
    );

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="text-gray-500 font-medium">Opening Novelsive...</p>
            </div>
        </div>
    );

    // Determine if logged in: logged in users do not get global topViewed feeds
    const isLoggedIn = data && !data.topViewed;

    if (isLoggedIn) {
        return (
            <div className="min-h-screen bg-slate-50 pb-20">
                {/* Header Welcome Bar */}
                <section className="bg-gradient-to-r from-indigo-700 via-purple-800 to-indigo-900 text-white py-12 px-4 shadow-sm relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_45%)]"></div>
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 drop-shadow-sm">
                                Welcome Back!
                            </h1>
                            <p className="text-sm md:text-base text-indigo-150 font-light">
                                Jump straight back into your reading adventure.
                            </p>
                        </div>
                        <Link href="/browse" className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-6 py-2.5 rounded-xl transition shadow-sm text-sm cursor-pointer">
                            Explore New Novels
                        </Link>
                    </div>
                </section>

                <div className="max-w-7xl mx-auto px-4 mt-10 space-y-12">
                    {/* Continue Reading Section */}
                    <section className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-black mb-6 flex items-center text-gray-900 gap-2 border-b border-gray-50 pb-4">
                            <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                            Continue Reading
                        </h2>

                        {data.history?.length === 0 ? (
                            <div className="text-center py-10 max-w-sm mx-auto">
                                <div className="text-4xl mb-4">📖</div>
                                <h3 className="font-bold text-gray-900 text-base mb-1">Your reading history is empty</h3>
                                <p className="text-xs text-gray-500 mb-6">
                                    Start reading any novel from our Top Ranks list to track your progress here!
                                </p>
                                <Link href="/browse" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition">
                                    Browse Novels
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {data.history.map((h: any) => (
                                    <Link key={h.id} href={`/read/${h.novel_id}/chapter/${h.chapter_id}?p=${h.paragraph_index}`} 
                                        className="flex bg-slate-50 hover:bg-indigo-50/40 rounded-2xl border border-slate-100 hover:border-indigo-150 p-4 gap-4 transition duration-300 transform hover:-translate-y-0.5">
                                        <div className="w-16 h-24 bg-gray-200 rounded-xl overflow-hidden shrink-0 shadow-sm relative">
                                            <img src={h.novel.cover_image} alt="" className={`w-full h-full object-cover ${h.novel.is_mature ? 'blur-md scale-110' : ''}`} />
                                            {h.novel.is_mature && <span className="absolute top-1 right-1 bg-red-600 text-white text-[8px] font-black tracking-wider px-1 rounded">18+</span>}
                                        </div>
                                        <div className="flex flex-col justify-center overflow-hidden flex-grow">
                                            <h3 className="font-extrabold text-gray-950 text-sm truncate leading-snug">{h.novel.title}</h3>
                                            <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">By {h.novel.author?.username}</p>
                                            <div className="mt-2.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/50 w-fit px-2.5 py-1 rounded-lg truncate max-w-full">
                                                Ch. {h.chapter.order_index} • {h.chapter.title}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Newly Updated from Library Section */}
                    <section className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-black mb-6 flex items-center text-gray-900 gap-2 border-b border-gray-50 pb-4">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            Newly Updated in Your Library
                        </h2>

                        {data.newlyUpdatedHistory?.length === 0 ? (
                            <div className="text-center py-10 max-w-sm mx-auto text-gray-500">
                                <div className="text-4xl mb-4">✨</div>
                                <h3 className="font-bold text-gray-900 text-base mb-1">Up to date!</h3>
                                <p className="text-xs text-gray-500">
                                    All novels in your reading history are currently up to date.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {data.newlyUpdatedHistory.map((h: any) => (
                                    <Link key={`upd-${h.id}`} href={`/novel/${h.novel_id}`} 
                                        className="flex bg-slate-50 hover:bg-emerald-50/30 rounded-2xl border border-slate-100 hover:border-emerald-150 p-4 gap-4 transition duration-300 transform hover:-translate-y-0.5">
                                        <div className="w-16 h-24 bg-gray-200 rounded-xl overflow-hidden shrink-0 shadow-sm relative">
                                            <img src={h.novel.cover_image} alt="" className={`w-full h-full object-cover ${h.novel.is_mature ? 'blur-md scale-110' : ''}`} />
                                            {h.novel.is_mature && <span className="absolute top-1 right-1 bg-red-650 text-white text-[8px] font-black tracking-wider px-1 rounded">18+</span>}
                                        </div>
                                        <div className="flex flex-col justify-center overflow-hidden flex-grow">
                                            <div className="flex items-center gap-1.5">
                                                <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                                <h3 className="font-extrabold text-gray-950 text-sm truncate leading-snug">{h.novel.title}</h3>
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">By {h.novel.author?.username}</p>
                                            <div className="mt-2.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/50 w-fit px-2.5 py-1 rounded-lg truncate max-w-full">
                                                New Chapters Released!
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        );
    }

    // Guest / Logged-Out View
    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Dynamic Hero Section */}
            <section className="bg-gradient-to-r from-indigo-700 via-purple-800 to-pink-900 text-white py-20 px-4 relative overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_40%)]"></div>
                <div className="max-w-7xl mx-auto text-center relative z-10 flex flex-col items-center">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 drop-shadow-sm leading-tight max-w-4xl">
                        Discover Your Next Favorite Masterpiece
                    </h1>
                    <p className="text-base md:text-xl text-indigo-100 max-w-2xl mx-auto font-light mb-8">
                        Experience dynamic slide-by-slide storytelling, emotional NLP analysis, and an outstanding reading environment.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link href="/register" className="bg-white text-indigo-800 hover:bg-indigo-50 font-extrabold px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm cursor-pointer transform hover:-translate-y-0.5">
                            Create Free Account
                        </Link>
                        <Link href="/browse" className="bg-indigo-600/35 backdrop-blur-md text-white border border-indigo-400/50 hover:bg-indigo-650/45 font-extrabold px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm cursor-pointer transform hover:-translate-y-0.5">
                            Browse Ranks
                        </Link>
                    </div>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 mt-12 space-y-12">
                
                {/* Guest Call-To-Action Banner */}
                <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-8 md:p-12 rounded-3xl border border-indigo-950 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
                    <div className="max-w-2xl relative z-10">
                        <h2 className="text-2xl md:text-3xl font-black mb-3">Join the Novelsive Community!</h2>
                        <p className="text-sm text-indigo-200 font-light leading-relaxed">
                            Create your single unified account today. Read novels, write your own works with our slide-by-slide editor, save your reading progress automatically, and participate in discussions.
                        </p>
                    </div>
                    <Link href="/register" className="bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white font-extrabold px-8 py-3.5 rounded-xl text-sm transition-all duration-300 shadow-md transform hover:-translate-y-0.5 shrink-0 select-none cursor-pointer">
                        Sign Up Now
                    </Link>
                </div>

                {/* Top Rated Section */}
                {data?.topRated?.length > 0 && (
                    <section className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                        <h2 className="text-lg md:text-xl font-black mb-6 flex items-center text-gray-900 gap-2 border-b border-gray-50 pb-4">
                            <span className="w-1.5 h-6 bg-yellow-400 rounded-full"></span>
                            ⭐️ Top Rated Masterpieces
                        </h2>
                        <div className="flex gap-6 overflow-x-auto pb-4 scroll-snap-x scrollbar-hide">
                            {data.topRated.map(renderNovelCard)}
                        </div>
                    </section>
                )}

                {/* Top Viewed / Trending Section */}
                {data?.topViewed?.length > 0 && (
                    <section className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                        <h2 className="text-lg md:text-xl font-black mb-6 flex items-center text-gray-900 gap-2 border-b border-gray-50 pb-4">
                            <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                            🏆 Overall Most Viewed
                        </h2>
                        <div className="flex gap-6 overflow-x-auto pb-4 scroll-snap-x scrollbar-hide">
                            {data.topViewed.map(renderNovelCard)}
                        </div>
                    </section>
                )}

                {/* Newly Updated Section */}
                {data?.newlyUpdated?.length > 0 && (
                    <section className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                        <h2 className="text-lg md:text-xl font-black mb-6 flex items-center text-gray-900 gap-2 border-b border-gray-50 pb-4">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            📅 Newly Updated Releases
                        </h2>
                        <div className="flex gap-6 overflow-x-auto pb-4 scroll-snap-x scrollbar-hide">
                            {data.newlyUpdated.map(renderNovelCard)}
                        </div>
                    </section>
                )}

            </div>
        </div>
    );
}
