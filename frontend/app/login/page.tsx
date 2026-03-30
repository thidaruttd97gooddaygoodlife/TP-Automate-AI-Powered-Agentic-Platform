"use client";

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Shield, User } from "lucide-react";

import { useAuth } from "@/lib/auth";

type RoleTab = "user" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuth();
  const [tab, setTab] = useState<RoleTab>("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!email.trim()) { setError("กรุณาระบุอีเมล"); return; }
    if (tab === "user" && !password) { setError("กรุณาระบุรหัสผ่าน"); return; }
    try {
      await login(email.trim(), tab === "user" ? "user" : "admin", tab === "user" ? password : undefined);
      router.push(tab === "user" ? "/" : "/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleLogin();
  };

  const switchTab = (next: RoleTab) => {
    setTab(next);
    setError("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center p-4">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-red-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-24 w-[400px] h-[400px] rounded-full bg-slate-700/25 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-900/50 mb-4">
            <span className="text-2xl font-black text-white">A</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AUTO CORE</h1>
          <p className="mt-1 text-sm text-slate-400">แพลตฟอร์มบริการรถยนต์อัจฉริยะ</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/8 bg-slate-900/60 backdrop-blur-xl p-6 shadow-2xl">

          {/* Role Tab Switcher */}
          <div className="flex rounded-xl bg-slate-800/70 p-1 mb-6">
            <button
              onClick={() => switchTab("user")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                tab === "user"
                  ? "bg-red-600 text-white shadow-md shadow-red-900/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <User size={14} />
              ลูกค้า
            </button>
            <button
              onClick={() => switchTab("admin")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                tab === "admin"
                  ? "bg-slate-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Shield size={14} />
              เจ้าหน้าที่
            </button>
          </div>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                อีเมล
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKey}
                placeholder="name@example.com"
                suppressHydrationWarning
                className="w-full rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
              />
            </div>

            {/* Password — only for ลูกค้า */}
            {tab === "user" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="รหัสผ่านของคุณ"
                    suppressHydrationWarning
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Error box */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading || !email.trim() || (tab === "user" && !password)}
              className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </div>

          {/* Footer */}
          {tab === "user" ? (
            <p className="mt-5 text-center text-sm text-slate-500">
              ยังไม่มีบัญชี?{" "}
              <Link href="/register" className="font-semibold text-red-400 transition hover:text-red-300">
                สมัครสมาชิก
              </Link>
            </p>
          ) : (
            <p className="mt-5 text-center text-xs text-slate-600">
              Demo mode · ใช้อีเมลใดก็ได้เพื่อเข้าสู่ระบบ
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

