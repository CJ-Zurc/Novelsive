"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { BookOpen, Compass, LayoutDashboard, Search, User, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  username: string;
  role?: string;
  profile_image?: string | null;
}

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("/api/user/profile");
        setUser(res.data.user ?? null);
      } catch {
        setUser(null);
      }
    };

    void fetchUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/logout");
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-black tracking-tight text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
            <BookOpen className="h-4.5 w-4.5" />
          </span>
          <span className="text-lg sm:text-xl">Novelsive</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/" className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white">
            Home
          </Link>
          <Link href="/browse" className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white">
            Top Ranks
          </Link>
          {user && (
            <Link href="/my-novels" className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white">
              My Novels
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white">
              Dashboard
            </Link>
          )}
        </nav>

        <form onSubmit={handleSearch} className="relative hidden flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search stories, authors, or titles..."
            className="pl-9"
          />
        </form>

        <div className="ml-auto flex items-center gap-3">
          <Link href="/browse" className="md:hidden">
            <Button variant="outline" size="icon" className="rounded-full">
              <Compass className="h-4 w-4" />
            </Button>
          </Link>

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((value) => !value)}
                className="flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900/80 px-2 py-1.5 pr-4 transition hover:border-slate-700 hover:bg-slate-900"
              >
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-sm font-bold text-slate-100 ring-1 ring-inset ring-slate-700">
                  {user.profile_image ? (
                    <img src={user.profile_image} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    user.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden text-left sm:block">
                  <div className="text-sm font-semibold text-white">{user.username}</div>
                  <Badge variant="muted" className="mt-1 w-fit border-slate-700 bg-slate-900 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                    {user.role === "ADMIN" ? "Admin" : "Member"}
                  </Badge>
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 max-h-56 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
                  <div className="border-b border-slate-800 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Signed in as</p>
                    <p className="mt-1 truncate text-sm font-semibold text-white">{user.username}</p>
                  </div>
                  <Link href="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white">
                    <User className="h-4 w-4" />
                    Account Profile
                  </Link>
                  {user.role === "ADMIN" && (
                    <Link href="/admin" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white">
                      <LayoutDashboard className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      void handleLogout();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button>Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
