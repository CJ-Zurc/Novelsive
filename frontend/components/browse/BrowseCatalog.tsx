"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Swal from "sweetalert2";
import { Search, ShieldAlert, Star, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface GenreLink {
  genre: string;
}

interface AuthorLink {
  username?: string;
}

interface NovelItem {
  id: number;
  title: string;
  cover_image: string;
  view_count?: number;
  averageRating?: number;
  synopsis?: string;
  is_mature?: boolean;
  rank?: number;
  author?: AuthorLink;
  genres?: GenreLink[];
}

const genres = ["All", "Sci-Fi", "Adventure", "Mystery", "Horror", "Fantasy", "Romance", "Drama", "Thriller"];

type RankTab = "views" | "rating" | "trending";

export default function BrowseCatalog() {
  const [viewsNovels, setViewsNovels] = useState<NovelItem[]>([]);
  const [ratingNovels, setRatingNovels] = useState<NovelItem[]>([]);
  const [trendingNovels, setTrendingNovels] = useState<NovelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RankTab>("views");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [showMature, setShowMature] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [publicRes, trendingRes] = await Promise.all([
          axios.get("/api/novels"),
          axios.get("/api/novels?type=trending"),
        ]);

        const novels = (publicRes.data.novels ?? []) as NovelItem[];
        setViewsNovels([...novels].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).map((novel, index) => ({ ...novel, rank: index + 1 })));
        setRatingNovels([...novels].sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0)).map((novel, index) => ({ ...novel, rank: index + 1 })));
        setTrendingNovels(((trendingRes.data.novels ?? []) as NovelItem[]).map((novel, index) => ({ ...novel, rank: index + 1 })));
      } catch (error) {
        console.error("Failed to fetch novels", error);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const activeNovels = useMemo(() => {
    const base = activeTab === "views" ? viewsNovels : activeTab === "rating" ? ratingNovels : trendingNovels;
    return base.filter((novel) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || [novel.title, novel.author?.username ?? "", novel.synopsis ?? ""].some((value) => value.toLowerCase().includes(query));
      const matchesGenre = selectedGenre === "All" || (novel.genres ?? []).some((genre) => genre.genre.toLowerCase() === selectedGenre.toLowerCase());
      const matchesMature = showMature || !novel.is_mature;
      return matchesSearch && matchesGenre && matchesMature;
    });
  }, [activeTab, viewsNovels, ratingNovels, trendingNovels, searchQuery, selectedGenre, showMature]);

  const handleMatureToggle = async (checked: boolean) => {
    if (!checked) {
      setShowMature(false);
      return;
    }

    const result = await Swal.fire({
      title: "Age Verification Required",
      text: "To view mature content, you must confirm that you are 18 years of age or older.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, I am 18+",
      cancelButtonText: "Cancel",
      background: "#020617",
      color: "#e2e8f0",
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#334155",
    });

    setShowMature(result.isConfirmed);
  };

  const getTabLabel = (tab: RankTab) => {
    if (tab === "views") return "Most Views";
    if (tab === "rating") return "Highest Rated";
    return "Trending";
  };

  const getRankTone = (rank: number) => {
    if (rank === 1) return "bg-amber-500/15 text-amber-200 border-amber-500/30";
    if (rank === 2) return "bg-slate-200/10 text-slate-200 border-slate-500/30";
    if (rank === 3) return "bg-orange-500/15 text-orange-200 border-orange-500/30";
    return "bg-slate-800/80 text-slate-300 border-slate-700";
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />
          <p className="text-sm">Curating the leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border-slate-800/80 bg-slate-950/75">
          <CardHeader className="relative gap-6 p-8 sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.22),transparent_32%),radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.15),transparent_24%)]" />
            <div className="relative space-y-4">
              <Badge className="w-fit border-0 bg-indigo-600/20 text-indigo-200 hover:bg-indigo-600/20">
                <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                Curated ranks
              </Badge>
              <CardTitle className="text-4xl font-black tracking-tight text-white sm:text-5xl">Find the stories everyone is talking about.</CardTitle>
              <CardDescription className="max-w-2xl text-base text-slate-300 sm:text-lg">
                Browse the most viewed, highest rated novels
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="border-slate-800/80 bg-slate-950/75">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-3xl">
                {(["views", "rating", "trending"] as RankTab[]).map((tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? "default" : "outline"}
                    className="justify-start rounded-2xl px-4 py-6 text-left"
                    onClick={() => setActiveTab(tab)}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-sm font-semibold">{getTabLabel(tab)}</span>
                      <span className="text-xs text-current/70">Leaderboard view</span>
                    </div>
                  </Button>
                ))}
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={showMature}
                  onChange={(event) => void handleMatureToggle(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-500"
                />
                <span className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-300" />
                  Mature content
                </span>
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by title, author, or synopsis..."
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <Button
                    key={genre}
                    variant={selectedGenre === genre ? "default" : "ghost"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setSelectedGenre(genre)}
                  >
                    {genre}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{getTabLabel(activeTab)}</h2>
            <p className="text-sm text-slate-400">{activeNovels.length} novels found</p>
          </div>
        </div>

        {activeNovels.length === 0 ? (
          <Card className="border-dashed border-slate-800 bg-slate-950/70">
            <CardContent className="flex flex-col items-center justify-center gap-4 p-12 text-center">
              <div className="rounded-full border border-slate-800 bg-slate-900 p-4 text-slate-300">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">No novels match your filters</h3>
                <p className="mt-2 text-sm text-slate-400">Try another genre, clear the search box, or switch ranking tabs.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {activeNovels.map((novel) => (
              <Link key={novel.id} href={`/novel/${novel.id}`}>
                <Card className="group h-full overflow-hidden border-slate-800/80 bg-slate-950/75 transition duration-300 hover:-translate-y-1 hover:border-indigo-500/40">
                  <div className="relative aspect-2/3 overflow-hidden bg-slate-900">
                    <img src={novel.cover_image} alt={novel.title} className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${novel.is_mature ? "blur-xl scale-110" : ""}`} />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/15 to-transparent" />
                    <Badge className={`absolute left-3 top-3 border ${getRankTone(novel.rank ?? 0)}`}>#{novel.rank ?? 0}</Badge>
                    {novel.is_mature && <Badge variant="destructive" className="absolute right-3 top-3 border-0">18+</Badge>}
                  </div>
                  <CardContent className="space-y-2 p-4">
                    <h3 className="line-clamp-2 text-sm font-semibold text-white">{novel.title}</h3>
                    <p className="text-xs text-slate-400">By {novel.author?.username ?? "Unknown"}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{(novel.view_count ?? 0).toLocaleString()} views</span>
                      <span className="inline-flex items-center gap-1 text-amber-400">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {(novel.averageRating ?? 0).toFixed(1)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
