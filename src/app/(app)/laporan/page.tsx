"use client";

import { useEffect, useState, useRef } from "react";
import { Trade } from "@/types";
import {
  FileText,
  Calendar,
  Loader2,
  TrendingUp,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import toast from "react-hot-toast";

export default function LaporanPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
  }>({
    start: "",
    end: "",
  });
  const [includeImages] = useState(false);

  useEffect(() => {
    const fetchAllTrades = async () => {
      try {
        const res = await fetch("/api/trades?limit=200");
        const data = await res.json();
        setTrades(data.trades || []);
      } catch (error) {
        console.error("Failed to fetch trades:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllTrades();
  }, []);

  const filteredTrades = trades.filter((t) => {
    if (dateRange.start && new Date(t.entryDate) < new Date(dateRange.start))
      return false;
    if (dateRange.end && new Date(t.entryDate) > new Date(dateRange.end))
      return false;
    return true;
  });

  const closedTrades = filteredTrades.filter((t) => t.exitPrice !== null);
  const winningTrades = closedTrades.filter((t) => {
    const pl =
      t.type === "LONG"
        ? (t.exitPrice! - t.entryPrice) * t.size
        : (t.entryPrice - t.exitPrice!) * t.size;
    return pl > 0;
  });

  const totalPL = closedTrades.reduce((sum, t) => {
    const pl =
      t.type === "LONG"
        ? (t.exitPrice! - t.entryPrice) * t.size
        : (t.entryPrice - t.exitPrice!) * t.size;
    return sum + pl - (t.commission || 0);
  }, 0);

  const winRate =
    closedTrades.length > 0
      ? (winningTrades.length / closedTrades.length) * 100
      : 0;

  const avgProfit =
    winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => {
          const pl =
            t.type === "LONG"
              ? (t.exitPrice! - t.entryPrice) * t.size
              : (t.entryPrice - t.exitPrice!) * t.size;
          return sum + pl;
        }, 0) / winningTrades.length
      : 0;

  const avgLoss =
    closedTrades.length - winningTrades.length > 0
      ? closedTrades
          .filter((t) => {
            const pl =
              t.type === "LONG"
                ? (t.exitPrice! - t.entryPrice) * t.size
                : (t.entryPrice - t.exitPrice!) * t.size;
            return pl <= 0;
          })
          .reduce((sum, t) => {
            const pl =
              t.type === "LONG"
                ? (t.exitPrice! - t.entryPrice) * t.size
                : (t.entryPrice - t.exitPrice!) * t.size;
            return sum + pl;
          }, 0) /
          (closedTrades.length - winningTrades.length)
      : 0;

  const exportPDF = async () => {
    setExportLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF("landscape", "mm", "a4");

      doc.setFontSize(18);
      doc.setTextColor(52, 211, 153);
      doc.text("TradeJournal - Laporan Performa", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Generated: ${new Date().toLocaleDateString("id-ID")}`,
        14,
        28
      );

      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text("Ringkasan Performa", 14, 40);

      const summaryData = [
        ["Total Trades", filteredTrades.length.toString()],
        ["Closed Trades", closedTrades.length.toString()],
        ["Win Rate", `${winRate.toFixed(1)}%`],
        ["Net P&L", `$${totalPL.toFixed(2)}`],
        ["Avg Profit", `$${avgProfit.toFixed(2)}`],
        ["Avg Loss", `$${Math.abs(avgLoss).toFixed(2)}`],
        [
          "Profit Factor",
          avgLoss !== 0
            ? (avgProfit / Math.abs(avgLoss)).toFixed(2)
            : "N/A",
        ],
      ];

      autoTable(doc, {
        startY: 44,
        head: [["Metric", "Value"]],
        body: summaryData,
        theme: "grid",
        headStyles: {
          fillColor: [52, 211, 153],
          textColor: [255, 255, 255],
          fontSize: 10,
        },
        bodyStyles: {
          textColor: [255, 255, 255],
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [30, 41, 59],
        },
        styles: {
          cellPadding: 3,
        },
      });

      // Access autoTable's finalY via the doc's internal state
      const lastAutoTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable;
      const yPos = (lastAutoTable?.finalY || 100) + 20;

      doc.setFontSize(12);
      doc.text("Daftar Trade", 14, yPos);

      const tradeRows = filteredTrades.map((t) => {
        const pl = t.exitPrice
          ? t.type === "LONG"
            ? (t.exitPrice - t.entryPrice) * t.size
            : (t.entryPrice - t.exitPrice) * t.size
          : 0;
        return [
          new Date(t.entryDate).toLocaleDateString("id-ID"),
          t.symbol,
          t.type,
          `$${t.entryPrice.toFixed(2)}`,
          t.exitPrice ? `$${t.exitPrice.toFixed(2)}` : "-",
          t.exitPrice ? `${pl >= 0 ? "+" : ""}$${pl.toFixed(2)}` : "Open",
        ];
      });

      autoTable(doc, {
        startY: yPos + 4,
        head: [["Date", "Symbol", "Type", "Entry", "Exit", "P/L"]],
        body: tradeRows,
        theme: "grid",
        headStyles: {
          fillColor: [52, 211, 153],
          textColor: [255, 255, 255],
          fontSize: 8,
        },
        bodyStyles: {
          textColor: [255, 255, 255],
          fontSize: 7,
        },
        alternateRowStyles: {
          fillColor: [30, 41, 59],
        },
        styles: {
          cellPadding: 2,
        },
      });

      doc.save("tradejournal-laporan.pdf");
      toast.success("PDF berhasil diexport!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Gagal export PDF");
    } finally {
      setExportLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Date",
      "Symbol",
      "Type",
      "Entry Price",
      "Exit Price",
      "Size",
      "P/L",
      "Tags",
      "Notes",
    ];
    const rows = filteredTrades.map((t) => {
      const pl = t.exitPrice
        ? t.type === "LONG"
          ? (t.exitPrice - t.entryPrice) * t.size
          : (t.entryPrice - t.exitPrice) * t.size
        : 0;
      return [
        new Date(t.entryDate).toISOString(),
        t.symbol,
        t.type,
        t.entryPrice.toString(),
        t.exitPrice?.toString() || "",
        t.size.toString(),
        pl.toFixed(2),
        (t.tags || []).join("; "),
        `"${(t.notes || "").replace(/"/g, '""')}"`,
      ];
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tradejournal-data.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV berhasil diexport!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Laporan & Ekspor</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Export data trading ke PDF atau CSV
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Total Trades</p>
          <p className="text-2xl font-bold font-mono text-white">
            {filteredTrades.length}
          </p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Win Rate</p>
          <p
            className={`text-2xl font-bold font-mono ${
              winRate >= 50 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {winRate.toFixed(1)}%
          </p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Net P&L</p>
          <p
            className={`text-2xl font-bold font-mono ${
              totalPL >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {totalPL >= 0 ? "+" : ""}${totalPL.toFixed(0)}
          </p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Profit Factor</p>
          <p className="text-2xl font-bold font-mono text-amber-400">
            {avgLoss !== 0
              ? (avgProfit / Math.abs(avgLoss)).toFixed(2)
              : "N/A"}
          </p>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((p) => ({ ...p, start: e.target.value }))
              }
              className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500/50"
            />
            <span className="text-xs text-slate-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((p) => ({ ...p, end: e.target.value }))
              }
              className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={includeImages}
                readOnly
                className="rounded bg-slate-800 border-slate-600 text-emerald-500"
              />
              Sertakan gambar
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-800/50">
          <button
            onClick={exportPDF}
            disabled={exportLoading || filteredTrades.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
          >
            {exportLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            Export PDF
          </button>
          <button
            onClick={exportCSV}
            disabled={filteredTrades.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800/50">
          <h3 className="text-sm font-semibold text-white">
            Daftar Trade ({filteredTrades.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="text-left p-3 text-slate-500 font-medium">
                  Date
                </th>
                <th className="text-left p-3 text-slate-500 font-medium">
                  Symbol
                </th>
                <th className="text-left p-3 text-slate-500 font-medium">
                  Type
                </th>
                <th className="text-right p-3 text-slate-500 font-medium">
                  Entry
                </th>
                <th className="text-right p-3 text-slate-500 font-medium">
                  Exit
                </th>
                <th className="text-right p-3 text-slate-500 font-medium">
                  P/L
                </th>
                <th className="text-right p-3 text-slate-500 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((trade) => {
                const pl = trade.exitPrice
                  ? trade.type === "LONG"
                    ? (trade.exitPrice - trade.entryPrice) * trade.size
                    : (trade.entryPrice - trade.exitPrice) * trade.size
                  : 0;
                const isWin = pl > 0;

                return (
                  <tr
                    key={trade.id}
                    className="border-b border-slate-800/30 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-3 text-slate-300 font-mono">
                      {new Date(trade.entryDate).toLocaleDateString("id-ID")}
                    </td>
                    <td className="p-3 font-semibold text-white font-mono">
                      {trade.symbol}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          trade.type === "LONG"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {trade.type}
                      </span>
                    </td>
                    <td className="p-3 text-right text-slate-300 font-mono">
                      ${trade.entryPrice.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-slate-300 font-mono">
                      {trade.exitPrice
                        ? `$${trade.exitPrice.toFixed(2)}`
                        : "-"}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-medium ${
                        trade.exitPrice
                          ? isWin
                            ? "text-emerald-400"
                            : "text-red-400"
                          : "text-slate-500"
                      }`}
                    >
                      {trade.exitPrice
                        ? `${isWin ? "+" : ""}$${pl.toFixed(0)}`
                        : "Open"}
                    </td>
                    <td className="p-3 text-right">
                      {trade.exitPrice ? (
                        <CheckCircle2
                          className={`w-3.5 h-3.5 inline ${
                            isWin ? "text-emerald-400" : "text-red-400"
                          }`}
                        />
                      ) : (
                        <span className="text-[10px] text-amber-400">
                          Open
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
