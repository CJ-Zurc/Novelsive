"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { BarChart3, BookText, FileText, Logs, ShieldAlert, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AdminTab = "dashboard" | "reviews" | "assets" | "logs";

interface AnalyticsSummary {
  totalUsers?: number;
  totalNovels?: number;
  totalChapters?: number;
  totalComments?: number;
}

interface AnalyticsData {
  summary?: AnalyticsSummary;
  dailyNewUsers?: { date: string; count: number }[];
  topNovels?: { title: string; view_count: number }[];
  genreStats?: { genre: string; count: number }[];
  chapterStatusStats?: { status: string; count: number }[];
}

interface UserRecord {
  id: number;
  username: string;
  email: string;
  role: string;
  is_banned: boolean;
  created_at: string;
  profile_image?: string | null;
}

interface NovelRecord {
  id: number;
  title: string;
  is_active: boolean;
  is_mature?: boolean;
  admin_locked?: boolean;
  cover_image?: string | null;
  author?: { username?: string; email?: string };
  _count?: { chapters?: number };
  genres?: { genre: string }[];
}

interface ChapterReview {
  id: number;
  title: string;
  content: string;
  created_at: string;
  novel?: {
    title?: string;
    cover_image?: string | null;
    author?: { username?: string; email?: string };
  };
  _count?: { paragraph_blocks?: number };
}

interface MatureReviewNovel {
  id: number;
  title: string;
  cover_image?: string | null;
  author?: { username?: string };
  genres?: { genre: string }[];
}

interface AuditLog {
  id: number;
  admin_username: string;
  action: string;
  target_type: string;
  target_id: number;
  created_at: string;
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [novels, setNovels] = useState<NovelRecord[]>([]);
  const [manuscripts, setManuscripts] = useState<ChapterReview[]>([]);
  const [matureNovels, setMatureNovels] = useState<MatureReviewNovel[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<ChapterReview | null>(null);
  const [rejectForm, setRejectForm] = useState({ rejection_title: "", rejection_reason: "" });

  const tabMeta = useMemo(
    () => ({
      dashboard: { icon: BarChart3, label: "Dashboard" },
      reviews: { icon: FileText, label: "Reviews" },
      assets: { icon: Users, label: "Assets" },
      logs: { icon: Logs, label: "Logs" },
    }),
    []
  );

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === "dashboard") {
        const response = await axios.get("/api/admin/analytics");
        setAnalytics(response.data as AnalyticsData);
      }

      if (tab === "reviews") {
        const [manuscriptsResponse, matureResponse] = await Promise.all([
          axios.get("/api/admin/manuscripts"),
          axios.get("/api/admin/novels/mature-pending"),
        ]);
        setManuscripts((manuscriptsResponse.data.manuscripts ?? []) as ChapterReview[]);
        setMatureNovels((matureResponse.data.novels ?? []) as MatureReviewNovel[]);
      }

      if (tab === "assets") {
        const [usersResponse, novelsResponse] = await Promise.all([
          axios.get(`/api/admin/users?search=${encodeURIComponent(userSearch)}`),
          axios.get("/api/admin/novels"),
        ]);
        setUsers((usersResponse.data.users ?? []) as UserRecord[]);
        setNovels((novelsResponse.data.novels ?? []) as NovelRecord[]);
      }

      if (tab === "logs") {
        const response = await axios.get("/api/admin/audit-logs");
        setAuditLogs((response.data.logs ?? []) as AuditLog[]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab !== "assets") return;
    const handler = window.setTimeout(() => {
      void loadData();
    }, 250);

    return () => window.clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch]);

  const handleApproveManuscript = async (id: number) => {
    const result = await Swal.fire({
      title: "Approve chapter?",
      text: "This chapter will be published immediately.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Approve",
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#334155",
      background: "#020617",
      color: "#e2e8f0",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.post(`/api/admin/manuscripts/${id}/approve`);
      setManuscripts((current) => current.filter((item) => item.id !== id));
      void Swal.fire({ icon: "success", title: "Approved", text: "Chapter published.", timer: 1400, showConfirmButton: false, background: "#020617", color: "#e2e8f0" });
    } catch (error) {
      console.error(error);
      void Swal.fire({ icon: "error", title: "Failed", text: "Could not approve chapter.", background: "#020617", color: "#e2e8f0" });
    }
  };

  const handleRejectManuscript = async (id: number) => {
    if (!rejectForm.rejection_title.trim() || !rejectForm.rejection_reason.trim()) {
      void Swal.fire({ icon: "warning", title: "Incomplete form", text: "Please fill out the rejection title and reason.", background: "#020617", color: "#e2e8f0" });
      return;
    }

    try {
      await axios.post(`/api/admin/manuscripts/${id}/reject`, rejectForm);
      setManuscripts((current) => current.filter((item) => item.id !== id));
      setRejectModal(null);
      setRejectForm({ rejection_title: "", rejection_reason: "" });
      void Swal.fire({ icon: "success", title: "Rejected", text: "Chapter rejected and author notified.", timer: 1500, showConfirmButton: false, background: "#020617", color: "#e2e8f0" });
    } catch (error) {
      console.error(error);
      void Swal.fire({ icon: "error", title: "Failed", text: "Could not reject chapter.", background: "#020617", color: "#e2e8f0" });
    }
  };

  const handleDeactivateNovel = async (id: number) => {
    const result = await Swal.fire({
      title: "Deactivate novel?",
      text: "This novel and its chapters will be hidden from users.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Deactivate",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#334155",
      background: "#020617",
      color: "#e2e8f0",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.post(`/api/admin/novels/${id}/deactivate`);
      setNovels((current) => current.map((novel) => (novel.id === id ? { ...novel, is_active: false } : novel)));
      void Swal.fire({ icon: "success", title: "Deactivated", text: "Novel hidden from readers.", timer: 1400, showConfirmButton: false, background: "#020617", color: "#e2e8f0" });
    } catch (error) {
      console.error(error);
      void Swal.fire({ icon: "error", title: "Failed", text: "Could not deactivate novel.", background: "#020617", color: "#e2e8f0" });
    }
  };

  const handleReactivateNovel = async (id: number) => {
    try {
      await axios.post(`/api/admin/novels/${id}/reactivate`);
      setNovels((current) => current.map((novel) => (novel.id === id ? { ...novel, is_active: true } : novel)));
      void Swal.fire({ icon: "success", title: "Reactivated", text: "Novel is visible again.", timer: 1400, showConfirmButton: false, background: "#020617", color: "#e2e8f0" });
    } catch (error) {
      console.error(error);
      void Swal.fire({ icon: "error", title: "Failed", text: "Could not reactivate novel.", background: "#020617", color: "#e2e8f0" });
    }
  };

  const handleTagMatureLock = async (id: number) => {
    const result = await Swal.fire({
      title: "Tag mature and lock?",
      text: "This locks the novel as mature for admin moderation.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Lock mature",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#334155",
      background: "#020617",
      color: "#e2e8f0",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.post(`/api/admin/novels/${id}/tag-mature`);
      if (tab === "assets") {
        const response = await axios.get("/api/admin/novels");
        setNovels((response.data.novels ?? []) as NovelRecord[]);
      }
      void Swal.fire({ icon: "success", title: "Locked", text: "Novel marked mature.", timer: 1400, showConfirmButton: false, background: "#020617", color: "#e2e8f0" });
    } catch (error) {
      console.error(error);
      void Swal.fire({ icon: "error", title: "Failed", text: "Could not lock mature tag.", background: "#020617", color: "#e2e8f0" });
    }
  };

  const handleBanUser = async (id: number) => {
    const result = await Swal.fire({
      title: "Ban user?",
      text: "This user will be blocked from logging in.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ban user",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#334155",
      background: "#020617",
      color: "#e2e8f0",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.post(`/api/admin/users/${id}/ban`);
      setUsers((current) => current.map((user) => (user.id === id ? { ...user, is_banned: true } : user)));
      void Swal.fire({ icon: "success", title: "Banned", text: "User account suspended.", timer: 1400, showConfirmButton: false, background: "#020617", color: "#e2e8f0" });
    } catch (error) {
      console.error(error);
      void Swal.fire({ icon: "error", title: "Failed", text: "Could not ban user.", background: "#020617", color: "#e2e8f0" });
    }
  };

  const handleUnbanUser = async (id: number) => {
    try {
      await axios.post(`/api/admin/users/${id}/unban`);
      setUsers((current) => current.map((user) => (user.id === id ? { ...user, is_banned: false } : user)));
      void Swal.fire({ icon: "success", title: "Unbanned", text: "User account reactivated.", timer: 1400, showConfirmButton: false, background: "#020617", color: "#e2e8f0" });
    } catch (error) {
      console.error(error);
      void Swal.fire({ icon: "error", title: "Failed", text: "Could not unban user.", background: "#020617", color: "#e2e8f0" });
    }
  };

  const handleValidateMature = async (id: number) => {
    const result = await Swal.fire({
      title: "Confirm mature tag?",
      text: "Validate this novel's mature status.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirm",
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#334155",
      background: "#020617",
      color: "#e2e8f0",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.post(`/api/admin/novels/${id}/validate-mature`);
      setMatureNovels((current) => current.filter((novel) => novel.id !== id));
      void Swal.fire({ icon: "success", title: "Validated", text: "Mature tag approved.", timer: 1400, showConfirmButton: false, background: "#020617", color: "#e2e8f0" });
    } catch (error) {
      console.error(error);
      void Swal.fire({ icon: "error", title: "Failed", text: "Could not validate mature tag.", background: "#020617", color: "#e2e8f0" });
    }
  };

  const handleRejectMature = async (id: number) => {
    const result = await Swal.fire({
      title: "Reject mature tag?",
      text: "The novel will be published as safe content.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Reject tag",
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#334155",
      background: "#020617",
      color: "#e2e8f0",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.post(`/api/admin/novels/${id}/reject-mature`);
      setMatureNovels((current) => current.filter((novel) => novel.id !== id));
      void Swal.fire({ icon: "success", title: "Rejected", text: "Mature tag removed.", timer: 1400, showConfirmButton: false, background: "#020617", color: "#e2e8f0" });
    } catch (error) {
      console.error(error);
      void Swal.fire({ icon: "error", title: "Failed", text: "Could not reject mature tag.", background: "#020617", color: "#e2e8f0" });
    }
  };

  const StatCard = ({ title, value, icon: Icon, accent }: { title: string; value: number; icon: typeof BarChart3; accent: string }) => (
    <Card className="border-slate-800/80 bg-slate-950/75">
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
        </div>
        <div className={`rounded-2xl border border-slate-800 p-3 ${accent}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Card className="overflow-hidden border-slate-800/80 bg-slate-950/75">
        <CardHeader className="space-y-4 p-8 sm:p-10">
          <Badge className="w-fit border-0 bg-indigo-600/20 text-indigo-200 hover:bg-indigo-600/20">
            <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
            Admin control center
          </Badge>
          <div>
            <CardTitle className="text-4xl font-black tracking-tight text-white sm:text-5xl">Command the platform from one dashboard.</CardTitle>
            <CardDescription className="mt-3 max-w-2xl text-base text-slate-300">
              Dashboard for analytics, Reviews for chapter and mature moderation, Assets for novels and users, and Logs for audit history.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(tabMeta) as AdminTab[]).map((key) => {
          const meta = tabMeta[key];
          const Icon = meta.icon;
          return (
            <Button
              key={key}
              variant={tab === key ? "default" : "outline"}
              className="justify-start rounded-2xl px-4 py-6 text-left"
              onClick={() => setTab(key)}
            >
              <Icon className="mr-3 h-4 w-4" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold">{meta.label}</span>
                <span className="text-xs text-current/70">{key === "dashboard" ? "Analytics and trends" : key === "reviews" ? "Moderation queue" : key === "assets" ? "Users and novels" : "Audit trail"}</span>
              </div>
            </Button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-300">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />
        </div>
      ) : null}

      {!loading && tab === "dashboard" && analytics ? (
        <div className="mt-8 space-y-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total Users" value={analytics.summary?.totalUsers ?? 0} icon={Users} accent="bg-indigo-600/20" />
            <StatCard title="Total Novels" value={analytics.summary?.totalNovels ?? 0} icon={BookText} accent="bg-emerald-600/20" />
            <StatCard title="Total Chapters" value={analytics.summary?.totalChapters ?? 0} icon={FileText} accent="bg-amber-600/20" />
            <StatCard title="Total Comments" value={analytics.summary?.totalComments ?? 0} icon={Logs} accent="bg-rose-600/20" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-slate-800/80 bg-slate-950/75">
              <CardHeader>
                <CardTitle className="text-xl">30-day user growth</CardTitle>
                <CardDescription>New registrations over time.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.dailyNewUsers ?? []}>
                      <defs>
                        <linearGradient id="userGrowth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#818cf8" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 16, background: "#020617", border: "1px solid #1f2937", color: "#e2e8f0" }} />
                      <Area type="monotone" dataKey="count" stroke="#818cf8" strokeWidth={2} fill="url(#userGrowth)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800/80 bg-slate-950/75">
              <CardHeader>
                <CardTitle className="text-xl">Top novels by views</CardTitle>
                <CardDescription>Most watched books on the platform.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.topNovels ?? []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                      <XAxis dataKey="title" stroke="#64748b" fontSize={11} tickLine={false} interval={0} angle={-15} height={60} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 16, background: "#020617", border: "1px solid #1f2937", color: "#e2e8f0" }} />
                      <Bar dataKey="view_count" fill="#8b5cf6" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-slate-800/80 bg-slate-950/75">
              <CardHeader>
                <CardTitle className="text-xl">Genre distribution</CardTitle>
                <CardDescription>Where the catalog is growing.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.genreStats ?? []} dataKey="count" nameKey="genre" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4}>
                          {(analytics.genreStats ?? []).map((entry, index) => (
                            <Cell key={`${entry.genre}-${index}`} fill={[
                              "#818cf8",
                              "#22c55e",
                              "#f59e0b",
                              "#ef4444",
                              "#8b5cf6",
                              "#ec4899",
                              "#06b6d4",
                              "#14b8a6",
                            ][index % 8]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 16, background: "#020617", border: "1px solid #1f2937", color: "#e2e8f0" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {(analytics.genreStats ?? []).map((entry, index) => (
                      <div key={entry.genre} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ["#818cf8", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6"][index % 8] }} />
                          {entry.genre}
                        </span>
                        <span className="font-semibold text-white">{entry.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800/80 bg-slate-950/75">
              <CardHeader>
                <CardTitle className="text-xl">Chapter status</CardTitle>
                <CardDescription>Queue state for moderation and publishing.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {(analytics.chapterStatusStats ?? []).map((entry, index) => (
                    <div key={entry.status} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
                      <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">{entry.status}</span>
                      <Badge variant={index % 2 === 0 ? "secondary" : "outline"}>{entry.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {!loading && tab === "reviews" ? (
        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <Card className="border-slate-800/80 bg-slate-950/75">
            <CardHeader>
              <CardTitle className="text-xl">Chapter reviews</CardTitle>
              <CardDescription>Approve or reject chapter submissions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {manuscripts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">No chapters pending review.</div>
              ) : manuscripts.map((manuscript) => (
                <div key={manuscript.id} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex gap-4">
                    {manuscript.novel?.cover_image ? (
                      <img src={manuscript.novel.cover_image} alt="" className="h-24 w-16 rounded-xl object-cover" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-white">{manuscript.novel?.title ?? "Untitled novel"}</h3>
                      <p className="mt-1 text-xs text-slate-400">Chapter: {manuscript.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{manuscript.novel?.author?.username ?? "Unknown author"}</p>
                      <Badge variant="muted" className="mt-3 w-fit">{manuscript._count?.paragraph_blocks ?? 0} blocks</Badge>
                    </div>
                  </div>
                  <p className="line-clamp-4 text-sm leading-6 text-slate-300">{manuscript.content?.slice(0, 280)}{manuscript.content?.length > 280 ? "..." : ""}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button className="rounded-full" onClick={() => void handleApproveManuscript(manuscript.id)}>Approve</Button>
                    <Button variant="destructive" className="rounded-full" onClick={() => { setRejectModal(manuscript); setRejectForm({ rejection_title: "", rejection_reason: "" }); }}>Reject</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-800/80 bg-slate-950/75">
            <CardHeader>
              <CardTitle className="text-xl">Mature reviews</CardTitle>
              <CardDescription>Validate or reject mature content labels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {matureNovels.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">No novels pending mature review.</div>
              ) : matureNovels.map((novel) => (
                <div key={novel.id} className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    {novel.cover_image ? <img src={novel.cover_image} alt="" className="h-20 w-16 rounded-xl object-cover blur-sm" /> : <div className="h-20 w-16 rounded-xl bg-slate-800" />}
                    <div>
                      <h3 className="font-semibold text-white">{novel.title}</h3>
                      <p className="mt-1 text-xs text-slate-400">{novel.author?.username ?? "Unknown author"}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(novel.genres ?? []).map((genre) => <Badge key={genre.genre} variant="secondary">{genre.genre}</Badge>)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="rounded-full" onClick={() => void handleValidateMature(novel.id)}>Confirm</Button>
                    <Button variant="outline" className="rounded-full" onClick={() => void handleRejectMature(novel.id)}>Reject</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && tab === "assets" ? (
        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <Card className="border-slate-800/80 bg-slate-950/75">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle className="text-xl">Users</CardTitle>
                <CardDescription>Search and moderate accounts.</CardDescription>
              </div>
              <div className="w-full sm:w-80">
                <Input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search username or email..." />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {users.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">No users found.</div>
              ) : users.map((user) => (
                <div key={user.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-sm font-bold text-white">
                      {user.profile_image ? <img src={user.profile_image} alt="" className="h-full w-full object-cover" /> : user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{user.username}</p>
                      <p className="truncate text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.is_banned ? "destructive" : "secondary"}>{user.is_banned ? "Banned" : user.role}</Badge>
                    {user.role !== "ADMIN" ? (
                      user.is_banned ? <Button variant="outline" size="sm" onClick={() => void handleUnbanUser(user.id)}>Unban</Button> : <Button variant="destructive" size="sm" onClick={() => void handleBanUser(user.id)}>Ban</Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-800/80 bg-slate-950/75">
            <CardHeader>
              <CardTitle className="text-xl">Novels</CardTitle>
              <CardDescription>Review publication state and mature locks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {novels.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">No novels found.</div>
              ) : novels.map((novel) => (
                <div key={novel.id} className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-white">{novel.title}</h3>
                      {novel.is_mature ? <Badge variant="destructive">18+</Badge> : null}
                      {novel.admin_locked ? <Badge variant="outline">Locked</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{novel.author?.username ?? "Unknown author"}</p>
                    <p className="mt-1 text-xs text-slate-500">{novel._count?.chapters ?? 0} chapters</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {novel.is_active ? <Button variant="outline" size="sm" onClick={() => void handleDeactivateNovel(novel.id)}>Deactivate</Button> : <Button size="sm" onClick={() => void handleReactivateNovel(novel.id)}>Reactivate</Button>}
                    {!novel.admin_locked ? <Button variant="destructive" size="sm" onClick={() => void handleTagMatureLock(novel.id)}>Lock mature</Button> : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && tab === "logs" ? (
        <Card className="mt-8 border-slate-800/80 bg-slate-950/75">
          <CardHeader>
            <CardTitle className="text-xl">Audit logs</CardTitle>
            <CardDescription>Administrative actions and recent moderation history.</CardDescription>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">No audit logs found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="border-b border-slate-800 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Admin</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Target</th>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-800/70 hover:bg-slate-900/50">
                        <td className="px-4 py-4 font-medium text-white">{log.admin_username}</td>
                        <td className="px-4 py-4">
                          <Badge variant="muted">{log.action}</Badge>
                        </td>
                        <td className="px-4 py-4 text-slate-400">{log.target_type}</td>
                        <td className="px-4 py-4 text-white">#{log.target_id}</td>
                        <td className="px-4 py-4 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {rejectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <Card className="w-full max-w-xl border-slate-800/80 bg-slate-950 shadow-2xl shadow-black/50">
            <CardHeader>
              <CardTitle className="text-2xl">Reject chapter</CardTitle>
              <CardDescription>Tell the author what needs to change.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input value={rejectForm.rejection_title} onChange={(event) => setRejectForm((current) => ({ ...current, rejection_title: event.target.value }))} placeholder="Rejection title" />
              <textarea
                value={rejectForm.rejection_reason}
                onChange={(event) => setRejectForm((current) => ({ ...current, rejection_reason: event.target.value }))}
                placeholder="Reason and required changes"
                className="min-h-36 w-full rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              />
              <div className="flex gap-3">
                <Button className="flex-1 rounded-full" onClick={() => void handleRejectManuscript(rejectModal.id)}>Send rejection</Button>
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => setRejectModal(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
