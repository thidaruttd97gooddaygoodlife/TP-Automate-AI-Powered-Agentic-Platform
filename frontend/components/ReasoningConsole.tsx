"use client";

import { useState } from "react";

import { queryAgent, type AgentStep } from "@/lib/api";

function stepIcon(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("book") || a.includes("จอง") || a.includes("slot")) return "📅";
  if (a.includes("check") || a.includes("ตรวจ") || a.includes("ค้น") || a.includes("search")) return "🔍";
  if (a.includes("done") || a.includes("สำเร็จ") || a.includes("complete") || a.includes("finish")) return "✅";
  if (a.includes("calc") || a.includes("คำนวณ") || a.includes("cost") || a.includes("price")) return "🧮";
  if (a.includes("recommend") || a.includes("suggest") || a.includes("แนะ")) return "💡";
  if (a.includes("error") || a.includes("fail") || a.includes("ผิดพลาด")) return "❌";
  return "⚙️";
}

export function ReasoningConsole() {
  const [input, setInput] = useState("ตรวจสอบคิวบริการวันที่ 2026-03-26 สำหรับปัญหาเบรก");
  const [answer, setAnswer] = useState("");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitPrompt() {
    if (!input.trim()) {
      setError("กรุณากรอกคำขอสำหรับผู้ช่วยบริการ");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const data = await queryAgent(input);
      setAnswer(data.response);
      setSteps(data.steps || []);
    } catch {
      setError("ไม่สามารถเรียกใช้งานผู้ช่วยได้ กรุณาตรวจสอบ backend และลองอีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">คอนโซลวิเคราะห์ของ AI</h3>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">ประวัติการทำงาน</span>
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-red-300 focus:ring"
          placeholder="พิมพ์คำถามเรื่องคิวซ่อม การวิเคราะห์ หรือคู่มือ"
        />
        <button
          type="button"
          onClick={() => void submitPrompt()}
          disabled={loading}
          className="rounded-lg bg-brandRed px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-70"
        >
          {loading ? "กำลังคิด..." : "ประมวลผล"}
        </button>
      </div>

      {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Steps — timeline with icons */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">🧠 ขั้นตอนที่ AI ดำเนินการ</p>
          <div className="max-h-56 space-y-0 overflow-y-auto pr-1">
            {steps.length === 0 ? (
              <p className="text-sm text-slate-400">ยังไม่มีขั้นตอนที่บันทึกไว้</p>
            ) : (
              steps.map((step, idx) => (
                <div key={`${step.action}-${idx}`} className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-sm shadow-sm">
                      {stepIcon(step.action)}
                    </div>
                    {idx < steps.length - 1 && <div className="w-px flex-1 bg-slate-200 my-0.5" />}
                  </div>
                  <div className="pb-2.5 pt-0">
                    <p className="text-xs font-semibold text-red-700">{step.action}</p>
                    <p className="text-xs text-slate-500">{step.detail}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Answer — prominent */}
        <div className={`rounded-xl border p-4 transition-all ${
          answer ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"
        }`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">✨ คำตอบจาก AI</p>
          {answer ? (
            <p className="text-sm leading-relaxed text-slate-800">{answer}</p>
          ) : (
            <p className="text-sm text-slate-400">คำตอบจะแสดงที่นี่หลังประมวลผล</p>
          )}
        </div>
      </div>
    </section>
  );
}
