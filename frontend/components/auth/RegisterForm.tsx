"use client";

import { useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterForm() {
    const router = useRouter();
    const captchaRef = useRef<HCaptcha>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [hcaptchaToken, setHcaptchaToken] = useState("");
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        date_of_birth: "",
        profile_image: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const passwordChecks = useMemo(() => {
        const pw = formData.password || "";
        return {
            length: pw.length >= 8,
            uppercase: /[A-Z]/.test(pw),
            special: /[@#\$%\^&\*\(\)\[\]{}!"'`~\\|;:,<.>\/?_+=-]/.test(pw),
        };
    }, [formData.password]);

    const isPasswordValid = passwordChecks.length && passwordChecks.uppercase && passwordChecks.special;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        if (!isPasswordValid) {
            setError("Password does not meet the requirements.");
            setIsLoading(false);
            return;
        }

        if (!hcaptchaToken) {
            setError("Please complete the captcha");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, hcaptchaToken }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message);
                captchaRef.current?.resetCaptcha();
                setHcaptchaToken("");
                return;
            }

            router.push("/login?registered=true");
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-xl shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold text-slate-100 mb-2">Create an account</h1>
                <p className="text-slate-400 text-sm mb-6">Join Novelsive and start reading</p>

                {error && (
                    <div className="bg-rose-950/40 text-rose-400 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Username</label>
                        <Input name="username" value={formData.username} onChange={handleChange} required placeholder="Enter your username" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Email</label>
                        <Input name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="Enter your email" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Password</label>
                        <Input name="password" type="password" value={formData.password} onChange={handleChange} required placeholder="At least 8 characters, 1 uppercase, 1 special char" />

                        <div className="mt-2 text-sm text-slate-400">
                            <div className={passwordChecks.length ? "text-slate-200" : "text-slate-500"}>• At least 8 characters</div>
                            <div className={passwordChecks.uppercase ? "text-slate-200" : "text-slate-500"}>• At least one capital letter</div>
                            <div className={passwordChecks.special ? "text-slate-200" : "text-slate-500"}>• At least one special character (e.g. @, #)</div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Date of Birth</label>
                        <Input name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">Profile Image URL <span className="text-slate-500">(optional)</span></label>
                        <Input name="profile_image" type="url" value={formData.profile_image} onChange={handleChange} placeholder="https://example.com/avatar.jpg" />
                    </div>

                    <div className="flex justify-center">
                        <HCaptcha sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!} onVerify={(token) => setHcaptchaToken(token)} onExpire={() => setHcaptchaToken("")} ref={captchaRef} />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading || !hcaptchaToken || !isPasswordValid}>
                        {isLoading ? "Creating account..." : "Create account"}
                    </Button>
                </form>

                <p className="text-center text-sm text-slate-400 mt-6">Already have an account? <Link href="/login" className="text-indigo-400 hover:underline font-medium">Sign in</Link></p>
            </div>
        </div>
    );
}