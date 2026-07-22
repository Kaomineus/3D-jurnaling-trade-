"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trade } from "@/types";
import ImageGallery from "@/components/trades/ImageGallery";
import TradeForm from "@/components/trades/TradeForm";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

export default function TradeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    const fetchTrade = async () => {
      try {
        const res = await fetch(`/api/trades/${params.id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setTrade(data);
      } catch {
        toast.error("Trade tidak ditemukan");
        router.push("/jurnal");
      } finally {
        setLoading(false);
      }
    };
    fetchTrade();
  }, [params.id, router]);

  const handleDelete = async () => {
    if (!confirm("Hapus trade ini?")) return;
    try {
      await fetch(`/api/trades/${params.id}`, { method: "DELETE" });
      toast.success("Trade dihapus");
      router.push("/jurnal");
    } catch (error) {
      toast.error("Gagal menghapus trade");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!trade) return null;

  const pl =
    trade.exitPrice
      ? trade.type === "LONG"
        ? (trade.exitPrice - trade.entryPrice) * trade.size
        : (trade.entryPrice - trade.exitPrice) * trade.size
      : 0;
  const isWin = pl > 0;
  const isClosed = trade.exitPrice !== null;

  const plPercent = trade.exitPrice
    ? ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100
    : 0;

  const rr =
    trade.sl && trade.tp
      ? Math.abs(
          (trade.tp - trade.entryPrice) / (trade.entryPrice - trade.sl)
        )
      : null;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => router.push("/jurnal")}
        className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Kembali ke Jurnal
      </button>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center border border-slate-700/50">
              <span className="text-xl font-bold font-mono text-white">
                {trade.symbol}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-white">{trade.symbol}</h1>
                <span
                  className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    trade.type === "LONG"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {trade.type === "LONG" ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {trade.type}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Entry: {formatDate(trade.entryDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50 rounded-lg transition-all"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isClosed && (
          <div
            className={`mt-4 p-4 rounded-xl ${
              isWin
                ? "bg-emerald-500/5 border border-emerald-500/10"
                : "bg-red-500/5 border border-red-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Realized P&L</p>
                <p
                  className={`text-3xl font-bold font-mono ${
                    isWin ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {isWin ? "+" : ""}${pl.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 mb-1">Return</p>
                <p
                  className={`text-lg font-bold font-mono ${
                    isWin ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {isWin ? "+" : ""}
                  {plPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            Trade Details
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
              <span className="text-xs text-slate-400">Entry Price</span>
              <span className="text-xs font-mono font-medium text-white">
                ${trade.entryPrice.toFixed(2)}
              </span>
            </div>
            {trade.exitPrice && (
              <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
                <span className="text-xs text-slate-400">Exit Price</span>
                <span className="text-xs font-mono font-medium text-white">
                  ${trade.exitPrice.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
              <span className="text-xs text-slate-400">Size</span>
              <span className="text-xs font-mono font-medium text-white">
                {trade.size} units
              </span>
            </div>
            {trade.sl && (
              <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
                <span className="text-xs text-slate-400">Stop Loss</span>
                <span className="text-xs font-mono font-medium text-red-400">
                  ${trade.sl.toFixed(2)}
                </span>
              </div>
            )}
            {trade.tp && (
              <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
                <span className="text-xs text-slate-400">Take Profit</span>
                <span className="text-xs font-mono font-medium text-emerald-400">
                  ${trade.tp.toFixed(2)}
                </span>
              </div>
            )}
            {rr && (
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-slate-400">R:R Ratio</span>
                <span className="text-xs font-mono font-medium text-amber-400">
                  1:{rr.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Meta</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
              <span className="text-xs text-slate-400">Type</span>
              <span
                className={`text-xs font-medium ${
                  trade.type === "LONG" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {trade.type}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
              <span className="text-xs text-slate-400">Status</span>
              <span
                className={`text-xs font-medium ${
                  isClosed
                    ? isWin
                      ? "text-emerald-400"
                      : "text-red-400"
                    : "text-amber-400"
                }`}
              >
                {isClosed ? (isWin ? "Win" : "Loss") : "Open"}
              </span>
            </div>
            {trade.mood && (
              <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
                <span className="text-xs text-slate-400">Mood</span>
                <span className="text-xs font-medium text-white">
                  {trade.mood === "happy"
                    ? "😊"
                    : trade.mood === "sad"
                    ? "😔"
                    : "😐"}{" "}
                  {trade.mood.charAt(0).toUpperCase() + trade.mood.slice(1)}
                </span>
              </div>
            )}
            {trade.commission && trade.commission > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
                <span className="text-xs text-slate-400">Commission</span>
                <span className="text-xs font-mono font-medium text-slate-300">
                  ${trade.commission.toFixed(2)}
                </span>
              </div>
            )}
            <div className="py-2">
              <span className="text-xs text-slate-400 block mb-2">Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {(trade.tags || []).length > 0
                  ? trade.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-700/50 text-slate-300"
                      >
                        {tag}
                      </span>
                    ))
                  : "-"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {trade.notes && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Notes</h3>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {trade.notes}
          </p>
        </div>
      )}

      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          Attachments ({trade.images.length}/3)
        </h3>
        <ImageGallery images={trade.images} />
      </div>

      {showEdit && trade && (
        <TradeForm
          key={trade.id}
          trade={trade}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
