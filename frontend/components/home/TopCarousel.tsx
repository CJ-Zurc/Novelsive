"use client";

import React from "react";
import Link from "next/link";
import { Star } from "lucide-react";

interface Novel {
  id: number;
  title: string;
  cover_image: string;
  synopsis?: string;
  author?: { username?: string };
  averageRating?: number;
}

export default function TopCarousel({ items }: { items: Novel[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Top ranks</h3>
        <div className="text-sm text-slate-400">Top stories right now</div>
      </div>

      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {items.map((n) => (
            <Link key={n.id} href={`/novel/${n.id}`} className="min-w-[320px] max-w-[320px] shrink-0 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-indigo-500/40 transition">
              <div className="flex gap-4">
                <img src={n.cover_image} alt={n.title} className="h-28 w-20 rounded-md object-cover" />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-white line-clamp-2">{n.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">By {n.author?.username ?? "Unknown"}</p>
                  <div className="mt-2 text-xs text-slate-300 line-clamp-3">{n.synopsis ?? "No synopsis available."}</div>
                  <div className="flex items-center gap-2 mt-3 text-amber-400 text-xs">
                    <Star className="h-3.5 w-3.5" />
                    {(n.averageRating ?? 0).toFixed(1)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
