"use client";

import { useState, useCallback } from "react";
import { Trade, TradeFormData } from "@/types";
import ImageUpload from "./ImageUpload";
import { X, Loader2, TrendingUp, TrendingDown, Plus } from "lucide-react";
import toast from "react-hot-toast";

interface TradeFormProps {
  trade?: Trade | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadedImage {
  id: string;
  url: string;
  thumbnailUrl: string;
}

const moods = [
  { value: "happy" as const, label: "Happy", emoji: "😊" },
  { value: "neutral" as const, label: "Neutral", emoji: "😐" },
  { value: "sad" as const, label: "Sad", emoji: "😔" },
];

const defaultFormData: TradeFormData = {
  symbol: "",
  type: "LONG",
  entryDate: "",
  exitDate: "",
  entryPrice: "",
  exitPrice: "",
  size: "",
  sl: "",
  tp: "",
  notes: "",
  mood: "neutral",
  tags: [],
  commission: "",
};

function buildInitialFormData(trade?: Trade | null): TradeFormData {
  if (!trade) return defaultFormData;
  return {
    symbol: trade.symbol,
    type: trade.type,
    entryDate: new Date(trade.entryDate).toISOString().slice(0, 16),
    exitDate: trade.exitDate
      ? new Date(trade.exitDate).toISOString().slice(0, 16)
      : "",
    entryPrice: trade.entryPrice.toString(),
    exitPrice: trade.exitPrice?.toString() || "",
    size: trade.size.toString(),
    sl: trade.sl?.toString() || "",
    tp: trade.tp?.toString() || "",
    notes: trade.notes || "",
    mood: trade.mood || "neutral",
    tags: trade.tags || [],
    commission: trade.commission?.toString() || "",
  };
}

function buildInitialImages(trade?: Trade | null): UploadedImage[] {
  if (!trade?.images) return [];
  return trade.images.map((img) => ({
    id: img.id,
    url: img.url,
    thumbnailUrl: img.thumbnailUrl || img.url,
  }));
}

export default function TradeForm({ trade, onClose, onSuccess }: TradeFormProps) {
  const [formData, setFormData] = useState<TradeFormData>(
    buildInitialFormData(trade)
  );
  const [tagInput, setTagInput] = useState("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(
    buildInitialImages(trade)
  );
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput("");
    }
  }, [tagInput, formData.tags]);

  const removeTag = useCallback((tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  }, []);

  const handleImageUploaded = useCallback((image: UploadedImage) => {
    setUploadedImages((prev) => [...prev, image]);
  }, []);

  const handleImageRemoved = useCallback((imageId: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = trade ? `/api/trades/${trade.id}` : "/api/trades";
      const method = trade ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          imageIds: uploadedImages.map((img) => img.id),
        }),
      });

      if (!res.ok) throw new Error("Failed to save trade");

      toast.success(trade ? "Trade diperbarui!" : "Trade berhasil ditambahkan!");
      onSuccess();
    } catch (error) {
      toast.error("Gagal menyimpan trade");
    } finally {
      setLoading(false);
    }
  };

  const pl =
    formData.exitPrice && formData.entryPrice
      ? formData.type === "LONG"
        ? (parseFloat(formData.exitPrice) - parseFloat(formData.entryPrice)) *
          parseFloat(formData.size || "0")
        : (parseFloat(formData.entryPrice) - parseFloat(formData.exitPrice)) *
          parseFloat(formData.size || "0")
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 rounded-2xl border border-slate-800/50 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-xl">
          <h2 className="text-base font-semibold text-white">
            {trade ? "Edit Trade" : "Add New Trade"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Symbol
              </label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                placeholder="AAPL"
                required
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, type: "LONG" }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    formData.type === "LONG"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, type: "SHORT" }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    formData.type === "SHORT"
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white"
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  Short
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Entry Date
              </label>
              <input
                type="datetime-local"
                name="entryDate"
                value={formData.entryDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Exit Date
              </label>
              <input
                type="datetime-local"
                name="exitDate"
                value={formData.exitDate}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Entry Price
              </label>
              <input
                type="number"
                name="entryPrice"
                value={formData.entryPrice}
                onChange={handleChange}
                placeholder="152.30"
                step="0.01"
                required
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Exit Price
              </label>
              <input
                type="number"
                name="exitPrice"
                value={formData.exitPrice}
                onChange={handleChange}
                placeholder="155.80"
                step="0.01"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Size (units)
              </label>
              <input
                type="number"
                name="size"
                value={formData.size}
                onChange={handleChange}
                placeholder="100"
                required
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Commission
              </label>
              <input
                type="number"
                name="commission"
                value={formData.commission}
                onChange={handleChange}
                placeholder="0"
                step="0.01"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Stop Loss
              </label>
              <input
                type="number"
                name="sl"
                value={formData.sl}
                onChange={handleChange}
                placeholder="150.00"
                step="0.01"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Take Profit
              </label>
              <input
                type="number"
                name="tp"
                value={formData.tp}
                onChange={handleChange}
                placeholder="160.00"
                step="0.01"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
              />
            </div>
          </div>

          {formData.exitPrice && formData.entryPrice && (
            <div
              className={`p-3 rounded-lg text-center ${
                pl >= 0
                  ? "bg-emerald-500/5 border border-emerald-500/10"
                  : "bg-red-500/5 border border-red-500/10"
              }`}
            >
              <span className="text-xs text-slate-400">Estimated P/L: </span>
              <span
                className={`text-base font-bold font-mono ${
                  pl >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {pl >= 0 ? "+" : ""}${pl.toFixed(2)}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-700/50 text-slate-300"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
                placeholder="Tambah tag..."
                className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600/50 transition-all text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Mood
            </label>
            <div className="flex gap-2">
              {moods.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, mood: m.value }))}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    formData.mood === m.value
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white"
                  }`}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Catatan trading..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
            />
          </div>

          <ImageUpload
            tradeId={trade?.id || null}
            images={uploadedImages}
            onImageUploaded={handleImageUploaded}
            onImageRemoved={handleImageRemoved}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? "Saving..." : trade ? "Update Trade" : "Save Trade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
