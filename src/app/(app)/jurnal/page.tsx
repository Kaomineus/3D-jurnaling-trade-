"use client";

import { useEffect, useState, useCallback } from "react";
import { Trade } from "@/types";
import TradeForm from "@/components/trades/TradeForm";
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  Loader2,
  TrendingUp,
  TrendingDown,
  Camera,
  X,
} from "lucide-react";

export default function JurnalPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchSymbol, setSearchSymbol] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          sortBy: "entryDate",
          sortOrder: "desc",
        });
        if (searchSymbol) params.set("symbol", searchSymbol);
        if (filterType) params.set("type", filterType);

        const res = await fetch(`/api/trades?${params}`);
        const data = await res.json();
        setTrades(data.trades);
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error("Failed to fetch trades:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrades();
  }, [page, searchSymbol, filterType]);

  const handleEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTrade(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    window.location.reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus trade ini?")) return;
    try {
      await fetch(`/api/trades/${id}`, { method: "DELETE" });
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete trade:", error);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Cari simbol..."
              value={searchSymbol}
              onChange={(e) => {
                setSearchSymbol(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-all ${
              showFilters
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-medium rounded-lg transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Trade
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="glass-card rounded-xl p-4 flex flex-wrap gap-3">
          <button
            onClick={() => setFilterType("")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !filterType
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterType("LONG")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === "LONG"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white"
            }`}
          >
            Long
          </button>
          <button
            onClick={() => setFilterType("SHORT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === "SHORT"
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white"
            }`}
          >
            Short
          </button>
        </div>
      )}

      {/* Trade List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
      ) : trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <TrendingUp className="w-12 h-12 text-slate-600" />
          <p className="text-sm text-slate-400">Belum ada trade</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
          >
            Tambah Trade Pertama
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {/* Header row */}
            <div className="hidden md:grid grid-cols-7 gap-4 px-4 py-2 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              <span>Date</span>
              <span>Symbol</span>
              <span>Type</span>
              <span>P/L</span>
              <span>Tags</span>
              <span>Attach</span>
              <span className="text-right">Actions</span>
            </div>

            {trades.map((trade) => {
              const pl =
                trade.exitPrice
                  ? trade.type === "LONG"
                    ? (trade.exitPrice - trade.entryPrice) * trade.size
                    : (trade.entryPrice - trade.exitPrice) * trade.size
                  : 0;
              const isWin = pl > 0;
              const isClosed = trade.exitPrice !== null;

              return (
                <div
                  key={trade.id}
                  className="glass-card rounded-xl p-4 hover:bg-slate-800/40 transition-all group"
                >
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3 md:gap-4 items-center">
                    {/* Date */}
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-white font-mono">
                        {new Date(trade.entryDate).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(trade.entryDate).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Symbol */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono">
                        {trade.symbol}
                      </span>
                    </div>

                    {/* Type */}
                    <div>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          trade.type === "LONG"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {trade.type === "LONG" ? (
                          <TrendingUp className="w-3 h-3 inline mr-0.5" />
                        ) : (
                          <TrendingDown className="w-3 h-3 inline mr-0.5" />
                        )}
                        {trade.type}
                      </span>
                    </div>

                    {/* P/L */}
                    <div>
                      {isClosed ? (
                        <span
                          className={`text-sm font-bold font-mono ${
                            isWin ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {isWin ? "+" : ""}${pl.toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Open</span>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {(trade.tags || []).slice(0, 2).map((tag: string) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-700/50 text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                      {(trade.tags || []).length > 2 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] text-slate-500">
                          +{trade.tags.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Attachments */}
                    <div>
                      {trade.images.length > 0 ? (
                        <div className="flex -space-x-1.5">
                          {trade.images.slice(0, 2).map((img) => (
                            <div
                              key={img.id}
                              className="w-7 h-7 rounded border border-slate-700/50 bg-slate-800 overflow-hidden"
                            >
                              <img
                                src={img.thumbnailUrl || img.url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {trade.images.length > 2 && (
                            <div className="w-7 h-7 rounded border border-slate-700/50 bg-slate-800 flex items-center justify-center text-[8px] text-slate-400">
                              <Camera className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600">-</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/jurnal/${trade.id}`}
                        className="px-3 py-1.5 text-[10px] font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-all"
                      >
                        Detail
                      </a>
                      <button
                        onClick={() => handleEdit(trade)}
                        className="p-1.5 text-slate-500 hover:text-emerald-400 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(trade.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    p === page
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Trade Form Modal */}
      {showForm && (
        <TradeForm
          trade={editingTrade}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
