"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HCaptcha from "@hcaptcha/react-hcaptcha";

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

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

            // Registration successful, redirect to login
            router.push("/login?registered=true");

        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Create an account
                </h1>
                <p className="text-gray-500 text-sm mb-6">
                    Join Novelsive and start reading
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Username
                        </label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            className="w-full border border-black rounded-lg px-4 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Enter your username"
                        />
                    </div>

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
                            className="w-full border border-black rounded-lg px-4 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                            className="w-full border border-black rounded-lg px-4 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="At least 8 characters"
                        />
                    </div>


                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date of Birth
                        </label>
                        <input
                            type="date"
                            name="date_of_birth"
                            value={formData.date_of_birth}
                            onChange={handleChange}
                            required
                            className="w-full border border-black rounded-lg px-4 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Profile Image URL <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                            type="url"
                            name="profile_image"
                            value={formData.profile_image}
                            onChange={handleChange}
                            className="w-full border border-black rounded-lg px-4 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="https://example.com/avatar.jpg"
                        />
                    </div>

                    <div className="flex justify-center">
                        <HCaptcha
                            sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
                            onVerify={(token) => setHcaptchaToken(token)}
                            onExpire={() => setHcaptchaToken("")}
                            ref={captchaRef}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !hcaptchaToken}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Creating account..." : "Create account"}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                    Already have an account?{" "}
                    <Link href="/login" className="text-indigo-600 hover:underline font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}