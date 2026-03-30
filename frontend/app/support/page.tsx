"use client";

import { useState } from "react";

import { FloatingChatbot } from "@/components/FloatingChatbot";
import { RoleGuard } from "@/components/RoleGuard";
import { UserSidebar } from "@/components/UserSidebar";
import { queryManual } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function SupportContent() {
  const { user } = useAuth();
  const [question, setQuestion] = useState("ช่วยสรุปแนวทางทำ AI Production ให้เกิดมูลค่าธุรกิจจริงจากเอกสารความรู้ที่มี");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAsk() {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const response = await queryManual(question, user.id, user.role ?? "user");
      setAnswer(response.answer);
      setSources(response.sources || []);
    } catch {
      setError("ผู้ช่วย RAG ตอบได้เฉพาะข้อมูลในคลังความรู้ หากข้อมูลไม่พอให้เพิ่มเอกสารหรือถามให้เฉพาะเจาะจงขึ้น");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-shell">
      <UserSidebar />
      <main className="p-6 lg:p-8 bg-slate-950 min-h-screen">
        <header className="mb-6 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-panel">
          <p className="text-sm tracking-[0.04em] text-red-400">RAG Chatbot Lab</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-100">ผู้ช่วย AI แบบอ้างอิงความรู้</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            ถาม-ตอบเชิงธุรกิจจากฐานความรู้ที่ควบคุมได้ ช่วยให้คำตอบแม่นขึ้น ตรวจสอบที่มาได้ และพร้อมใช้ในงาน production
          </p>
        </header>

        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-panel">
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">คำถามแนะนำ</p>
            <div className="flex flex-wrap gap-2">
              {[
                "ประเมินราคาซ่อมไฟหน้า LED Matrix",
                "ชนหนักระดับ H3 ต้องซ่อมกี่วัน?",
                "เงื่อนไขการเคลมแบบไม่มีคู่กรณี (Excess)",
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuestion(q)}
                  className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:border-red-500 hover:text-red-400"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-red-400 focus:ring"
          />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void handleAsk()}
              disabled={loading}
              className="rounded-lg bg-brandRed px-6 py-4 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
            >
              {loading ? "กำลังค้นหา..." : "ส่งคำถาม"}
            </button>
          </div>
          {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-panel">
            <h3 className="font-display text-lg font-semibold text-slate-100">คำตอบ</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{answer || "คำตอบจากระบบจะแสดงที่นี่หลังส่งคำถาม"}</p>
          </article>
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-panel">
            <h3 className="font-display text-lg font-semibold text-slate-100">แหล่งอ้างอิง</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              {sources.length === 0 ? (
                <p className="text-slate-400">ยังไม่มีแหล่งอ้างอิง</p>
              ) : (
                sources.map((source) => (
                  <div key={source} className="rounded-lg bg-slate-800 px-3 py-2">
                    {source}
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <FloatingChatbot />
      </main>
    </div>
  );
}

export default function SupportPage() {
  return (
    <RoleGuard allowedRoles={["user"]}>
      <SupportContent />
    </RoleGuard>
  );
}
