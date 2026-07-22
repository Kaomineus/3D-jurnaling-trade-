"use client";

import { Menu, Bell, Search } from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface TopBarProps {
  onMenuClick: () => void;
  title: string;
}

export default function TopBar({ onMenuClick, title }: TopBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
      <div className="flex items-center justify-between px-4 lg:px-6 h-14">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-slate-400 hover:text-white transition-colors p-1"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-slate-300 transition-colors text-xs">
            <Search className="w-3.5 h-3.5" />
            <span>Cari trade...</span>
            <kbd className="hidden md:inline-flex px-1.5 py-0.5 rounded bg-slate-700/50 text-[10px] text-slate-500">
              ⌘K
            </kbd>
          </button>

          {/* Notifications */}
          <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all">
            <Bell className="w-4.5 h-4.5" strokeWidth={1.5} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full" />
          </button>

          {/* User avatar */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-xs font-bold text-white hover:shadow-lg hover:shadow-emerald-500/20 transition-shadow"
            >
              T
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 py-2 bg-slate-800 rounded-xl border border-slate-700/50 shadow-xl shadow-black/20 z-50">
                  <div className="px-3 py-2 border-b border-slate-700/50">
                    <p className="text-xs font-medium text-white">Trader</p>
                    <p className="text-[10px] text-slate-400">trader@email.com</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push("/pengaturan");
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50 transition-colors"
                  >
                    Pengaturan
                  </button>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-slate-700/50 transition-colors"
                  >
                    Keluar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
