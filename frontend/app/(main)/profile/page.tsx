"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";

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
            Swal.fire({ icon: 'info', title: 'Scan QR', text: 'Scan the QR with your authenticator or copy the manual code.' });
        } catch (e) { console.error(e); Swal.fire({ icon: 'error', title: 'Failed', text: 'Could not start MFA setup' }); }
        finally { setMfaLoading(false); }
    };

    const confirmMfaSetup = async () => {
        if (!mfaCode.trim()) return Swal.fire({ icon: 'warning', title: 'Enter code', text: 'Please enter the 6-digit code from your authenticator.' });
        setMfaLoading(true);
        try {
            const res = await axios.patch('/api/admin/mfa', { action: 'confirm', code: mfaCode.trim() });
            Swal.fire({ icon: 'success', title: 'Enabled', text: res.data.message || 'MFA enabled' });
            setMfaCode('');
            setMfaSetup(null);
            setMfaEnabled(true);
        } catch (e: any) { console.error(e); Swal.fire({ icon: 'error', title: 'Failed', text: e?.response?.data?.message || 'Could not confirm code' }); }
        finally { setMfaLoading(false); }
    };

    const disableMfa = async () => {
        const result = await Swal.fire({ title: 'Disable MFA?', text: 'This will remove MFA from your account.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Disable' });
        if (!result.isConfirmed) return;
        setMfaLoading(true);
        try {
            await axios.patch('/api/admin/mfa', { action: 'disable' });
            Swal.fire({ icon: 'success', title: 'Disabled', text: 'MFA has been disabled.' });
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
                confirmButtonColor: "#4F46E5"
            });
            return;
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            Swal.fire({
                icon: "error",
                title: "Invalid File Type",
                text: "Only JPG, PNG, and WEBP images are supported.",
                confirmButtonColor: "#4F46E5"
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
                showConfirmButton: false
            });
        } catch (err: any) {
            Swal.fire({
                icon: "error",
                title: "Upload Failed",
                text: err.response?.data?.message || "Failed to upload image. Please try again.",
                confirmButtonColor: "#4F46E5"
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
                showConfirmButton: false
            });
        } catch (err: any) {
            Swal.fire({
                icon: "error",
                title: "Failed to Update",
                text: err.response?.data?.message || "Something went wrong while saving your details.",
                confirmButtonColor: "#4F46E5"
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
                showConfirmButton: false
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
                confirmButtonColor: "#4F46E5"
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
                    <p className="text-gray-600 font-medium">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-8 border-b pb-4">Account Profile</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Avatar Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center h-fit">
                    <h2 className="text-lg font-bold text-gray-800 mb-6 w-full text-center border-b pb-2">Profile Picture</h2>
                    <div className="relative group w-36 h-36 mb-6">
                        <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-indigo-100 bg-indigo-50 flex items-center justify-center text-indigo-600 text-5xl font-bold shadow-inner transition-transform duration-300 group-hover:scale-105">
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
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                    <p className="text-xs text-gray-500 text-center">JPG, PNG, or WEBP. Max 2MB.</p>
                </div>

                {/* Profile Details Form */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 md:col-span-2 space-y-8">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Update Details</h2>
                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Username</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 border-gray-300"
                                    value={profile.username}
                                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 border-gray-300"
                                    value={profile.email}
                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Date of Birth</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 border-gray-300"
                                    value={profile.date_of_birth}
                                    onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center justify-between pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg focus:outline-none disabled:opacity-50 transition"
                                >
                                    {submitting ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.push("/")}
                                    className="text-gray-500 hover:text-gray-700 font-semibold transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Password Form */}
                    <div className="pt-6 border-t">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Change Password</h2>
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Current Password</label>
                                <input
                                    type="password"
                                    className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 border-gray-300"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">New Password</label>
                                <input
                                    type="password"
                                    className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 border-gray-300"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Confirm New Password</label>
                                <input
                                    type="password"
                                    className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 border-gray-300"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-2.5 px-4 rounded-lg focus:outline-none disabled:opacity-50 transition"
                            >
                                {submitting ? "Updating..." : "Update Password"}
                            </button>
                        </form>
                    </div>
                    {/* MFA Section - visible to admins */}
                    {profile.role === 'ADMIN' && (
                        <div className="pt-6 border-t">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Multi-Factor Authentication</h2>
                            {mfaLoading ? (
                                <div>Loading...</div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-sm text-gray-500">Use an authenticator app (e.g., Microsoft Authenticator) to enable TOTP MFA for your admin account.</div>
                                    <div className="mt-2 font-semibold">Status: {mfaEnabled ? <span className="text-green-600">Enabled</span> : <span className="text-gray-600">Disabled</span>}</div>

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
                </div>
            </div>
        </div>
    );
}
