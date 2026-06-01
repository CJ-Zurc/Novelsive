"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    const [profile, setProfile] = useState({
        username: "",
        email: "",
        date_of_birth: "",
        role: "USER",
        profile_image: ""
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [mfaLoading, setMfaLoading] = useState(false);
    const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
    const [mfaSetup, setMfaSetup] = useState<{ qr: string; manual: string } | null>(null);
    const [mfaCode, setMfaCode] = useState("");
    const swalTheme = { background: "#020617", color: "#e2e8f0", confirmButtonColor: "#4f46e5" };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get("/api/user/profile");
                const data = res.data.user;
                setProfile({
                    username: data.username || "",
                    email: data.email || "",
                    date_of_birth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : "",
                    role: data.role || "USER",
                    profile_image: data.profile_image || ""
                });
            } catch (err: any) {
                if (err.response?.status === 401) {
                    router.push("/login");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [router]);

    // When profile is loaded and user is admin, load MFA status
    useEffect(() => {
        if (!loading && profile.role === 'ADMIN') {
            loadMfaStatus();
        }
    }, [loading, profile.role]);

    const loadMfaStatus = async () => {
        setMfaLoading(true);
        try {
            const res = await axios.get('/api/admin/mfa');
            setMfaEnabled(Boolean(res.data.mfaEnabled));
            if (res.data.setup) setMfaSetup(res.data.setup);
            else setMfaSetup(null);
        } catch (e) {
            console.error(e);
        } finally { setMfaLoading(false); }
    };

    const startMfaSetup = async () => {
        setMfaLoading(true);
        try {
            const res = await axios.patch('/api/admin/mfa', { action: 'setup' });
            setMfaSetup(res.data.setup);
            Swal.fire({ icon: 'info', title: 'Scan QR', text: 'Scan the QR with your authenticator or copy the manual code.', ...swalTheme });
        } catch (e) { console.error(e); Swal.fire({ icon: 'error', title: 'Failed', text: 'Could not start MFA setup' }); }
        finally { setMfaLoading(false); }
    };

    const confirmMfaSetup = async () => {
        if (!mfaCode.trim()) return Swal.fire({ icon: 'warning', title: 'Enter code', text: 'Please enter the 6-digit code from your authenticator.', ...swalTheme });
        setMfaLoading(true);
        try {
            const res = await axios.patch('/api/admin/mfa', { action: 'confirm', code: mfaCode.trim() });
            Swal.fire({ icon: 'success', title: 'Enabled', text: res.data.message || 'MFA enabled', ...swalTheme });
            setMfaCode('');
            setMfaSetup(null);
            setMfaEnabled(true);
        } catch (e: any) { console.error(e); Swal.fire({ icon: 'error', title: 'Failed', text: e?.response?.data?.message || 'Could not confirm code' }); }
        finally { setMfaLoading(false); }
    };

    const disableMfa = async () => {
        const result = await Swal.fire({ title: 'Disable MFA?', text: 'This will remove MFA from your account.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Disable', ...swalTheme });
        if (!result.isConfirmed) return;
        setMfaLoading(true);
        try {
            await axios.patch('/api/admin/mfa', { action: 'disable' });
            Swal.fire({ icon: 'success', title: 'Disabled', text: 'MFA has been disabled.', ...swalTheme });
            setMfaEnabled(false);
            setMfaSetup(null);
        } catch (e) { console.error(e); Swal.fire({ icon: 'error', title: 'Failed', text: 'Could not disable MFA' }); }
        finally { setMfaLoading(false); }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Client-side validation
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire({
                icon: "error",
                title: "File Too Large",
                text: "Profile image must be less than 2MB.",
                ...swalTheme
            });
            return;
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            Swal.fire({
                icon: "error",
                title: "Invalid File Type",
                text: "Only JPG, PNG, and WEBP images are supported.",
                ...swalTheme
            });
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await axios.post("/api/user/profile-image", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setProfile(prev => ({ ...prev, profile_image: res.data.profile_image }));
            Swal.fire({
                icon: "success",
                title: "Uploaded!",
                text: "Profile image updated successfully.",
                timer: 2000,
                showConfirmButton: false,
                ...swalTheme
            });
        } catch (err: any) {
            Swal.fire({
                icon: "error",
                title: "Upload Failed",
                text: err.response?.data?.message || "Failed to upload image. Please try again.",
                ...swalTheme
            });
        } finally {
            setUploading(false);
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await axios.put("/api/user/profile", profile);
            setProfile(prev => ({
                ...prev,
                ...res.data.user,
                date_of_birth: res.data.user.date_of_birth ? new Date(res.data.user.date_of_birth).toISOString().split('T')[0] : prev.date_of_birth
            }));
            Swal.fire({
                icon: "success",
                title: "Profile Updated",
                text: "Your profile details have been saved.",
                timer: 2000,
                showConfirmButton: false,
                ...swalTheme
            });
        } catch (err: any) {
            Swal.fire({
                icon: "error",
                title: "Failed to Update",
                text: err.response?.data?.message || "Something went wrong while saving your details.",
                ...swalTheme
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            Swal.fire({
                icon: "error",
                title: "Mismatch",
                text: "New passwords do not match.",
                confirmButtonColor: "#4F46E5"
            });
            return;
        }

        setSubmitting(true);

        try {
            await axios.put("/api/user/password", passwordData);
            Swal.fire({
                icon: "success",
                title: "Password Updated",
                text: "Your password has been changed successfully.",
                timer: 2000,
                showConfirmButton: false,
                ...swalTheme
            });
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: ""
            });
        } catch (err: any) {
            Swal.fire({
                icon: "error",
                title: "Failed to Change",
                text: err.response?.data?.message || "Failed to update password. Please try again.",
                ...swalTheme
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                    <p className="text-slate-300 font-medium">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pt-8 pb-12 px-4 sm:px-6">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-white mb-2">Account Profile</h1>
                <p className="text-slate-400 text-sm">Works across reader, author, and admin accounts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="border-slate-800 bg-slate-950/80 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg text-white text-center">Profile Picture</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <div className="relative group w-36 h-36">
                            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-slate-800 bg-slate-900 flex items-center justify-center text-indigo-300 text-5xl font-bold shadow-inner transition-transform duration-300 group-hover:scale-105">
                                {profile.profile_image ? (
                                    <img src={profile.profile_image} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    profile.username.charAt(0).toUpperCase()
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer disabled:opacity-50"
                            >
                                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                {uploading ? "Uploading..." : "Upload Photo"}
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                        </div>
                        <p className="text-xs text-slate-400 text-center">JPG, PNG, or WEBP. Max 2MB.</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/80 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-xl text-white">Update Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div>
                                <label className="block text-slate-200 text-sm font-bold mb-2">Username</label>
                                <Input type="text" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-slate-200 text-sm font-bold mb-2">Email</label>
                                <Input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-slate-200 text-sm font-bold mb-2">Date of Birth</label>
                                <Input type="date" value={profile.date_of_birth} onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })} />
                            </div>

                            <div className="flex items-center justify-between pt-4 gap-3 flex-wrap">
                                <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
                                <Button type="button" variant="secondary" onClick={() => router.push("/")}>Cancel</Button>
                            </div>
                        </form>

                        <div className="pt-6 border-t border-slate-800">
                            <h2 className="text-xl font-bold text-white mb-6">Change Password</h2>
                            <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-slate-200 text-sm font-bold mb-2">Current Password</label>
                                    <Input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-slate-200 text-sm font-bold mb-2">New Password</label>
                                    <Input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-slate-200 text-sm font-bold mb-2">Confirm New Password</label>
                                    <Input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} required />
                                </div>

                                <Button type="submit" className="w-full" variant="secondary" disabled={submitting}>
                                    {submitting ? "Updating..." : "Update Password"}
                                </Button>
                            </form>
                        </div>

                        {profile.role === 'ADMIN' && (
                            <div className="pt-6 border-t border-slate-800">
                                <h2 className="text-xl font-bold text-white mb-6">Multi-Factor Authentication</h2>
                                {mfaLoading ? (
                                    <div className="text-slate-400">Loading...</div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="text-sm text-slate-400">Use an authenticator app (e.g., Microsoft Authenticator) to enable TOTP MFA for your admin account.</div>
                                        <div className="mt-2 font-semibold text-slate-200">Status: {mfaEnabled ? <span className="text-emerald-400">Enabled</span> : <span className="text-slate-400">Disabled</span>}</div>

                                        {!mfaEnabled && !mfaSetup && (
                                            <div className="flex gap-2">
                                                <Button type="button" onClick={startMfaSetup}>Set up MFA</Button>
                                            </div>
                                        )}

                                        {mfaSetup && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                                                <div className="sm:col-span-1">
                                                    <img src={mfaSetup.qr} alt="MFA QR" className="w-48 h-48 bg-white p-2 rounded-md shadow" />
                                                </div>
                                                <div className="sm:col-span-2 space-y-3">
                                                    <div className="text-slate-300">Manual code:</div>
                                                    <div className="font-mono bg-slate-900 border border-slate-800 p-2 rounded text-slate-200">{mfaSetup.manual}</div>
                                                    <div className="mt-4 flex gap-2 flex-wrap">
                                                        <Input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="123456" className="max-w-xs" />
                                                        <Button type="button" onClick={confirmMfaSetup}>Confirm</Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {mfaEnabled && (
                                            <div>
                                                <Button type="button" variant="destructive" onClick={disableMfa}>Disable MFA</Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
