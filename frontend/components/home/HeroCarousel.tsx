"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Star, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Novel {
  id: number;
  title: string;
  cover_image: string;
  title_image?: string;
  synopsis?: string;
  averageRating?: number;
  is_mature?: boolean;
  author?: { username?: string };
  genres?: { genre: string }[];
}

export default function HeroCarousel({ items }: { items: Novel[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  useEffect(() => {
    if (items.length <= 1 || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      handleNext();
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [items.length, isHovered]);

  if (!items || items.length === 0) return null;

  return (
    <div 
      className="relative w-full overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/70 shadow-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {items.map((novel) => (
          <div key={novel.id} className="w-full shrink-0 flex flex-col md:flex-row min-h-[350px] md:h-[450px] relative">
            {/* Background Blur Image for immersive ambient glow */}
            <div className="absolute inset-0 -z-20 overflow-hidden opacity-35 blur-3xl pointer-events-none">
              <img src={novel.cover_image} alt="" className="w-full h-full object-cover scale-150" />
            </div>

            {/* Left side: content (synopsis, title) */}
            <div className="flex flex-col justify-center flex-1 p-8 md:p-12 z-10 space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                {novel.is_mature && <Badge variant="destructive">18+</Badge>}
                {novel.genres?.slice(0, 3).map((g) => (
                  <Badge key={g.genre} variant="secondary" className="bg-slate-900/80 text-indigo-300 border-slate-800">
                    {g.genre}
                  </Badge>
                ))}
                {novel.averageRating !== undefined && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-800">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {novel.averageRating.toFixed(1)}
                  </div>
                )}
              </div>

              <h2 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-md">
                {novel.title}
              </h2>

              <p className="text-xs md:text-sm text-slate-400 font-medium">
                By <span className="text-slate-200 font-semibold">{novel.author?.username ?? "Unknown Author"}</span>
              </p>

              <p className="text-sm text-slate-300 line-clamp-3 md:line-clamp-4 leading-relaxed max-w-xl">
                {novel.synopsis ?? "Explore this amazing story on Novelsive."}
              </p>

              <div className="pt-4 flex items-center gap-4">
                <Link href={`/novel/${novel.id}`}>
                  <Button className="rounded-full px-6 py-5 bg-indigo-600 hover:bg-indigo-500 font-bold gap-2 text-white shadow-lg shadow-indigo-600/25 transition">
                    <Play className="h-4 w-4 fill-current" />
                    Read Now
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right side: large graphic cover */}
            <div className="relative w-full md:w-2/5 h-[240px] md:h-full flex items-center justify-center p-6 md:p-8 bg-slate-950/20 z-10">
              <div className="relative h-full aspect-[2/3] max-h-[300px] md:max-h-[350px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 transition duration-500 hover:scale-[1.02] hover:border-indigo-500/50">
                <img 
                  src={novel.cover_image} 
                  alt={novel.title} 
                  className={`w-full h-full object-cover ${novel.is_mature ? "blur-md" : ""}`} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Control Buttons */}
      {items.length > 1 && (
        <>
          <button 
            onClick={handlePrev} 
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center h-12 w-12 rounded-full border border-slate-800/80 bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-900/80 transition-all hover:scale-105 z-20 backdrop-blur-xs"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button 
            onClick={handleNext} 
            className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center h-12 w-12 rounded-full border border-slate-800/80 bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-900/80 transition-all hover:scale-105 z-20 backdrop-blur-xs"
            aria-label="Next Slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Pagination Indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                activeIndex === idx 
                  ? "w-8 bg-indigo-500" 
                  : "w-2.5 bg-slate-700 hover:bg-slate-500"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
