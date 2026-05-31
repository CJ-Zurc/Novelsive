"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HCaptcha from "@hcaptcha/react-hcaptcha";

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

                // If MFA required, switch to MFA stage
                if (data.mfaRequired) {
                    setStage('mfa');
                    setError('');
                    return;
                }

                router.push("/");
            } else {
                // shouldn't reach here via handleSubmit
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome back
                </h1>
                <p className="text-gray-500 text-sm mb-6">
                    Sign in to your Novelsive account
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={stage === 'credentials' ? handleSubmit : handleMfaSubmit} className="space-y-4">
                    {stage === 'credentials' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter your email"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter your password"
                                />
                            </div>
                        </>
                    )}

                    {stage === 'mfa' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Authenticator code</label>
                            <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="123456" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            <div className="text-sm text-gray-500 mt-2">Enter the 6-digit code from your authenticator app.</div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Link
                            href="/forgot-password"
                            className="text-sm text-indigo-600 hover:underline"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    {/* hCaptcha widget (only for credentials stage) */}
                    {stage === 'credentials' && (
                        <div className="flex justify-center">
                            <HCaptcha
                                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
                                onVerify={(token) => setHcaptchaToken(token)}
                                onExpire={() => setHcaptchaToken("")}
                                ref={captchaRef}
                            />
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={isLoading || (stage === 'credentials' && !hcaptchaToken)}
                            className="flex-1 w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (stage === 'mfa' ? 'Verifying...' : 'Signing in...') : (stage === 'mfa' ? 'Verify' : 'Sign in')}
                        </button>
                        {stage === 'mfa' && (
                            <button type="button" onClick={() => { setStage('credentials'); setMfaCode(''); captchaRef.current?.resetCaptcha(); setHcaptchaToken(''); }} className="px-4 py-2 rounded-lg bg-gray-200">Back</button>
                        )}
                    </div>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-indigo-600 hover:underline font-medium">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}