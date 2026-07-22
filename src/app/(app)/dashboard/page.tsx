"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { DashboardStats, Trade } from "@/types";
import {
  TrendingUp,
  Target,
  Activity,
  Award,
  Loader2,
  DollarSign,
  BarChart3,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Generate stable dot positions once via lazy state initializer
  const [dots] = useState<Array<{left: number; top: number; duration: number; delay: number}>>(() =>
    Array.from({ length: 20 }, () => ({
      left: Math.random() * 160 - 80,
      top: Math.random() * 160 - 80,
      duration: 1.5 + Math.random() * 2,
      delay: Math.random() * 2,
    }))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <BarChart3 className="w-12 h-12 text-slate-600" />
        <p className="text-slate-400 text-sm">Belum ada data trading</p>
      </div>
    );
  }

  const isProfitable = stats.netProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Net P&L</span>
          </div>
          <p
            className={`text-2xl font-bold font-mono ${
              isProfitable ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isProfitable ? "+" : ""}${stats.netProfit.toFixed(0)}
          </p>
          <div className="flex gap-3 mt-2 text-[10px]">
            <span className="text-emerald-500">
              +${stats.totalProfit.toFixed(0)}
            </span>
            <span className="text-red-500">
              -${stats.totalLoss.toFixed(0)}
            </span>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Target className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Win Rate</span>
          </div>
          <p className="text-2xl font-bold font-mono text-blue-400">
            {stats.winRate}%
          </p>
          <p className="text-[10px] text-slate-500 mt-2">
            Dari {stats.totalTrades} total trade
          </p>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Award className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Avg R:R</span>
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400">
            {stats.avgRR}
          </p>
          <p className="text-[10px] text-slate-500 mt-2">Risk:Reward Ratio</p>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Activity className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Best Trade
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-purple-400">
            +${stats.bestTrade.toFixed(0)}
          </p>
          <p className="text-[10px] text-slate-500 mt-2">
            Worst: ${stats.worstTrade.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Equity Curve & 3D Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve */}
        <div className="lg:col-span-2 glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white">Equity Curve</h3>
            <span className="text-[10px] text-slate-500 px-2 py-1 rounded-full bg-slate-800/50">
              Cumulative P&L
            </span>
          </div>
          {stats.equityCurve.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.equityCurve}>
                  <defs>
                    <linearGradient
                      id="equityGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#34d399"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#34d399"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid rgba(148,163,184,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#34d399"
                    strokeWidth={2}
                    fill="url(#equityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-slate-500">
                Belum ada data equity curve
              </p>
            </div>
          )}
        </div>

        {/* 3D Mini Viewport */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white">Quant Mode</h3>
            <span className="text-[10px] text-emerald-400 px-2 py-1 rounded-full bg-emerald-500/10">
              3D Active
            </span>
          </div>
          <div className="h-64 rounded-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center border border-slate-700/30 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(52,211,153,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />

            <div className="relative">
              {dots.map((dot, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400/30"
                  style={{
                    left: `${dot.left}px`,
                    top: `${dot.top}px`,
                    animation: `glow-pulse ${dot.duration}s ease-in-out infinite`,
                    animationDelay: `${dot.delay}s`,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 flex flex-col items-center gap-3">
              <BarChart3 className="w-8 h-8 text-emerald-400/60" />
              <Link
                href="/analisis-3d"
                className="px-4 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
              >
                Buka 3D View
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Recent Trades</h3>
          <Link
            href="/jurnal"
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Lihat semua →
          </Link>
        </div>
        {stats.recentTrades.length > 0 ? (
          <div className="space-y-2">
            {stats.recentTrades.slice(0, 5).map((trade) => {
              const pl =
                trade.exitPrice
                  ? trade.type === "LONG"
                    ? (trade.exitPrice - trade.entryPrice) * trade.size
                    : (trade.entryPrice - trade.exitPrice) * trade.size
                  : 0;
              const isWin = pl > 0;

              return (
                <Link
                  key={trade.id}
                  href={`/jurnal/${trade.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors border border-slate-700/20"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white font-mono">
                        {trade.symbol}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(trade.entryDate).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        trade.type === "LONG"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {trade.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {trade.images.length > 0 && (
                      <div className="flex -space-x-1.5">
                        {trade.images.slice(0, 2).map((img: { id: string; url: string; thumbnailUrl: string | null }) => (
                          <div
                            key={img.id}
                            className="w-6 h-6 rounded border border-slate-700/50 bg-slate-800 overflow-hidden"
                          >
                            <img
                              src={img.thumbnailUrl || img.url}
                              alt="Trade screenshot"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {trade.images.length > 2 && (
                          <div className="w-6 h-6 rounded border border-slate-700/50 bg-slate-800 flex items-center justify-center text-[8px] text-slate-400">
                            +{trade.images.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                    <span
                      className={`text-sm font-bold font-mono ${
                        isWin ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {isWin ? "+" : ""}${pl.toFixed(0)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <TrendingUp className="w-8 h-8 text-slate-600" />
            <p className="text-sm text-slate-500">
              Belum ada trade. Mulai journaling!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
