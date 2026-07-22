"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Loader2,
  Box,
  Grid3X3,
  LineChart,
  Maximize2,
  Download,
  Share2,
  ArrowLeft,
  Rotate3D,
  Move3D,
  Target,
  Eye,
  Grid3x3,
  Type,
  Paintbrush,
  ArrowUpDown,
  Globe,
  Info,
  ZoomIn,
  Layers,
} from "lucide-react";
import type { DataPoint3D } from "@/components/three/QuantViz";

// ===== Dynamic Import for 3D Component =====
const QuantViz = dynamic(() => import("@/components/three/QuantViz"), {
  ssr: false,
  loading: () => (
    <div className="h-full rounded-xl bg-slate-900/50 border border-slate-800/50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading 3D Engine...</p>
      </div>
    </div>
  ),
});

// ===== Types =====
interface TradeRecord {
  id: string;
  symbol: string;
  type: "LONG" | "SHORT";
  entryDate: string;
  exitDate: string | null;
  entryPrice: number;
  exitPrice: number | null;
  size: number;
  sl: number | null;
  tp: number | null;
  notes: string | null;
  mood: string | null;
  tags: string[];
  commission: number | null;
}

// ===== Constants =====
const CHART_TYPES = [
  { value: "scatter" as const, label: "Scatter 3D", icon: Box },
  { value: "equity" as const, label: "Equity Curve", icon: LineChart },
  { value: "surface" as const, label: "Surface", icon: Grid3X3 },
];

const DATASET_OPTIONS = [
  { value: "all", label: "All Trades" },
  { value: "month", label: "This Month" },
  { value: "3months", label: "Last 3 Months" },
  { value: "6months", label: "Last 6 Months" },
  { value: "year", label: "This Year" },
];

const AXIS_OPTIONS = [
  { value: "tradeNumber", label: "Trade #" },
  { value: "pl", label: "P/L ($)" },
  { value: "rr", label: "R:R Ratio" },
  { value: "winRate", label: "Win Rate" },
  { value: "duration", label: "Duration" },
  { value: "positionSize", label: "Position Size" },
  { value: "drawdown", label: "Drawdown" },
  { value: "volatility", label: "Volatility" },
];

const COLOR_OPTIONS = [
  { value: "winLoss", label: "Win / Loss" },
  { value: "pl", label: "P/L Range" },
  { value: "assetType", label: "Asset Type" },
];

const SIZE_OPTIONS = [
  { value: "uniform", label: "Uniform" },
  { value: "positionSize", label: "Position Size" },
  { value: "plAbs", label: "P/L Absolute" },
];

const VIEW_PRESETS = [
  { value: "isometric" as const, label: "Isometric", icon: Globe },
  { value: "top" as const, label: "Top", icon: ArrowUpDown },
  { value: "front" as const, label: "Front", icon: Target },
  { value: "side" as const, label: "Side", icon: Move3D },
];

// ===== Helper: compute P/L =====
function computePL(trade: TradeRecord): number {
  if (!trade.exitPrice) return 0;
  const gross =
    trade.type === "LONG"
      ? (trade.exitPrice - trade.entryPrice) * trade.size
      : (trade.entryPrice - trade.exitPrice) * trade.size;
  return gross - (trade.commission || 0);
}

function computeRR(trade: TradeRecord): number {
  if (!trade.sl || !trade.tp) return 0;
  const risk = Math.abs(trade.entryPrice - trade.sl) * trade.size;
  const reward = Math.abs(trade.tp - trade.entryPrice) * trade.size;
  return risk > 0 ? reward / risk : 0;
}

// ===== Simple debounce hook =====
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ===== Pre-compute once: memoized PL/RR per trade =====
function useTradeMetrics(trades: TradeRecord[]) {
  return useMemo(() => {
    const map = new Map<string, { pl: number; rr: number; plPercent: number }>();
    for (const t of trades) {
      if (!t.exitPrice) {
        map.set(t.id, { pl: 0, rr: 0, plPercent: 0 });
        continue;
      }
      const pl = computePL(t);
      const rr = computeRR(t);
      const plPercent = ((t.exitPrice - t.entryPrice) / t.entryPrice) * 100;
      map.set(t.id, { pl, rr, plPercent });
    }
    return map;
  }, [trades]);
}

// ===== Page Component =====
export default function Analisis3DPage() {
  const [chartType, setChartType] = useState<string>("scatter");
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredTrade, setHoveredTrade] = useState<DataPoint3D | null>(null);

  // Control states (immediate)
  const [dataset, setDataset] = useState("all");
  const [xAxis, setXAxis] = useState("tradeNumber");
  const [yAxis, setYAxis] = useState("pl");
  const [zAxis, setZAxis] = useState("rr");
  const [colorBy, setColorBy] = useState("winLoss");
  const [sizeBy, setSizeBy] = useState("uniform");
  const [showLabels, setShowLabels] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [smoothSurface, setSmoothSurface] = useState(true);
  const [orbitMode, setOrbitMode] = useState(true);
  const [viewPreset, setViewPreset] = useState<string>("isometric");

  // Debounced axis values (delays 3D recomputation while user scrolls dropdowns)
  const dbXAxis = useDebounce(xAxis, 120);
  const dbYAxis = useDebounce(yAxis, 120);
  const dbZAxis = useDebounce(zAxis, 120);
  const dbDataset = useDebounce(dataset, 120);

  const containerRef = useRef<HTMLDivElement>(null);

  // ===== Fetch trades (once) =====
  useEffect(() => {
    let cancelled = false;
    const fetchTrades = async () => {
      try {
        const res = await fetch("/api/trades?limit=500");
        const data = await res.json();
        if (!cancelled) setTrades(data.trades || []);
      } catch (error) {
        if (!cancelled) console.error("Failed to fetch trades:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTrades();
    return () => { cancelled = true; };
  }, []);

  // ===== Pre-compute trade metrics once =====
  const tradeMetrics = useTradeMetrics(trades);

  // ===== Filter trades by dataset (debounced) =====
  const filteredTrades = useMemo(() => {
    const now = new Date();
    const filterDate = (() => {
      switch (dbDataset) {
        case "month": return new Date(now.getFullYear(), now.getMonth(), 1);
        case "3months": return new Date(now.getFullYear(), now.getMonth() - 3, 1);
        case "6months": return new Date(now.getFullYear(), now.getMonth() - 6, 1);
        case "year": return new Date(now.getFullYear(), 0, 1);
        default: return null;
      }
    })();
    if (!filterDate) return trades;
    return trades.filter((t) => new Date(t.entryDate) >= filterDate!);
  }, [trades, dbDataset]);

  // ===== Transform trades to 3D data points (debounced axes) =====
  const vizData = useMemo(() => {
    const closedTrades = filteredTrades.filter((t) => t.exitPrice !== null);
    if (!closedTrades.length) return [];

    // Single pass: compute raw values + collect arrays for normalization
    const raw: { x: number; y: number; z: number }[] = [];
    const xVals: number[] = [];
    const yVals: number[] = [];
    const zVals: number[] = [];

    for (let i = 0; i < closedTrades.length; i++) {
      const t = closedTrades[i];
      const m = tradeMetrics.get(t.id) || { pl: 0, rr: 0, plPercent: 0 };
      const duration = t.exitDate
        ? (new Date(t.exitDate).getTime() - new Date(t.entryDate).getTime()) / (1000 * 60 * 60 * 24)
        : 0;

      let xv = 0, yv = 0, zv = 0;
      switch (dbXAxis) {
        case "tradeNumber": xv = i + 1; break;
        case "pl": xv = m.pl; break;
        case "rr": xv = m.rr; break;
        case "winRate": xv = m.pl > 0 ? 1 : 0; break;
        case "duration": xv = duration; break;
        case "positionSize": xv = t.size; break;
        case "drawdown": xv = m.pl < 0 ? Math.abs(m.pl) : 0; break;
        case "volatility": xv = Math.abs(t.entryPrice - (t.exitPrice || t.entryPrice)) / t.entryPrice * 100; break;
      }
      switch (dbYAxis) {
        case "tradeNumber": yv = i + 1; break;
        case "pl": yv = m.pl; break;
        case "rr": yv = m.rr; break;
        case "winRate": yv = m.pl > 0 ? 1 : 0; break;
        case "duration": yv = duration; break;
        case "positionSize": yv = t.size; break;
        case "drawdown": yv = m.pl < 0 ? Math.abs(m.pl) : 0; break;
        case "volatility": yv = Math.abs(t.entryPrice - (t.exitPrice || t.entryPrice)) / t.entryPrice * 100; break;
      }
      switch (dbZAxis) {
        case "tradeNumber": zv = i + 1; break;
        case "pl": zv = m.pl; break;
        case "rr": zv = m.rr; break;
        case "winRate": zv = m.pl > 0 ? 1 : 0; break;
        case "duration": zv = duration; break;
        case "positionSize": zv = t.size; break;
        case "drawdown": zv = m.pl < 0 ? Math.abs(m.pl) : 0; break;
        case "volatility": zv = Math.abs(t.entryPrice - (t.exitPrice || t.entryPrice)) / t.entryPrice * 100; break;
      }

      raw.push({ x: xv, y: yv, z: zv });
      xVals.push(xv); yVals.push(yv); zVals.push(zv);
    }

    const normalize = (val: number, all: number[]): number => {
      const min = Math.min(...all);
      const max = Math.max(...all);
      if (max === min) return 0;
      return ((val - min) / (max - min)) * 6 - 3;
    };

    return closedTrades.map((t, i) => {
      const m = tradeMetrics.get(t.id) || { pl: 0, rr: 0, plPercent: 0 };
      return {
        id: t.id,
        x: normalize(raw[i].x, xVals),
        y: normalize(raw[i].y, yVals),
        z: normalize(raw[i].z, zVals),
        value: Math.abs(m.pl) / 500,
        isWin: m.pl > 0,
        isBreakEven: m.pl === 0,
        symbol: t.symbol,
        pl: m.pl,
        plPercent: t.type === "LONG" ? m.plPercent : -m.plPercent,
        rr: m.rr,
        positionSize: t.size,
        date: t.exitDate || t.entryDate,
        label: t.symbol,
        type: t.type,
      };
    });
  }, [filteredTrades, tradeMetrics, dbXAxis, dbYAxis, dbZAxis]);

  // ===== Statistics =====
  const stats = useMemo(() => {
    const total = vizData.length;
    const wins = vizData.filter((d) => d.isWin).length;
    const losses = vizData.filter((d) => !d.isWin && !d.isBreakEven).length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const totalPL = vizData.reduce((sum, d) => sum + (d.pl || 0), 0);
    const avgPL = total > 0 ? totalPL / total : 0;
    const maxDD = Math.min(
      ...vizData.map((d) => d.pl || 0)
    );

    // Simple clustering: count trades in 3x3x3 grid
    const gridSize = 3;
    const grid = new Set<string>();
    vizData.forEach((d) => {
      const cx = Math.floor((d.x + 3) / 2);
      const cy = Math.floor((d.y + 3) / 2);
      const cz = Math.floor((d.z + 3) / 2);
      grid.add(`${cx},${cy},${cz}`);
    });

    // Outliers: trades far from centroid
    const centroid = {
      x: vizData.reduce((s, d) => s + d.x, 0) / total || 0,
      y: vizData.reduce((s, d) => s + d.y, 0) / total || 0,
      z: vizData.reduce((s, d) => s + d.z, 0) / total || 0,
    };
    const distances = vizData.map((d) =>
      Math.sqrt(
        (d.x - centroid.x) ** 2 + (d.y - centroid.y) ** 2 + (d.z - centroid.z) ** 2
      )
    );
    const avgDist =
      distances.reduce((s, d) => s + d, 0) / distances.length || 0;
    const outliers = distances.filter((d) => d > avgDist * 1.5).length;

    return {
      total,
      winRate: winRate.toFixed(1),
      avgPL,
      maxDD,
      clusters: grid.size,
      outliers,
      wins,
      losses,
    };
  }, [vizData]);

  // ===== Handlers =====
  const handleReset = useCallback(() => {
    setXAxis("tradeNumber");
    setYAxis("pl");
    setZAxis("rr");
    setColorBy("winLoss");
    setSizeBy("uniform");
    setShowLabels(false);
    setShowGrid(true);
    setSmoothSurface(true);
    setViewPreset("isometric");
  }, []);

  const handleExport = useCallback(() => {
    // In a real app, this would capture the canvas as image
    // For now, show a toast or download placeholder
    const canvas = document.querySelector("canvas");
    if (canvas) {
      const link = document.createElement("a");
      link.download = `quant-3d-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  }, []);

  const handleZoomToFit = useCallback(() => {
    setViewPreset("custom");
    // Then reset to isometric after a frame
    requestAnimationFrame(() => {
      setViewPreset("isometric");
    });
  }, []);

  // ===== Axis label mappings =====
  const axisLabel = (axis: string) =>
    AXIS_OPTIONS.find((o) => o.value === axis)?.label || axis;

  // ===== Render =====
  return (
    <div className="space-y-4" ref={containerRef}>
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
            <Rotate3D className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">
              QUANT MODE — <span className="text-emerald-400">3D Data Visualization</span>
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Interactive 3D analysis of trading performance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="quant-btn-secondary flex items-center gap-1.5"
            title="Export 3D Screenshot"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            className="quant-btn-secondary flex items-center gap-1.5"
            title="Share"
          >
            <Share2 className="w-3 h-3" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ===== LEFT: View Controls ===== */}
        <div className="lg:col-span-2 space-y-3">
          {/* View Controls */}
          <div className="quant-panel rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="quant-panel-header flex items-center gap-1.5">
                <Layers className="w-3 h-3" />
                View Controls
              </h3>
              <button
                onClick={handleZoomToFit}
                className="text-slate-500 hover:text-emerald-400 transition-colors"
                title="Zoom to Fit"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Orbit / Pan Mode */}
            <div className="flex rounded-lg overflow-hidden border border-slate-700/50">
              <button
                onClick={() => setOrbitMode(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-medium transition-all ${
                  orbitMode
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-slate-800/50 text-slate-500 hover:text-slate-300"
                }`}
              >
                <Rotate3D className="w-3 h-3" />
                Orbit
              </button>
              <button
                onClick={() => setOrbitMode(false)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-medium transition-all ${
                  !orbitMode
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-slate-800/50 text-slate-500 hover:text-slate-300"
                }`}
              >
                <Move3D className="w-3 h-3" />
                Pan
              </button>
            </div>

            {/* View Presets */}
            <div className="space-y-1.5">
              <span className="text-[9px] text-slate-600 font-medium uppercase tracking-wider">
                View Presets
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {VIEW_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isActive = viewPreset === preset.value;
                  return (
                    <button
                      key={preset.value}
                      onClick={() => setViewPreset(preset.value)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-800/30 text-slate-500 border border-slate-700/30 hover:text-slate-300 hover:bg-slate-800/50"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chart Type */}
            <div className="space-y-1.5">
              <span className="text-[9px] text-slate-600 font-medium uppercase tracking-wider">
                Chart Type
              </span>
              <div className="space-y-1">
                {CHART_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isActive = chartType === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setChartType(type.value)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-800/30 text-slate-500 border border-slate-700/30 hover:text-slate-300 hover:bg-slate-800/50"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="quant-panel rounded-xl p-3 space-y-2">
            <h3 className="quant-panel-header flex items-center gap-1.5">
              <Eye className="w-3 h-3" />
              Display
            </h3>
            <ToggleRow
              icon={Grid3x3}
              label="Show Grid"
              checked={showGrid}
              onChange={setShowGrid}
            />
            <ToggleRow
              icon={Type}
              label="Show Labels"
              checked={showLabels}
              onChange={setShowLabels}
            />
            {chartType === "surface" && (
              <ToggleRow
                icon={Paintbrush}
                label="Smooth Surface"
                checked={smoothSurface}
                onChange={setSmoothSurface}
              />
            )}
          </div>
        </div>

        {/* ===== CENTER: 3D Viewport ===== */}
        <div className="lg:col-span-7">
          <div className="quant-panel rounded-xl overflow-hidden">
            {/* Viewport header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/20">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-slate-400 font-medium">
                  3D Viewport
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] text-slate-600">
                  Drag to rotate · Scroll to zoom
                </span>
                <button
                  onClick={handleZoomToFit}
                  className="text-slate-500 hover:text-emerald-400 transition-colors"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 3D Canvas */}
            {loading ? (
              <div className="h-[550px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <p className="text-xs text-slate-400">
                    Loading trade data...
                  </p>
                </div>
              </div>
            ) : vizData.length === 0 ? (
              <div className="h-[550px] flex flex-col items-center justify-center gap-3">
                <Box className="w-10 h-10 text-slate-700" />
                <p className="text-sm text-slate-500">
                  No trade data available
                </p>
                <Link
                  href="/jurnal"
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Add your first trade →
                </Link>
              </div>
            ) : (
              <QuantViz
                data={vizData}
                chartType={chartType as "scatter" | "surface" | "equity"}
                height={550}
                colorBy={colorBy as "winLoss" | "pl" | "assetType"}
                sizeBy={sizeBy as "positionSize" | "plAbs" | "uniform"}
                showLabels={showLabels}
                showGrid={showGrid}
                smoothSurface={smoothSurface}
                orbitMode={orbitMode}
                viewPreset={viewPreset as "isometric" | "top" | "front" | "side" | "custom"}
                onHover={(point) => setHoveredTrade(point)}
                onClick={(point) => {
                  window.open(`/jurnal/${point.id}`, "_blank");
                }}
              />
            )}
          </div>
        </div>

        {/* ===== RIGHT: Data Legend & Tooltip ===== */}
        <div className="lg:col-span-3 space-y-3">
          {/* Data Legend */}
          <div className="quant-panel rounded-xl p-3 space-y-2.5">
            <h3 className="quant-panel-header flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              Data Legend
            </h3>

            {/* Color mapping */}
            <div className="space-y-1.5">
              <span className="text-[9px] text-slate-600 font-medium">
                Color — {COLOR_OPTIONS.find((o) => o.value === colorBy)?.label}
              </span>
              <div className="space-y-1">
                <LegendItem color="bg-emerald-400" label="Winning Trades" />
                <LegendItem color="bg-red-400" label="Losing Trades" />
                <LegendItem color="bg-slate-400" label="Break-even" />
              </div>
            </div>

            {/* Size mapping */}
            <div className="space-y-1.5">
              <span className="text-[9px] text-slate-600 font-medium">
                Size — {SIZE_OPTIONS.find((o) => o.value === sizeBy)?.label}
              </span>
              <div className="flex items-center gap-3 px-2 py-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-slate-600 to-emerald-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex justify-between text-[9px] text-slate-600 px-2">
                <span>Small</span>
                <span>Large</span>
              </div>
            </div>
          </div>

          {/* Tooltip / Detail Panel */}
          <div className="quant-panel rounded-xl p-3 space-y-2 flex-1">
            <h3 className="quant-panel-header flex items-center gap-1.5">
              <Target className="w-3 h-3" />
              {hoveredTrade ? "Trade Detail" : "Point Info"}
            </h3>

            {hoveredTrade ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hoveredTrade.isBreakEven
                        ? "bg-slate-400"
                        : hoveredTrade.isWin
                        ? "bg-emerald-400"
                        : "bg-red-400"
                    }`}
                  />
                  <span className="text-sm font-semibold text-white">
                    {hoveredTrade.symbol}
                  </span>
                  {hoveredTrade.type && (
                    <span
                      className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                        hoveredTrade.type === "LONG"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {hoveredTrade.type}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <DetailStat
                    label={`${axisLabel(xAxis)} (X)`}
                    value={hoveredTrade.x.toFixed(2)}
                  />
                  <DetailStat
                    label={`${axisLabel(yAxis)} (Y)`}
                    value={hoveredTrade.y.toFixed(2)}
                  />
                  <DetailStat
                    label={`${axisLabel(zAxis)} (Z)`}
                    value={hoveredTrade.z.toFixed(2)}
                  />
                </div>

                <div className="h-px bg-slate-700/30" />

                <div className="space-y-1">
                  {hoveredTrade.pl !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">P/L</span>
                      <span
                        className={`text-[10px] font-mono font-semibold ${
                          hoveredTrade.pl >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {hoveredTrade.pl >= 0 ? "+" : ""}$
                        {hoveredTrade.pl.toFixed(2)}
                        {hoveredTrade.plPercent !== undefined && (
                          <span className="text-slate-500 ml-1">
                            ({hoveredTrade.plPercent >= 0 ? "+" : ""}
                            {hoveredTrade.plPercent.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {hoveredTrade.rr !== undefined && hoveredTrade.rr > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">R:R</span>
                      <span className="text-[10px] font-mono text-amber-400">
                        {hoveredTrade.rr.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {hoveredTrade.positionSize !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Size</span>
                      <span className="text-[10px] font-mono text-slate-300">
                        {hoveredTrade.positionSize.toFixed(0)}
                      </span>
                    </div>
                  )}
                  {hoveredTrade.date && (
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Date</span>
                      <span className="text-[10px] font-mono text-slate-300">
                        {new Date(hoveredTrade.date).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                  )}
                </div>

                <a
                  href={`/jurnal/${hoveredTrade.id}`}
                  className="block text-center text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors pt-1"
                >
                  Klik untuk detail →
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Target className="w-6 h-6 text-slate-700 mb-2" />
                <p className="text-[10px] text-slate-500">
                  Hover over a data point
                </p>
                <p className="text-[9px] text-slate-600 mt-1">
                  to see trade details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== BOTTOM: Data Selection Panel ===== */}
      <div className="quant-panel rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="quant-panel-header flex items-center gap-1.5">
            <ArrowUpDown className="w-3 h-3" />
            Data Selection
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="quant-btn-secondary text-[10px] px-2.5 py-1"
            >
              Reset
            </button>
            <button
              onClick={() => {
                // Apply: re-trigger computation via state change
                setViewPreset("custom");
                requestAnimationFrame(() => setViewPreset("isometric"));
              }}
              className="quant-btn-primary text-[10px] px-3 py-1"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Dataset */}
          <div className="space-y-1">
            <label className="text-[9px] text-slate-600 font-medium uppercase tracking-wider">
              Dataset
            </label>
            <select
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
              className="quant-select text-[10px]"
            >
              {DATASET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* X-Axis */}
          <div className="space-y-1">
            <label className="text-[9px] text-emerald-500 font-medium uppercase tracking-wider">
              X-Axis
            </label>
            <select
              value={xAxis}
              onChange={(e) => setXAxis(e.target.value)}
              className="quant-select text-[10px]"
            >
              {AXIS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Y-Axis */}
          <div className="space-y-1">
            <label className="text-[9px] text-emerald-500 font-medium uppercase tracking-wider">
              Y-Axis
            </label>
            <select
              value={yAxis}
              onChange={(e) => setYAxis(e.target.value)}
              className="quant-select text-[10px]"
            >
              {AXIS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Z-Axis */}
          <div className="space-y-1">
            <label className="text-[9px] text-emerald-500 font-medium uppercase tracking-wider">
              Z-Axis
            </label>
            <select
              value={zAxis}
              onChange={(e) => setZAxis(e.target.value)}
              className="quant-select text-[10px]"
            >
              {AXIS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div className="space-y-1">
            <label className="text-[9px] text-purple-400 font-medium uppercase tracking-wider">
              Color
            </label>
            <select
              value={colorBy}
              onChange={(e) => setColorBy(e.target.value)}
              className="quant-select text-[10px]"
            >
              {COLOR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Size */}
          <div className="space-y-1">
            <label className="text-[9px] text-amber-400 font-medium uppercase tracking-wider">
              Size
            </label>
            <select
              value={sizeBy}
              onChange={(e) => setSizeBy(e.target.value)}
              className="quant-select text-[10px]"
            >
              {SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ===== STATISTICS OVERLAY ===== */}
      <div className="quant-panel rounded-xl p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatBox
            label="Total Trades"
            value={stats.total.toString()}
            color="text-blue-400"
          />
          <StatBox
            label="Win Rate"
            value={`${stats.winRate}%`}
            color="text-emerald-400"
          />
          <StatBox
            label="Avg P/L"
            value={`${stats.avgPL >= 0 ? "+" : ""}$${stats.avgPL.toFixed(2)}`}
            color={stats.avgPL >= 0 ? "text-emerald-400" : "text-red-400"}
          />
          <StatBox
            label="Max Drawdown"
            value={`-$${Math.abs(stats.maxDD).toFixed(0)}`}
            color="text-red-400"
          />
          <StatBox
            label="3D Points"
            value={stats.total.toString()}
            color="text-purple-400"
          />
          <StatBox
            label="Clusters"
            value={stats.clusters.toString()}
            color="text-amber-400"
          />
          <StatBox
            label="Outliers"
            value={stats.outliers.toString()}
            color="text-cyan-400"
          />
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/dashboard"
          className="quant-btn-secondary flex items-center gap-1.5 text-[10px]"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="quant-btn-secondary flex items-center gap-1.5 text-[10px]"
          >
            <Download className="w-3 h-3" />
            Export 3D Screenshot
          </button>
          <button className="quant-btn-primary flex items-center gap-1.5 text-[10px]">
            <Share2 className="w-3 h-3" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Sub-components =====

function ToggleRow({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800/50 transition-colors"
    >
      <span className="flex items-center gap-2 text-[10px] text-slate-400">
        <Icon className="w-3 h-3" />
        {label}
      </span>
      <div
        className={`w-7 h-3.5 rounded-full transition-colors relative ${
          checked ? "bg-emerald-500/40" : "bg-slate-700"
        }`}
      >
        <div
          className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${
            checked ? "left-4 bg-emerald-400" : "left-0.5"
          }`}
        />
      </div>
    </button>
  );
}

function LegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="quant-legend-item">
      <span className={`w-2.5 h-2.5 rounded-full ${color} flex-shrink-0`} />
      <span className="text-[10px] text-slate-400">{label}</span>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="quant-stat">
      <span className={`quant-stat-value ${color}`}>{value}</span>
      <span className="quant-stat-label">{label}</span>
    </div>
  );
}

function DetailStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col p-1.5 rounded-lg bg-slate-800/30">
      <span className="text-[9px] text-slate-600">{label}</span>
      <span className="text-[10px] font-mono text-slate-300 mt-0.5">
        {value}
      </span>
    </div>
  );
}
