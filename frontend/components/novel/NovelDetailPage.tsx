"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { BookOpen, ChevronRight, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface NovelChapter {
  id: number;
  order_index: number;
  title: string;
  created_at: string;
}

interface GenreLink {
  genre: string;
}

interface NovelData {
  id: number;
  title: string;
  synopsis: string;
  cover_image: string;
  is_mature?: boolean;
  averageRating?: number;
  author: {
    username: string;
  };
  genres: GenreLink[];
  chapters: NovelChapter[];
}

interface ReadingHistory {
  chapter_id: number;
  paragraph_index: number;
}

export default function NovelDetailPage() {
  const params = useParams();
  const novelId = params.id as string;
  const [novel, setNovel] = useState<NovelData | null>(null);
  const [history, setHistory] = useState<ReadingHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverRating, setHoverRating] = useState(0);
  const [userRating, setUserRating] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const novelResponse = await axios.get(`/api/novels/${novelId}`);
        setNovel(novelResponse.data.novel as NovelData);

        try {
          const historyResponse = await axios.get("/api/reading-history");
          const matchedHistory = (historyResponse.data.history ?? []).find((entry: { novel_id: number; chapter_id: number; paragraph_index: number }) => entry.novel_id === Number(novelId));
          if (matchedHistory) {
            setHistory({ chapter_id: matchedHistory.chapter_id, paragraph_index: matchedHistory.paragraph_index });
          }
        } catch {
          // Not logged in.
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [novelId]);

  const handleRate = async (score: number) => {
    try {
      const response = await axios.post(`/api/novels/${novelId}/rating`, { score });
      setUserRating(score);
      setNovel((current) => (current ? { ...current, averageRating: response.data.average } : current));
      window.alert("Rating submitted!");
    } catch (error: any) {
      if (error.response?.status === 401) {
        window.alert("You must be logged in to rate.");
        return;
      }

      window.alert("Failed to submit rating.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />
          <p className="text-sm">Loading novel details...</p>
        </div>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Card className="border-slate-800/80 bg-slate-950/75">
          <CardContent className="p-12">
            <p className="text-lg font-semibold text-white">Novel not found.</p>
            <p className="mt-2 text-sm text-slate-400">The story may have been removed or the link is invalid.</p>
            <Link href="/browse" className="mt-6 inline-block">
              <Button className="rounded-full">Back to browse</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const firstChapterId = novel.chapters[0]?.id;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden border-slate-800/80 bg-slate-950/75">
            <div className="aspect-2/3 bg-slate-900">
              <img src={novel.cover_image} alt={novel.title} className={`h-full w-full object-cover ${novel.is_mature ? "blur-md" : ""}`} />
            </div>
          </Card>

          <Card className="border-slate-800/80 bg-slate-950/75">
            <CardContent className="space-y-4 p-6 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-amber-400">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="text-2xl font-black text-white">{(novel.averageRating ?? 0).toFixed(1)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">Average rating</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">Rate this novel</p>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => void handleRate(star)} className="rounded-full p-2 transition hover:bg-slate-900">
                      <Star className={`h-6 w-6 ${Math.max(hoverRating, userRating) >= star ? "fill-amber-400 text-amber-400" : "text-slate-600"}`} />
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-800/80 bg-slate-950/75">
            <CardHeader className="space-y-4 p-8">
              <div className="flex flex-wrap items-center gap-2">
                {novel.is_mature && <Badge variant="destructive">Mature</Badge>}
                {novel.genres.map((genre) => (
                  <Badge key={genre.genre} variant="secondary">
                    {genre.genre}
                  </Badge>
                ))}
              </div>
              <div className="space-y-2">
                <CardTitle className="text-4xl font-black tracking-tight text-white">{novel.title}</CardTitle>
                <CardDescription className="text-base text-slate-400">By {novel.author.username}</CardDescription>
              </div>
              <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{novel.synopsis}</p>
              <div className="flex flex-wrap gap-3 pt-2">
                {history ? (
                  <Link href={`/read/${novel.id}/chapter/${history.chapter_id}?p=${history.paragraph_index}`}>
                    <Button className="gap-2 rounded-full px-6">
                      <BookOpen className="h-4 w-4" />
                      Continue reading
                    </Button>
                  </Link>
                ) : firstChapterId ? (
                  <Link href={`/read/${novel.id}/chapter/${firstChapterId}`}>
                    <Button className="gap-2 rounded-full px-6">
                      <BookOpen className="h-4 w-4" />
                      Start reading
                    </Button>
                  </Link>
                ) : (
                  <Button disabled className="rounded-full px-6">
                    No chapters yet
                  </Button>
                )}
                <Link href="/browse">
                  <Button variant="outline" className="rounded-full px-6">
                    Back to browse
                  </Button>
                </Link>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-slate-800/80 bg-slate-950/75">
            <CardHeader>
              <CardTitle className="text-2xl">Table of contents</CardTitle>
              <CardDescription>{novel.chapters.length} chapters available</CardDescription>
            </CardHeader>
            <CardContent>
              {novel.chapters.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-8 text-sm text-slate-400">
                  No chapters available yet.
                </div>
              ) : (
                <div className="grid gap-3">
                  {novel.chapters.map((chapter) => (
                    <Link key={chapter.id} href={`/read/${novel.id}/chapter/${chapter.id}`} className="group flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 transition hover:border-indigo-500/40 hover:bg-slate-900">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          Chapter {chapter.order_index}: {chapter.title}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">Published {new Date(chapter.created_at).toLocaleDateString()}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-indigo-300" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
