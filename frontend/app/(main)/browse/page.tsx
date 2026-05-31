"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import Swal from "sweetalert2";

export default function TopRanksPage() {
    const [viewsNovels, setViewsNovels] = useState<any[]>([]);
    const [ratingNovels, setRatingNovels] = useState<any[]>([]);
    const [trendingNovels, setTrendingNovels] = useState<any[]>([]);
    const [filteredNovels, setFilteredNovels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Active tab: views, rating, trending
    const [activeTab, setActiveTab] = useState<"views" | "rating" | "trending">("views");

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGenre, setSelectedGenre] = useState("All");
    const [showMature, setShowMature] = useState(false);

    // List of genres for filters
    const genres = ["All", "Sci-Fi", "Adventure", "Mystery", "Horror", "Fantasy", "Romance", "Drama", "Thriller"];

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // 1. Fetch public novels (normally sorted by views)
                const resNormal = await axios.get("/api/novels");
                const allNovels = resNormal.data.novels || [];

                // Sort and assign rank for Views
                const sortedByViews = [...allNovels]
                    .sort((a, b) => b.view_count - a.view_count)
                    .map((n, i) => ({ ...n, rank: i + 1 }));
                setViewsNovels(sortedByViews);

                // Sort and assign rank for Ratings
                const sortedByRating = [...allNovels]
                    .sort((a, b) => b.averageRating - a.averageRating)
                    .map((n, i) => ({ ...n, rank: i + 1 }));
                setRatingNovels(sortedByRating);

                // 2. Fetch trending novels
                const resTrending = await axios.get("/api/novels?type=trending");
                const trendNovels = resTrending.data.novels || [];
                const sortedByTrending = trendNovels.map((n: any, i: number) => ({ ...n, rank: i + 1 }));
                setTrendingNovels(sortedByTrending);

            } catch (err) {
                console.error("Failed to fetch novels", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    // Filter Logic
    useEffect(() => {
        let baseList: any[] = [];
        if (activeTab === "views") {
            baseList = viewsNovels;
        } else if (activeTab === "rating") {
            baseList = ratingNovels;
        } else {
            baseList = trendingNovels;
        }

        let result = [...baseList];

        // 1. Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (n) =>
                    n.title.toLowerCase().includes(query) ||
                    n.author.username.toLowerCase().includes(query) ||
                    n.synopsis.toLowerCase().includes(query)
            );
        }

        // 2. Genre Filter
        if (selectedGenre !== "All") {
            result = result.filter((n) =>
                n.genres.some((g: any) => g.genre.toLowerCase() === selectedGenre.toLowerCase())
            );
        }

        // 3. Mature filter
        if (!showMature) {
            result = result.filter((n) => !n.is_mature);
        }

        setFilteredNovels(result);
    }, [searchQuery, selectedGenre, showMature, activeTab, viewsNovels, ratingNovels, trendingNovels]);

    const handleMatureToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        if (checked) {
            const confirm = await Swal.fire({
                title: "Age Verification Required",
                text: "To view mature content, you must confirm that you are 18 years of age or older.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3b82f6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Yes, I am 18+",
                cancelButtonText: "Cancel",
                background: "#ffffff",
                customClass: {
                    popup: "rounded-2xl shadow-xl border border-gray-100",
                    title: "font-bold text-gray-900",
                    htmlContainer: "text-gray-600",
                    confirmButton: "px-6 py-2 rounded-lg font-bold text-white",
                    cancelButton: "px-6 py-2 rounded-lg font-bold text-white"
                }
            });

            if (confirm.isConfirmed) {
                setShowMature(true);
            } else {
                e.target.checked = false;
            }
        } else {
            setShowMature(false);
        }
    };

    const getRankBadgeClass = (rank: number) => {
        if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-yellow-200 shadow-md ring-2 ring-yellow-300";
        if (rank === 2) return "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800 shadow-slate-100 shadow-md ring-2 ring-slate-250";
        if (rank === 3) return "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-amber-100 shadow-md ring-2 ring-amber-550";
        return "bg-gray-100 text-gray-650 font-semibold";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="text-gray-500 font-medium">Curating top ranks...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
            {/* Header / Hero Section */}
            <section className="bg-gradient-to-r from-indigo-700 via-purple-800 to-pink-900 text-white py-12 px-4 shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_40%)]"></div>
                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 drop-shadow-sm">
                        Top Leaderboard
                    </h1>
                    <p className="text-sm md:text-lg text-indigo-100 max-w-xl mx-auto font-light">
                        Discover the top-rated, most-viewed, and trending masterpieces on Novelsive.
                    </p>
                </div>
            </section>

            {/* Navigation Tabs for Ranks */}
            <div className="max-w-7xl mx-auto px-4 mt-8">
                <div className="flex border-b border-gray-200 mb-6 bg-white p-1.5 rounded-xl shadow-sm max-w-lg mx-auto">
                    <button
                        onClick={() => setActiveTab("views")}
                        className={`flex-1 py-3 text-center text-sm font-extrabold rounded-lg transition-all duration-300 cursor-pointer ${
                            activeTab === "views"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                                : "text-gray-500 hover:text-indigo-600 hover:bg-slate-50"
                        }`}
                    >
                        🏆 Most Views
                    </button>
                    <button
                        onClick={() => setActiveTab("rating")}
                        className={`flex-1 py-3 text-center text-sm font-extrabold rounded-lg transition-all duration-300 cursor-pointer ${
                            activeTab === "rating"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                                : "text-gray-500 hover:text-indigo-600 hover:bg-slate-50"
                        }`}
                    >
                        ⭐ Highest Rated
                    </button>
                    <button
                        onClick={() => setActiveTab("trending")}
                        className={`flex-1 py-3 text-center text-sm font-extrabold rounded-lg transition-all duration-300 cursor-pointer ${
                            activeTab === "trending"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                                : "text-gray-500 hover:text-indigo-600 hover:bg-slate-50"
                        }`}
                    >
                        🔥 Trending
                    </button>
                </div>

                {/* Filter controls bar */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between">
                    {/* Search Input */}
                    <div className="w-full md:max-w-md relative">
                        <input
                            type="text"
                            placeholder="Search by title, author, synopsis..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="absolute left-3.5 top-3 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* Right side: Age Gate */}
                    <div className="flex items-center w-full md:w-auto justify-end">
                        {/* Mature Content Toggle */}
                        <label className="flex items-center gap-3 cursor-pointer bg-red-50/50 px-4 py-2 rounded-xl border border-red-100/50 select-none hover:bg-red-50 transition-colors">
                            <input
                                type="checkbox"
                                checked={showMature}
                                onChange={handleMatureToggle}
                                className="w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500"
                            />
                            <span className="text-xs font-bold text-red-700">18+ Mature content</span>
                        </label>
                    </div>
                </div>

                {/* Genre Filter Tags */}
                <div className="flex flex-wrap gap-2.5 mt-6 justify-center md:justify-start">
                    {genres.map((genre) => (
                        <button
                            key={genre}
                            onClick={() => setSelectedGenre(genre)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${
                                selectedGenre === genre
                                    ? "bg-indigo-600 text-white shadow-indigo-200 shadow-lg"
                                    : "bg-white text-gray-600 border border-gray-150 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                        >
                            {genre}
                        </button>
                    ))}
                </div>

                {/* Results Section */}
                <div className="mt-10">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-extrabold text-gray-900">
                            {activeTab === "views" ? "🏆 Top Viewed" : activeTab === "rating" ? "⭐️ Top Rated" : "🔥 Trending Now"} ({filteredNovels.length})
                        </h2>
                    </div>

                    {filteredNovels.length === 0 ? (
                        <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-sm max-w-md mx-auto mt-10">
                            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <h3 className="text-lg font-bold text-gray-950 mb-1">No Novels Found</h3>
                            <p className="text-sm text-gray-500">
                                Try refining your search terms or selecting a different filter.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {filteredNovels.map((novel) => (
                                <Link
                                    key={novel.id}
                                    href={`/novel/${novel.id}`}
                                    className="flex flex-col group h-full bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300 transform hover:-translate-y-1 relative"
                                >
                                    {/* Cover Image Container */}
                                    <div className="w-full aspect-[2/3] bg-gray-100 relative overflow-hidden shrink-0">
                                        {/* Rank Badge */}
                                        <div className={`absolute top-2 left-2 z-20 flex items-center justify-center font-black text-xs px-2.5 py-1 rounded-full ${getRankBadgeClass(novel.rank)}`}>
                                            #{novel.rank}
                                        </div>

                                        <img
                                            src={novel.cover_image}
                                            alt={novel.title}
                                            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                                                novel.is_mature && !showMature ? "blur-xl scale-110" : ""
                                            }`}
                                        />
                                        {/* Badges overlay */}
                                        <div className="absolute top-2.5 right-2 flex flex-col gap-1.5 z-10">
                                            {novel.is_mature && (
                                                <span className="bg-red-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-sm tracking-wider">
                                                    18+
                                                </span>
                                            )}
                                        </div>
                                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                                            📖 {novel._count?.chapters || 0} Chs
                                        </div>
                                    </div>

                                    {/* Information */}
                                    <div className="p-3.5 flex flex-col flex-grow justify-between gap-2.5">
                                        <div className="flex flex-col gap-1">
                                            <h3 className="font-extrabold text-xs text-gray-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                                                {novel.title}
                                            </h3>
                                            <p className="text-[10px] text-gray-500 font-medium">
                                                By {novel.author?.username}
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            {/* Genre pills */}
                                            <div className="flex flex-wrap gap-1">
                                                {novel.genres.slice(0, 2).map((g: any) => (
                                                    <span
                                                        key={g.genre}
                                                        className="text-[9px] font-bold text-indigo-600 bg-indigo-50/70 px-1.5 py-0.5 rounded"
                                                    >
                                                        {g.genre}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Rating and view/trending count */}
                                            <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold border-t border-gray-50 pt-2">
                                                <span className="text-yellow-500 flex items-center gap-0.5">
                                                    ★ {novel.averageRating ? novel.averageRating.toFixed(1) : "0.0"}
                                                </span>
                                                {activeTab === "trending" ? (
                                                    <span className="text-orange-600 flex items-center gap-0.5 font-bold">
                                                        🔥 {novel.trendingCount || 0} event{novel.trendingCount !== 1 ? "s" : ""}
                                                    </span>
                                                ) : (
                                                    <span>👁️ {novel.view_count.toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
