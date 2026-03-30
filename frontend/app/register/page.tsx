"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";

import { registerUser } from "@/lib/api";

function passwordStrength(pw: string): { score: number; label: string; textColor: string; barColor: string } {
  if (!pw) return { score: 0, label: "", textColor: "", barColor: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  const labels = ["", "อ่อนมาก", "พอใช้ได้", "ดี", "แข็งแกร่ง"];
  const textColors = ["", "text-red-400", "text-amber-400", "text-blue-400", "text-emerald-400"];
  const barColors = ["", "bg-red-500", "bg-amber-400", "bg-blue-400", "bg-emerald-400"];
  return { score, label: labels[score] ?? "", textColor: textColors[score] ?? "", barColor: barColors[score] ?? "" };
}

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const str = passwordStrength(password);
  const pwMatch = confirmPassword.length > 0 && password === confirmPassword;
  const pwMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = fullName.trim().length > 0 && email.trim().length > 0 && password.length >= 8 && pwMatch;

  const handleRegister = async () => {
    setError("");
    if (!fullName.trim()) { setError("กรุณาระบุชื่อ-นามสกุล"); return; }
    if (!email.trim()) { setError("กรุณาระบุอีเมล"); return; }
    if (password.length < 8) { setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"); return; }
    if (password !== confirmPassword) { setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน"); return; }

    setLoading(true);
    try {
      const data = await registerUser(fullName.trim(), email.trim(), password);
      window.localStorage.setItem("tp-automate-token", data.access_token);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
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
          <p className="mt-1 text-sm text-slate-400">สร้างบัญชีใหม่</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/8 bg-slate-900/60 backdrop-blur-xl p-6 shadow-2xl">
          <div className="space-y-4">

            {/* Full name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                ชื่อ-นามสกุล
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="เช่น สมชาย ใจดี"
                suppressHydrationWarning
                className="w-full rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                อีเมล
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                suppressHydrationWarning
                className="w-full rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  suppressHydrationWarning
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= str.score ? str.barColor : "bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                  {str.label && (
                    <p className={`text-xs ${str.textColor}`}>ความแข็ง: {str.label}</p>
                  )}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                ยืนยันรหัสผ่าน
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  suppressHydrationWarning
                  className={`w-full rounded-xl border bg-slate-800/70 px-4 py-3 pr-16 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                    pwMismatch
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/25"
                      : pwMatch
                      ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/25"
                      : "border-slate-700 focus:border-red-500 focus:ring-red-500/25"
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {pwMatch && <Check size={14} className="text-emerald-400" />}
                  {pwMismatch && <X size={14} className="text-red-400" />}
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    tabIndex={-1}
                    className="text-slate-500 transition hover:text-slate-300"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {pwMismatch && (
                <p className="mt-1 text-xs text-red-400">รหัสผ่านไม่ตรงกัน</p>
              )}
            </div>

            {/* Error box */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleRegister}
              disabled={loading || !canSubmit}
              className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "กำลังสมัครสมาชิก..." : "สร้างบัญชี"}
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-slate-500">
            มีบัญชีแล้ว?{" "}
            <Link href="/login" className="font-semibold text-red-400 transition hover:text-red-300">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
