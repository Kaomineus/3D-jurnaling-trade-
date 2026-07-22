"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  User,
  Bell,
  Shield,
  Palette,
  Database,
  LogOut,
  ChevronRight,
  Loader2,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import { signOut } from "next-auth/react";

const settingsSections = [
  {
    id: "profile",
    label: "Profil",
    icon: User,
    description: "Informasi akun dan preferensi pribadi",
  },
  {
    id: "notifications",
    label: "Notifikasi",
    icon: Bell,
    description: "Atur notifikasi dan pengingat trading",
  },
  {
    id: "security",
    label: "Keamanan",
    icon: Shield,
    description: "Pengaturan keamanan dan sesi",
  },
  {
    id: "appearance",
    label: "Tampilan",
    icon: Palette,
    description: "Tema dan preferensi visual",
  },
  {
    id: "storage",
    label: "Penyimpanan",
    icon: Database,
    description: "Kuota penyimpanan dan manajemen file",
  },
];

export default function PengaturanPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [dailyReminder, setDailyReminder] = useState("20:00");
  const [name, setName] = useState(session?.user?.name || "");

  const handleSaveProfile = async () => {
    setSaving(true);
    // Simulate saving
    await new Promise((r) => setTimeout(r, 1000));
    toast.success("Profil diperbarui!");
    setSaving(false);
  };

  const storageUsed = 45; // MB
  const storageTotal = 500; // MB
  const storagePercent = (storageUsed / storageTotal) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white">Pengaturan</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Kelola akun dan preferensi aplikasi
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="glass-card rounded-xl p-2 space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    activeSection === section.id
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  <span>{section.label}</span>
                  <ChevronRight className="w-3 h-3 ml-auto" />
                </button>
              );
            })}
          </nav>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2 px-3 py-2.5 mt-3 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeSection === "profile" && (
            <div className="glass-card rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-800/50">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-xl font-bold text-white">
                  {(session?.user?.name || "T")[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {session?.user?.name || "Trader"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {session?.user?.email || "trader@email.com"}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nama
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full max-w-md px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ""}
                  disabled
                  className="w-full max-w-md px-3 py-2 bg-slate-800/30 border border-slate-700/30 rounded-lg text-sm text-slate-400 cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Email tidak dapat diubah
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <Save className="w-3.5 h-3.5" />
                  Simpan Perubahan
                </button>
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="glass-card rounded-xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-white">
                Pengaturan Notifikasi
              </h3>

              <div className="flex items-center justify-between py-3 border-b border-slate-800/50">
                <div>
                  <p className="text-sm text-white">Pengingat Journaling</p>
                  <p className="text-xs text-slate-400">
                    Ingatkan untuk mencatat trade setiap hari
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>

              {reminderEnabled && (
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-300">
                    Waktu pengingat:
                  </label>
                  <input
                    type="time"
                    value={dailyReminder}
                    onChange={(e) => setDailyReminder(e.target.value)}
                    className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-white">Ringkasan Mingguan</p>
                  <p className="text-xs text-slate-400">
                    Kirim ringkasan performa setiap minggu
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>
            </div>
          )}

          {activeSection === "appearance" && (
            <div className="glass-card rounded-xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-white">
                Tampilan
              </h3>

              <div className="flex items-center justify-between py-3 border-b border-slate-800/50">
                <div>
                  <p className="text-sm text-white">Mode Gelap</p>
                  <p className="text-xs text-slate-400">
                    Menggunakan tema gelap (selalu aktif)
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
                  Active
                </span>
              </div>

              <div>
                <p className="text-sm text-white mb-3">Density Tampilan</p>
                <div className="flex gap-2">
                  {["Comfortable", "Standard", "Compact"].map((d) => (
                    <button
                      key={d}
                      className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        d === "Standard"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "storage" && (
            <div className="glass-card rounded-xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-white">
                Penyimpanan
              </h3>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-400">Kuota Gambar</p>
                  <p className="text-xs text-slate-300 font-mono">
                    {storageUsed} MB / {storageTotal} MB
                  </p>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      storagePercent > 80
                        ? "bg-red-500"
                        : storagePercent > 60
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {storagePercent > 80
                    ? "Peringatan: Kuota hampir habis!"
                    : `${(storageTotal - storageUsed).toFixed(
                        0
                      )} MB tersisa`}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <p className="text-xs text-amber-400">
                  ⚡ Kuota penyimpanan dapat ditingkatkan di versi mendatang.
                </p>
              </div>
            </div>
          )}

          {activeSection === "security" && (
            <div className="glass-card rounded-xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-white">Keamanan</h3>

              <div>
                <p className="text-sm text-white mb-1">Ubah Password</p>
                <p className="text-xs text-slate-400 mb-3">
                  Password minimal 6 karakter
                </p>
                <div className="space-y-3 max-w-sm">
                  <input
                    type="password"
                    placeholder="Password saat ini"
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                  <input
                    type="password"
                    placeholder="Password baru"
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                  <input
                    type="password"
                    placeholder="Konfirmasi password baru"
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                  <button className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs font-medium rounded-lg transition-all border border-slate-600/50">
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
