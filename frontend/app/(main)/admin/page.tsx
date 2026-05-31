"use client";

import { useEffect, useState } from "react";
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
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";

export default function AdminPage() {
  const [tab, setTab] = useState<"users" | "novels" | "manuscripts" | "analytics" | "mature" | "audit" | "security">("analytics");
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [novels, setNovels] = useState<any[]>([]);
  const [manuscripts, setManuscripts] = useState<any[]>([]);
  const [matureNovels, setMatureNovels] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [mfaSetup, setMfaSetup] = useState<{ qr: string; manual: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [rejectModal, setRejectModal] = useState<any>(null);
  const [rejectForm, setRejectForm] = useState({ rejection_title: "", rejection_reason: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === "users") {
        const res = await axios.get(`/api/admin/users?search=${encodeURIComponent(userSearch)}`);
        setUsers(res.data.users || []);
      } else if (tab === "novels") {
        const res = await axios.get(`/api/admin/novels`);
        setNovels(res.data.novels || []);
      } else if (tab === "manuscripts") {
        const res = await axios.get(`/api/admin/manuscripts`);
        setManuscripts(res.data.manuscripts || []);
      } else if (tab === "mature") {
        const res = await axios.get(`/api/admin/novels/mature-pending`);
        setMatureNovels(res.data.novels || []);
      } else if (tab === "audit") {
        const res = await axios.get(`/api/admin/audit-logs`);
        setAuditLogs(res.data.logs || []);
      } else if (tab === "analytics") {
        const res = await axios.get(`/api/admin/analytics`);
        setAnalytics(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (tab === "security") loadMfaStatus();
  }, [tab]);

  const loadMfaStatus = async () => {
    setMfaLoading(true);
    try {
      const res = await axios.get(`/api/admin/mfa`);
      setMfaEnabled(Boolean(res.data.mfaEnabled));
      if (res.data.setup) setMfaSetup(res.data.setup);
      else setMfaSetup(null);
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Failed', text: 'Could not load MFA status' });
    } finally {
      setMfaLoading(false);
    }
  };

  const startMfaSetup = async () => {
    setMfaLoading(true);
    try {
      const res = await axios.patch(`/api/admin/mfa`, { action: 'setup' });
      setMfaSetup(res.data.setup);
      Swal.fire({ icon: 'info', title: 'Scan QR', text: 'Scan the QR with your authenticator or copy the manual code.' });
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Failed', text: 'Could not start MFA setup' });
    } finally { setMfaLoading(false); }
  };

  const confirmMfaSetup = async () => {
    if (!mfaCode.trim()) return Swal.fire({ icon: 'warning', title: 'Enter code', text: 'Please enter the 6-digit code from your authenticator.' });
    setMfaLoading(true);
    try {
      const res = await axios.patch(`/api/admin/mfa`, { action: 'confirm', code: mfaCode.trim() });
      Swal.fire({ icon: 'success', title: 'Enabled', text: res.data.message || 'MFA enabled' });
      setMfaCode('');
      setMfaSetup(null);
      setMfaEnabled(true);
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.message || 'Could not confirm code';
      Swal.fire({ icon: 'error', title: 'Failed', text: msg });
    } finally { setMfaLoading(false); }
  };

  const disableMfa = async () => {
    const result = await Swal.fire({ title: 'Disable MFA?', text: 'This will remove MFA from your account.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Disable' });
    if (!result.isConfirmed) return;
    setMfaLoading(true);
    try {
      await axios.patch(`/api/admin/mfa`, { action: 'disable' });
      Swal.fire({ icon: 'success', title: 'Disabled', text: 'MFA has been disabled.' });
      setMfaEnabled(false);
      setMfaSetup(null);
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Failed', text: 'Could not disable MFA' });
    } finally { setMfaLoading(false); }
  };

  const handleUserSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "users") {
      loadData();
    }
  };

  const handleApproveManuscript = async (id: number) => {
    const result = await Swal.fire({
      title: "Approve Chapter?",
      text: "This chapter will be published immediately.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10B981",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, approve"
    });

    if (!result.isConfirmed) return;

    try {
      await axios.post(`/api/admin/manuscripts/${id}/approve`);
      Swal.fire({
        icon: "success",
        title: "Approved",
        text: "Manuscript approved and published!",
        timer: 1500,
        showConfirmButton: false
      });
      setManuscripts(manuscripts.filter(m => m.id !== id));
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Could not approve manuscript."
      });
    }
  };

  const handleRejectManuscript = async (id: number) => {
    if (!rejectForm.rejection_title.trim() || !rejectForm.rejection_reason.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Incomplete Form",
        text: "Please fill out both rejection title and reason."
      });
      return;
    }

    try {
      await axios.post(`/api/admin/manuscripts/${id}/reject`, rejectForm);
      Swal.fire({
        icon: "success",
        title: "Rejected",
        text: "Manuscript rejected and author notified.",
        timer: 2000,
        showConfirmButton: false
      });
      setManuscripts(manuscripts.filter(m => m.id !== id));
      setRejectModal(null);
      setRejectForm({ rejection_title: "", rejection_reason: "" });
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Could not reject manuscript."
      });
    }
  };

  const handleDeactivateNovel = async (id: number) => {
    const result = await Swal.fire({
      title: "Deactivate Novel?",
      text: "This novel and all its chapters will be hidden from users.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, deactivate"
    });

    if (!result.isConfirmed) return;

    try {
      await axios.post(`/api/admin/novels/${id}/deactivate`);
      Swal.fire({
        icon: "success",
        title: "Deactivated",
        text: "Novel has been hidden.",
        timer: 1500,
        showConfirmButton: false
      });
      setNovels(novels.map(n => n.id === id ? { ...n, is_active: false } : n));
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Could not deactivate novel."
      });
    }
  };

  const handleReactivateNovel = async (id: number) => {
    try {
      await axios.post(`/api/admin/novels/${id}/reactivate`);
      Swal.fire({
        icon: "success",
        title: "Reactivated",
        text: "Novel is now active and visible.",
        timer: 1500,
        showConfirmButton: false
      });
      setNovels(novels.map(n => n.id === id ? { ...n, is_active: true } : n));
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Could not reactivate novel."
      });
    }
  };

  const handleTagMatureLock = async (id: number) => {
    const result = await Swal.fire({
      title: "Tag as Mature and Lock?",
      text: "Tag this novel as mature and admin-lock it. The author will be blocked from toggling it back to normal.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, lock as mature"
    });

    if (!result.isConfirmed) return;

    try {
      await axios.post(`/api/admin/novels/${id}/tag-mature`);
      Swal.fire({
        icon: "success",
        title: "Mature Locked",
        text: "Novel has been locked as mature.",
        timer: 1500,
        showConfirmButton: false
      });
      // Refresh novels list to reflect new lock state
      if (tab === "novels") {
        const res = await axios.get(`/api/admin/novels`);
        setNovels(res.data.novels || []);
      }
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Could not lock novel as mature."
      });
    }
  };

  const handleBanUser = async (id: number) => {
    const result = await Swal.fire({
      title: "Ban User Account?",
      text: "This user will be banned immediately and blocked from logging in.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, ban user"
    });

    if (!result.isConfirmed) return;

    try {
      await axios.post(`/api/admin/users/${id}/ban`);
      Swal.fire({
        icon: "success",
        title: "Banned",
        text: "Account has been suspended.",
        timer: 1500,
        showConfirmButton: false
      });
      setUsers(users.map(u => u.id === id ? { ...u, is_banned: true } : u));
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Could not ban user account."
      });
    }
  };

  const handleUnbanUser = async (id: number) => {
    try {
      await axios.post(`/api/admin/users/${id}/unban`);
      Swal.fire({
        icon: "success",
        title: "Unbanned",
        text: "Account has been reactivated.",
        timer: 1500,
        showConfirmButton: false
      });
      setUsers(users.map(u => u.id === id ? { ...u, is_banned: false } : u));
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Could not unban user account."
      });
    }
  };

  const handleValidateMature = async (id: number) => {
    const result = await Swal.fire({
      title: "Approve Mature Tag?",
      text: "Validate this novel contains mature content. It will be published blurred.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3B82F6",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, confirm"
    });

    if (!result.isConfirmed) return;

    try {
      await axios.post(`/api/admin/novels/${id}/validate-mature`);
      Swal.fire({
        icon: "success",
        title: "Validated!",
        text: "Novel is active and tagged mature.",
        timer: 1500,
        showConfirmButton: false
      });
      setMatureNovels(matureNovels.filter(n => n.id !== id));
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Could not validate mature tagging."
      });
    }
  };

  const handleRejectMature = async (id: number) => {
    const result = await Swal.fire({
      title: "Reject Mature Tag?",
      text: "Remove mature tag and publish this novel as safe/standard.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#F59E0B",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Reject tag"
    });

    if (!result.isConfirmed) return;

    try {
      await axios.post(`/api/admin/novels/${id}/reject-mature`);
      Swal.fire({
        icon: "success",
        title: "Mature tag removed",
        text: "Novel published as safe content.",
        timer: 1500,
        showConfirmButton: false
      });
      setMatureNovels(matureNovels.filter(n => n.id !== id));
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Could not reject mature status."
      });
    }
  };

  const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#3B82F6", "#14B8A6"];

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-slate-50/30">
      <h1 className="text-4xl font-extrabold mb-8 text-gray-900 border-b pb-4 flex items-center gap-3">
        🛡️ Admin Control Panel
      </h1>

      {/* Tabs list */}
      <div className="flex gap-2 mb-8 flex-wrap">
        <button onClick={() => setTab("analytics")} className={`px-4 py-2.5 rounded-xl font-bold transition duration-200 cursor-pointer ${tab === "analytics" ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-150' : 'bg-white text-gray-600 border border-gray-150 hover:bg-gray-100'}`}>
          📊 Analytics
        </button>
        <button onClick={() => setTab("manuscripts")} className={`px-4 py-2.5 rounded-xl font-bold transition duration-200 cursor-pointer ${tab === "manuscripts" ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-150' : 'bg-white text-gray-600 border border-gray-150 hover:bg-gray-100'}`}>
          📄 Chapters ({manuscripts.length})
        </button>
        <button onClick={() => setTab("mature")} className={`px-4 py-2.5 rounded-xl font-bold transition duration-200 cursor-pointer ${tab === "mature" ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-150' : 'bg-white text-gray-600 border border-gray-150 hover:bg-gray-100'}`}>
          🔞 Mature Reviews ({matureNovels.length})
        </button>
        <button onClick={() => setTab("novels")} className={`px-4 py-2.5 rounded-xl font-bold transition duration-200 cursor-pointer ${tab === "novels" ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-150' : 'bg-white text-gray-600 border border-gray-150 hover:bg-gray-100'}`}>
          📚 Novels
        </button>
        <button onClick={() => setTab("users")} className={`px-4 py-2.5 rounded-xl font-bold transition duration-200 cursor-pointer ${tab === "users" ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-150' : 'bg-white text-gray-600 border border-gray-150 hover:bg-gray-100'}`}>
          👥 Users
        </button>
        <button onClick={() => setTab("audit")} className={`px-4 py-2.5 rounded-xl font-bold transition duration-200 cursor-pointer ${tab === "audit" ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-150' : 'bg-white text-gray-600 border border-gray-150 hover:bg-gray-100'}`}>
          📜 Audit Logs
        </button>
        <button onClick={() => setTab("security")} className={`px-4 py-2.5 rounded-xl font-bold transition duration-200 cursor-pointer ${tab === "security" ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-150' : 'bg-white text-gray-600 border border-gray-150 hover:bg-gray-100'}`}>
          🔐 Security
        </button>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {/* Analytics Tab */}
      {tab === "analytics" && analytics && !loading && (
        <div className="space-y-8">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Users</div>
                <div className="text-3xl font-extrabold mt-2 text-gray-900">{analytics.summary?.totalUsers || 0}</div>
              </div>
              <div className="text-3xl bg-indigo-50 p-3 rounded-2xl">👥</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Novels</div>
                <div className="text-3xl font-extrabold mt-2 text-gray-900">{analytics.summary?.totalNovels || 0}</div>
              </div>
              <div className="text-3xl bg-emerald-50 p-3 rounded-2xl">📚</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Chapters</div>
                <div className="text-3xl font-extrabold mt-2 text-gray-900">{analytics.summary?.totalChapters || 0}</div>
              </div>
              <div className="text-3xl bg-amber-50 p-3 rounded-2xl">📝</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150 flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Comments</div>
                <div className="text-3xl font-extrabold mt-2 text-gray-900">{analytics.summary?.totalComments || 0}</div>
              </div>
              <div className="text-3xl bg-pink-50 p-3 rounded-2xl">💬</div>
            </div>
          </div>

          {/* Recharts Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Daily user growth Line Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150">
              <h3 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-1.5">📈 30-Day User Registrations</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.dailyNewUsers || []}>
                    <defs>
                      <linearGradient id="userGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                    <Area type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#userGrowth)" name="New Registrations" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Novels Bar Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150">
              <h3 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-1.5">📊 Top Novels by View Count</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.topNovels || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="title" stroke="#9CA3AF" fontSize={11} tickLine={false} tickFormatter={(val) => val.length > 15 ? val.slice(0, 15) + "..." : val} />
                    <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                    <Bar dataKey="view_count" fill="#8B5CF6" name="Total Views" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Genre Distribution Pie Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150">
              <h3 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-1.5">🍩 Genre Distribution</h3>
              <div className="h-72 w-full flex flex-col md:flex-row items-center justify-between">
                {analytics.genreStats?.length === 0 ? (
                  <div className="w-full text-center text-gray-400 italic">No genre data available</div>
                ) : (
                  <>
                    <div className="h-full w-full md:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.genreStats || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="count"
                            nameKey="genre"
                          >
                            {(analytics.genreStats || []).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full md:w-1/2 flex flex-col gap-2 mt-4 md:mt-0 overflow-y-auto max-h-60 pr-2">
                      {(analytics.genreStats || []).map((g: any, index: number) => (
                        <div key={g.genre} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                            <span className="font-medium text-gray-700">{g.genre}</span>
                          </div>
                          <span className="font-extrabold text-gray-950">{g.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Chapter status breakdown distribution */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150">
              <h3 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-1.5">🛡️ Manuscript Chapter Status</h3>
              <div className="h-72 w-full flex flex-col md:flex-row items-center justify-between">
                {analytics.chapterStatusStats?.length === 0 ? (
                  <div className="w-full text-center text-gray-400 italic">No status data available</div>
                ) : (
                  <>
                    <div className="h-full w-full md:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.chapterStatusStats || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius={85}
                            dataKey="count"
                            nameKey="status"
                          >
                            {(analytics.chapterStatusStats || []).map((entry: any, index: number) => (
                              <Cell key={`cell-status-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full md:w-1/2 flex flex-col gap-2 mt-4 md:mt-0">
                      {(analytics.chapterStatusStats || []).map((c: any, index: number) => (
                        <div key={c.status} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(index + 3) % COLORS.length] }}></span>
                            <span className="font-bold text-gray-700 text-xs font-mono">{c.status}</span>
                          </div>
                          <span className="font-extrabold text-gray-950">{c.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {tab === "security" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-150">
          <h2 className="text-2xl font-bold mb-4">Security & MFA</h2>
          {mfaLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Multi-factor authentication (TOTP)</div>
                <div className="mt-2 font-semibold">Status: {mfaEnabled ? <span className="text-green-600">Enabled</span> : <span className="text-gray-600">Disabled</span>}</div>
              </div>

              {!mfaEnabled && !mfaSetup && (
                <div className="flex gap-2">
                  <button onClick={startMfaSetup} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Set up MFA</button>
                </div>
              )}

              {mfaSetup && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                  <div className="sm:col-span-1">
                    <img src={mfaSetup.qr} alt="MFA QR" className="w-48 h-48 bg-white p-2 rounded-md shadow" />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="mb-2">Manual code:</div>
                    <div className="font-mono bg-gray-50 p-2 rounded">{mfaSetup.manual}</div>
                    <div className="mt-4">
                      <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="123456" className="px-3 py-2 border rounded mr-2" />
                      <button onClick={confirmMfaSetup} className="px-4 py-2 rounded-lg bg-green-600 text-white">Confirm</button>
                    </div>
                  </div>
                </div>
              )}

              {mfaEnabled && (
                <div>
                  <button onClick={disableMfa} className="px-4 py-2 rounded-lg bg-red-600 text-white">Disable MFA</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manuscripts Tab */}
      {tab === "manuscripts" && !loading && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-150">
          <h2 className="text-xl font-bold mb-6 text-gray-900 border-b pb-4">Pending Chapters Review</h2>
          {manuscripts.length === 0 ? (
            <p className="text-gray-500 italic py-6 text-center">No chapters pending review</p>
          ) : (
            <div className="space-y-6">
              {manuscripts.map((m: any) => (
                <div key={m.id} className="border rounded-2xl p-6 flex flex-col gap-4 bg-slate-50/50 border-gray-200 hover:shadow-sm transition">
                  <div className="flex gap-4 items-start">
                    {m.novel?.cover_image && (
                      <div className="w-16 h-24 bg-gray-200 rounded-xl overflow-hidden shadow-sm shrink-0 relative border border-gray-100">
                        <img src={m.novel.cover_image} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-grow min-w-0">
                      <h3 className="font-black text-gray-900 text-base">{m.novel?.title}</h3>
                      <p className="text-sm font-extrabold text-indigo-650 mt-0.5">Chapter: {m.title}</p>
                      <p className="text-[11px] text-gray-500 font-medium mt-1">Submitted by {m.novel?.author?.username} ({m.novel?.author?.email}) • {new Date(m.created_at).toLocaleDateString()}</p>
                      <div className="mt-2 text-xs font-bold bg-indigo-50 border border-indigo-100/50 w-fit px-2.5 py-1 rounded-lg text-indigo-700">
                        📄 Slides: {m._count?.paragraph_blocks || 0}
                      </div>
                    </div>
                  </div>

                  {/* Manuscript Preview Box */}
                  <div className="bg-white p-4 rounded-xl border border-gray-100">
                    <div className="text-[11px] text-gray-400 font-black uppercase tracking-wider mb-1">Content Preview</div>
                    <p className="text-xs text-gray-650 leading-relaxed font-light italic">
                      {m.content ? (m.content.slice(0, 300) + (m.content.length > 300 ? "..." : "")) : "No content provided."}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => handleApproveManuscript(m.id)}
                      className="px-5 py-2.5 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl font-bold transition text-xs shadow-sm shadow-emerald-100 cursor-pointer"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => {
                        setRejectModal(m.id);
                        setRejectForm({ rejection_title: "", rejection_reason: "" });
                      }}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition text-xs shadow-sm shadow-red-100 cursor-pointer"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mature Reviews Tab */}
      {tab === "mature" && !loading && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-150">
          <h2 className="text-xl font-bold mb-6 text-gray-900 border-b pb-4">Mature Content Tag Review</h2>
          {matureNovels.length === 0 ? (
            <p className="text-gray-500 italic py-6 text-center">No novels pending mature tagging review</p>
          ) : (
            <div className="space-y-4">
              {matureNovels.map((n: any) => (
                <div key={n.id} className="border rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/50 border-gray-200 gap-4 hover:shadow-sm transition">
                  <div className="flex gap-4 items-center">
                    {n.cover_image && (
                      <div className="w-16 h-20 bg-gray-200 rounded-xl overflow-hidden shadow-sm shrink-0 relative border border-gray-100">
                        <img src={n.cover_image} alt="" className="w-full h-full object-cover blur-sm scale-110" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <span className="text-[10px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded-full">18+</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <h3 className="font-black text-gray-900 text-base">{n.title}</h3>
                      <p className="text-xs text-gray-500 font-semibold mt-1">Author: {n.author?.username}</p>
                      <div className="flex gap-1 flex-wrap mt-2">
                        {n.genres?.map((g: any) => (
                          <span key={g.genre} className="text-[9px] font-bold bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-md text-indigo-600">{g.genre}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleValidateMature(n.id)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition text-xs shadow-sm cursor-pointer"
                    >
                      Confirm Mature Tag
                    </button>
                    <button
                      onClick={() => handleRejectMature(n.id)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition text-xs shadow-sm cursor-pointer"
                    >
                      Reject Tag (Make Safe)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Novels Tab */}
      {tab === "novels" && !loading && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-150">
          <h2 className="text-xl font-bold mb-6 text-gray-900 border-b pb-4">All Novels</h2>
          <div className="overflow-x-auto animate-fadeIn">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="border-b text-gray-800 font-semibold bg-gray-50">
                <tr>
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Author</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Chapters</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {novels.map((n: any) => (
                  <tr key={n.id} className="border-b hover:bg-slate-50/50 transition">
                    <td className="py-4 px-4 font-extrabold text-gray-950 flex items-center gap-2">
                      {n.title}
                      {n.is_mature && <span className="bg-red-50 border border-red-100 text-red-750 text-[9px] font-black px-2 py-0.5 rounded-full">18+ MATURE</span>}
                      {n.admin_locked && <span className="bg-amber-50 border border-amber-100 text-amber-750 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5">🔒 LOCKED</span>}
                    </td>
                    <td className="py-4 px-4 font-medium">{n.author?.username}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wider ${n.is_active ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-slate-100 border border-slate-200 text-slate-600'}`}>
                        {n.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-black text-slate-700">{n._count?.chapters || 0}</td>
                    <td className="py-4 px-4 text-center flex items-center justify-center gap-2">
                      {n.is_active ? (
                        <button
                          onClick={() => handleDeactivateNovel(n.id)}
                          className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded-xl text-xs font-extrabold transition cursor-pointer"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivateNovel(n.id)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-700 rounded-xl text-xs font-extrabold transition cursor-pointer"
                        >
                          Reactivate
                        </button>
                      )}
                      {!n.admin_locked && (
                        <button
                          onClick={() => handleTagMatureLock(n.id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-extrabold transition cursor-pointer"
                        >
                          Tag Mature (Lock)
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === "users" && !loading && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-150">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 border-b pb-4 gap-4">
            <h2 className="text-xl font-bold text-gray-900">Users Directory</h2>
            
            {/* Search Form */}
            <form onSubmit={handleUserSearch} className="relative w-full sm:max-w-xs">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by username or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-xs font-medium"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="border-b text-gray-800 font-semibold bg-gray-50">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Joined</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b hover:bg-slate-50/50 transition">
                    <td className="py-4 px-4 font-bold text-gray-950 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold overflow-hidden">
                        {u.profile_image ? (
                          <img src={u.profile_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          u.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      {u.username}
                    </td>
                    <td className="py-4 px-4 font-medium">{u.email}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${u.is_banned ? 'bg-red-50 border border-red-100 text-red-700' : 'bg-green-50 border border-green-150 text-green-700'}`}>
                        {u.is_banned ? 'BANNED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-500 font-medium">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-4 px-4 text-center">
                      {u.role !== 'ADMIN' && (
                        u.is_banned ? (
                          <button
                            onClick={() => handleUnbanUser(u.id)}
                            className="px-3.5 py-1.5 bg-green-50 hover:bg-green-105 border border-green-200 text-green-700 rounded-xl text-xs font-extrabold transition cursor-pointer"
                          >
                            Unban Account
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBanUser(u.id)}
                            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-105 border border-red-200 text-red-750 rounded-xl text-xs font-extrabold transition cursor-pointer"
                          >
                            Ban Account
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {tab === "audit" && !loading && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-150">
          <h2 className="text-xl font-bold mb-6 text-gray-900 border-b pb-4">Administrative Audit Logs</h2>
          {auditLogs.length === 0 ? (
            <p className="text-gray-500 italic py-6 text-center">No audit logs found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="border-b text-gray-800 font-semibold bg-gray-50">
                  <tr>
                    <th className="py-3 px-4">Admin</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Type</th>
                    <th className="py-3 px-4">Target ID</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log: any) => (
                    <tr key={log.id} className="border-b hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-semibold text-gray-900">{log.admin_username}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-800 font-bold uppercase">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider">{log.target_type}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-800">#{log.target_id}</td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 font-semibold">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-100 animate-scaleUp">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Reject Manuscript</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRejectManuscript(rejectModal);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Rejection Title</label>
                <input
                  type="text"
                  value={rejectForm.rejection_title}
                  onChange={(e) => setRejectForm({ ...rejectForm, rejection_title: e.target.value })}
                  placeholder="e.g., Grammar & Punctuation Issues"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Reason Description</label>
                <textarea
                  value={rejectForm.rejection_reason}
                  onChange={(e) => setRejectForm({ ...rejectForm, rejection_reason: e.target.value })}
                  placeholder="Please specify why this manuscript was rejected, indicating changes needed by the author..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm h-28 resize-none outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-red-650 text-white py-2.5 rounded-xl font-bold hover:bg-red-700 transition shadow-sm text-sm cursor-pointer">
                  Send Rejection
                </button>
                <button
                  type="button"
                  onClick={() => setRejectModal(null)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition text-sm cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
