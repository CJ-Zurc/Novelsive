"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginForm() {
    const router = useRouter();
    const captchaRef = useRef<HCaptcha>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [hcaptchaToken, setHcaptchaToken] = useState("");
    const [stage, setStage] = useState<'credentials' | 'mfa'>('credentials');
    const [mfaCode, setMfaCode] = useState('');
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (stage === 'credentials') {
            if (!hcaptchaToken) {
                setError("Please complete the captcha");
                return;
            }
        }
        setIsLoading(true);

        try {
            if (stage === 'credentials') {
                const response = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...formData, hcaptchaToken }),
                });

                const data = await response.json();

                if (!response.ok) {
                    if (data.message === "ACCOUNT_BANNED") {
                        router.push("/banned");
                        return;
                    }
                    setError(data.message);
                    // Reset captcha on failed attempt
                    captchaRef.current?.resetCaptcha();
                    setHcaptchaToken("");
                    return;
                }

                if (data.mfaRequired) {
                    setStage('mfa');
                    setError('');
                    return;
                }

                router.push("/");
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleMfaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/login/mfa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: mfaCode.trim() })
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Invalid code');
                return;
            }
            router.push('/');
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally { setIsLoading(false); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-xl shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold text-slate-100 mb-2">Welcome back</h1>
                <p className="text-slate-400 text-sm mb-6">Sign in to your Novelsive account</p>

                {error && (
                    <div className="bg-rose-950/40 text-rose-400 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
                )}

                <form onSubmit={stage === 'credentials' ? handleSubmit : handleMfaSubmit} className="space-y-4">
                    {stage === 'credentials' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-200 mb-1">Email</label>
                                <Input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="Enter your email" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-200 mb-1">Password</label>
                                <Input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="Enter your password" />
                            </div>
                        </>
                    )}

                    {stage === 'mfa' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-200 mb-1">Authenticator code</label>
                            <Input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="123456" />
                            <div className="text-sm text-slate-400 mt-2">Enter the 6-digit code from your authenticator app.</div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Link href="/forgot-password" className="text-sm text-indigo-400 hover:underline">Forgot password?</Link>
                    </div>

                    {stage === 'credentials' && (
                        <div className="flex justify-center rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
                            <HCaptcha sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!} onVerify={(token) => setHcaptchaToken(token)} onExpire={() => setHcaptchaToken("")} ref={captchaRef} theme="dark" />
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button type="submit" className="flex-1" disabled={isLoading || (stage === 'credentials' && !hcaptchaToken)}>
                            {isLoading ? (stage === 'mfa' ? 'Verifying...' : 'Signing in...') : (stage === 'mfa' ? 'Verify' : 'Sign in')}
                        </Button>
                        {stage === 'mfa' && (
                            <Button type="button" variant="secondary" onClick={() => { setStage('credentials'); setMfaCode(''); captchaRef.current?.resetCaptcha(); setHcaptchaToken(''); }}>
                                Back
                            </Button>
                        )}
                    </div>
                </form>

                <p className="text-center text-sm text-slate-400 mt-6">Don't have an account? <Link href="/register" className="text-indigo-400 hover:underline font-medium">Create one</Link></p>
            </div>
        </div>
    );
}