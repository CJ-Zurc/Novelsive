export default function BannedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 px-4">
            <div className="w-full max-w-lg text-center">
                {/* Icon */}
                <div className="flex justify-center mb-8">
                    <div className="w-24 h-24 rounded-full bg-red-600/20 border-2 border-red-500/40 flex items-center justify-center shadow-[0_0_60px_rgba(239,68,68,0.3)]">
                        <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                    </div>
                </div>

                {/* Content card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl">
                    <div className="inline-block bg-red-600/20 text-red-400 text-xs font-bold tracking-[0.2em] uppercase px-4 py-1.5 rounded-full border border-red-500/30 mb-6">
                        Account Suspended
                    </div>

                    <h1 className="text-4xl font-black text-white mb-4 leading-tight">
                        You've Been Banned
                    </h1>

                    <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-sm mx-auto">
                        Your Novelsive account has been suspended by an administrator due to a violation of our community guidelines or terms of service.
                    </p>

                    <div className="bg-red-950/50 border border-red-900/50 rounded-2xl p-5 mb-8 text-left">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            <div>
                                <p className="text-red-300 text-sm font-semibold mb-1">What this means</p>
                                <p className="text-slate-400 text-xs leading-relaxed">
                                    You are no longer able to log in, read novels, or access any features of Novelsive. If you believe this is a mistake, please contact our support team.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                            href="/login"
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold rounded-xl transition-all duration-200 text-sm"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                            Back to Login
                        </a>
                        <a
                            href="mailto:support@novelsive.com"
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all duration-200 text-sm shadow-lg shadow-red-900/40"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                            Contact Support
                        </a>
                    </div>
                </div>

                <p className="text-slate-600 text-xs mt-8">
                    Novelsive &copy; {new Date().getFullYear()} — Community Standards Enforcement
                </p>
            </div>
        </div>
    );
}
