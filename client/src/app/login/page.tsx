"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Lock, Mail, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

export default function LoginPage() {
    const router = useRouter();
    const setAuth = useAuthStore(s => s.setAuth);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await api.post("/auth/login", { email, password });
            const { token, user } = res.data.data;
            setAuth(user, token);
            router.replace("/dashboard");
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? "Invalid credentials. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[hsl(222_47%_7%)]">
            {/* ── Left: Branding ── */}
            <div className="hidden lg:flex w-1/2 relative bg-indigo-600 flex-col justify-between p-12 overflow-hidden text-white">
                {/* Glow blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/50 blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-800/60 blur-[120px]" />

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-2">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                        <Activity className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">EDT System</span>
                </div>

                {/* Hero text */}
                <div className="relative z-10 space-y-6">
                    <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
                        Elevate Project<br />Monitor &amp; Decisions
                    </h1>
                    <p className="text-indigo-100 text-lg max-w-md">
                        A premium internal dashboard for Senior Management and Project Managers to track, analyze, and execute decisions seamlessly.
                    </p>
                </div>

                {/* Footer tags */}
                <div className="relative z-10 flex gap-4 text-sm text-indigo-200">
                    <span>Enterprise Grade</span><span>&bull;</span>
                    <span>Real-time Sync</span><span>&bull;</span>
                    <span>Secure</span>
                </div>
            </div>

            {/* ── Right: Login Form ── */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative overflow-hidden">
                {/* Mobile glow */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[80px] lg:hidden" />

                <div className="w-full max-w-md space-y-8 relative z-10">
                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-2 justify-center mb-2">
                        <div className="bg-indigo-600 p-2 rounded-xl">
                            <Activity className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-white">EDT System</span>
                    </div>

                    <div className="text-center lg:text-left space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight text-white">Welcome back</h2>
                        <p className="text-slate-400">Sign in to your account to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="edt-card p-6 space-y-5">
                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-3 px-3 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                                <p className="text-sm text-rose-300">{error}</p>
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-400">Work Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input
                                    type="email" required autoComplete="email"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-400">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input
                                    type={showPw ? "text" : "password"} required
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-11 pl-10 pr-11 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors"
                                />
                                <button type="button" onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={loading}
                            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40">
                            {loading
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                                : <><span>Sign in</span><ArrowRight className="h-4 w-4" /></>
                            }
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500">
                        For access requests, contact your System Administrator.
                    </p>
                </div>
            </div>
        </div>
    );
}
