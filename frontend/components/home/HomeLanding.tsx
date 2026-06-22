"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ArrowRight, BookOpen, Sparkles, Star, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TopCarousel from "@/components/home/TopCarousel";
import HeroCarousel from "@/components/home/HeroCarousel";

interface NovelSummary {
  id: number;
  title: string;
  cover_image: string;
  averageRating?: number;
  is_mature?: boolean;
  author?: {
    username?: string;
  };
}

interface HistoryEntry {
  id: number;
  novel_id: number;
  chapter_id: number;
  paragraph_index: number;
  novel: NovelSummary & {
    author?: {
      username?: string;
    };
  };
  chapter?: {
    order_index?: number;
    title?: string;
  };
}

interface HomeData {
  history?: HistoryEntry[];
  newlyUpdatedHistory?: HistoryEntry[];
  topRated?: NovelSummary[];
  topViewed?: NovelSummary[];
  newlyUpdated?: NovelSummary[];
  carouselNovels?: NovelSummary[];
}

function NovelShelfCard({ novel, href, subtitle }: { novel: NovelSummary; href: string; subtitle: string }) {
  return (
    <Link href={href} className="group min-w-45 max-w-45 shrink-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-indigo-500/40">
      <div className="relative aspect-2/3 overflow-hidden bg-slate-900">
        <img src={novel.cover_image} alt={novel.title} className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${novel.is_mature ? "blur-xl scale-110" : ""}`} />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
        {novel.is_mature && <Badge variant="destructive" className="absolute right-3 top-3 border-0">18+</Badge>}
      </div>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-white">{novel.title}</h3>
        <p className="text-xs text-slate-400">By {novel.author?.username ?? "Unknown"}</p>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{subtitle}</span>
          <span className="inline-flex items-center gap-1 text-amber-400">
            <Star className="h-3.5 w-3.5 fill-current" />
            {(novel.averageRating ?? 0).toFixed(1)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomeLanding() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await axios.get("/api/home");
        setData(response.data as HomeData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />
          <p className="text-sm">Loading your library...</p>
        </div>
      </div>
    );
  }

  const isLoggedIn = Boolean(data?.history);

  return (
    <div className="relative overflow-hidden pb-20">
      <div className="absolute inset-x-0 top-0 -z-10 h-115 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.28),transparent_36%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.18),transparent_24%)]" />


      <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        {data?.carouselNovels && data.carouselNovels.length > 0 && (
          <HeroCarousel items={data.carouselNovels} />
        )}

        {isLoggedIn ? (
          <div className="space-y-10">
            <Card>
              <CardHeader className="flex-row items-end justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <BookOpen className="h-5 w-5 text-indigo-300" />
                    Continue reading
                  </CardTitle>
                  <CardDescription>Pick up from where you stopped.</CardDescription>
                </div>
                <Link href="/browse">
                  <Button variant="soft" className="rounded-full">Browse more</Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {(data?.history ?? []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-8 text-slate-300">
                      Your reading history is empty.
                    </div>
                  ) : (
                    data?.history?.map((entry) => (
                      <Link key={entry.id} href={`/read/${entry.novel_id}/chapter/${entry.chapter_id}?p=${entry.paragraph_index}`} className="min-w-70 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 transition hover:border-indigo-500/40 hover:bg-slate-900">
                        <div className="flex gap-4">
                          <img src={entry.novel.cover_image} alt={entry.novel.title} className={`h-24 w-16 rounded-xl object-cover ${entry.novel.is_mature ? "blur-md" : ""}`} />
                          <div className="min-w-0">
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Chapter {entry.chapter?.order_index ?? 0}</div>
                            <h3 className="mt-1 truncate text-sm font-semibold text-white">{entry.novel.title}</h3>
                            <p className="mt-1 text-xs text-slate-400">{entry.chapter?.title ?? "Continue your story"}</p>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <TrendingUp className="h-5 w-5 text-emerald-300" />
                  Fresh updates in your library
                </CardTitle>
                <CardDescription>New chapters and recently active stories.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {(data?.newlyUpdatedHistory ?? []).map((entry) => (
                    <NovelShelfCard key={entry.id} novel={entry.novel} href={`/novel/${entry.novel_id}`} subtitle="New chapters" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-10">
            {data?.topRated?.length ? (
              <Card>
                <CardHeader className="flex-row items-end justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl">Top rated</CardTitle>
                    <CardDescription>Highest-rated stories on the platform.</CardDescription>
                  </div>
                  <Link href="/browse">
                    <Button variant="ghost" className="gap-2">View leaderboard <ArrowRight className="h-4 w-4" /></Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {data.topRated.map((novel) => (
                      <NovelShelfCard key={novel.id} novel={novel} href={`/novel/${novel.id}`} subtitle="Top rated" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {data?.topViewed?.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Most viewed</CardTitle>
                  <CardDescription>Popular stories pulling the most attention right now.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {data.topViewed.map((novel) => (
                      <NovelShelfCard key={novel.id} novel={novel} href={`/novel/${novel.id}`} subtitle="Most viewed" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {data?.newlyUpdated?.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Newly updated</CardTitle>
                  <CardDescription>Recent releases from across the catalog.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {data.newlyUpdated.map((novel) => (
                      <NovelShelfCard key={novel.id} novel={novel} href={`/novel/${novel.id}`} subtitle="Fresh release" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
