"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Email atau password salah");
      } else {
        toast.success("Berhasil masuk!");
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      {/* Left - Brand Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/50 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(52,211,153,0.08),transparent_70%)]" />
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">TradeJournal</h1>
              <p className="text-xs text-slate-400">Quant Analytics</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Trade Smarter with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Data-Driven
            </span>{" "}
            Analytics
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Journal your trades, visualize performance in 3D, and make informed
            decisions with powerful quant analytics.
          </p>
          <div className="mt-8 flex gap-4">
            <div className="flex-1 p-4 rounded-xl bg-white/5 border border-slate-800/50">
              <p className="text-2xl font-bold text-emerald-400">62%</p>
              <p className="text-xs text-slate-400 mt-1">Avg Win Rate</p>
            </div>
            <div className="flex-1 p-4 rounded-xl bg-white/5 border border-slate-800/50">
              <p className="text-2xl font-bold text-cyan-400">2.1</p>
              <p className="text-xs text-slate-400 mt-1">Avg R:R Ratio</p>
            </div>
            <div className="flex-1 p-4 rounded-xl bg-white/5 border border-slate-800/50">
              <p className="text-2xl font-bold text-amber-400">3D</p>
              <p className="text-xs text-slate-400 mt-1">Quant Mode</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right - Form Side */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">TradeJournal</h1>
              <p className="text-[10px] text-slate-400">Quant Analytics</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Selamat Datang</h2>
          <p className="text-sm text-slate-400 mb-8">
            Masuk ke akun TradeJournal Anda
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                className="w-full px-3.5 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
            >
              Daftar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
