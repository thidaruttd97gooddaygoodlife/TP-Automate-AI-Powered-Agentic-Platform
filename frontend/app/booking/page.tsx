"use client";

import { useEffect, useState } from "react";

import { FloatingChatbot } from "@/components/FloatingChatbot";
import { RoleGuard } from "@/components/RoleGuard";
import { UserSidebar } from "@/components/UserSidebar";
import { bookingAssistant, bookServiceSlot, getServiceQueue, type AgentStep, type ServiceQueueItem } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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

function BookingContent() {
  const { user } = useAuth();
  const [request, setRequest] = useState("ช่วยออกแบบ workflow AI Agent สำหรับคัดกรองคำขอ ตรวจสอบความพร้อม และเสนอทางเลือกที่ดีที่สุด");
  const [answer, setAnswer] = useState("");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [queueRows, setQueueRows] = useState<ServiceQueueItem[]>([]);
  const [queueError, setQueueError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;

    const userId = user.id;
    const userRole = user.role ?? "user";

    async function loadQueue() {
      try {
        const response = await getServiceQueue(userId, userRole);
        setQueueRows(response.rows || []);
        setQueueError("");
      } catch {
        setQueueError("ไม่สามารถโหลดสถานะ workflow แบบเรียลไทม์ได้");
      }
    }

    void loadQueue();
    const interval = setInterval(() => {
      void loadQueue();
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.id, user?.role]);

  async function handleBooking() {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const response = await bookingAssistant(request, user.id, user.role ?? "user");
      setAnswer(response.response);
      setSteps(response.steps || []);
    } catch {
      setError("AI Agent ประมวลผลไม่สำเร็จ กรุณาตรวจสอบ backend และลองอีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickBook(slotId: number) {
    if (!user?.id) return;
    try {
      await bookServiceSlot(slotId, user.id, user.role ?? "user");
      const refreshed = await getServiceQueue(user.id, user.role ?? "user");
      setQueueRows(refreshed.rows || []);
    } catch {
      setQueueError("ดำเนินการไม่สำเร็จ รายการนี้อาจถูกอัปเดตไปแล้ว");
    }
  }

  function slotStatusLabel(status: ServiceQueueItem["status"]) {
    return status === "Available" ? "ว่าง" : "ถูกจองแล้ว";
  }

  return (
    <div className="dashboard-shell">
      <UserSidebar />
      <main className="min-h-screen bg-slate-950 p-6 lg:p-8">
        <header className="mb-6 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-red-400">TP-Automate · AI Agent</p>
          <h1 className="mt-1.5 font-display text-2xl font-bold text-slate-100 lg:text-3xl">ผู้ช่วย AI วางแผนและจองคิวซ่อมรถ</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            พิมพ์คำขอ AI จะวิเคราะห์ ตรวจสอบตารางงาน และเสนอทางเลือกที่เหมาะสมให้อัตโนมัติ — เห็นทุกขั้นตอนที่ AI คิด
          </p>
        </header>

        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-panel">
          <textarea
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-red-400 focus:ring"
          />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void handleBooking()}
              disabled={loading}
              className="rounded-lg bg-brandRed px-6 py-4 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  AI กำลังวางแผน...
                </span>
              ) : "ส่งคำขอ"}
            </button>
          </div>
          {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

          {/* Answer card — hero prominence */}
          <article className={`rounded-2xl border shadow-panel transition-all ${
            answer
              ? "border-red-500/40 bg-gradient-to-br from-slate-900 via-red-950/20 to-slate-900"
              : "border-slate-700 bg-slate-900"
          } p-6`}>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">✨</span>
              <h3 className="font-display text-base font-semibold text-slate-100">คำตอบจาก AI</h3>
              {answer && <span className="ml-auto rounded-full bg-red-900/60 px-2.5 py-0.5 text-xs font-semibold text-red-300">พร้อมแล้ว</span>}
            </div>
            {answer ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{answer}</p>
            ) : (
              <p className="text-sm text-slate-500">คำตอบจาก AI จะปรากฏที่นี่หลังส่งคำขอ</p>
            )}
          </article>

          {/* Steps card — timeline with icons */}
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-panel">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">🧠</span>
              <h3 className="font-display text-base font-semibold text-slate-100">ขั้นตอนที่ AI ดำเนินการ</h3>
              {steps.length > 0 && (
                <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{steps.length} ขั้นตอน</span>
              )}
            </div>
            <div className="relative space-y-0">
              {steps.length === 0 ? (
                <p className="text-sm text-slate-500">ขั้นตอนการคิดของ AI จะแสดงที่นี่</p>
              ) : (
                steps.map((step, index) => (
                  <div key={`${step.action}-${index}`} className="flex gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm">
                        {stepIcon(step.action)}
                      </div>
                      {index < steps.length - 1 && <div className="w-px flex-1 bg-slate-700 my-1" />}
                    </div>
                    <div className="pb-3 pt-0.5">
                      <p className="text-xs font-semibold text-red-400">{step.action}</p>
                      <p className="text-xs text-slate-400">{step.detail}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-panel">
          <h3 className="font-display text-base font-semibold text-slate-100">📋 ตารางคิวซ่อม — อัปเดตอัตโนมัติทุก 5 วินาที</h3>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-3 pr-4">วันที่</th>
                  <th className="py-3 pr-4">เวลา</th>
                  <th className="py-3 pr-4">ผู้รับผิดชอบ</th>
                  <th className="py-3 pr-4">สถานะ</th>
                  <th className="py-3">การทำรายการ</th>
                </tr>
              </thead>
              <tbody>
                {queueRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">ยังไม่มีรายการที่สามารถแสดงได้</td>
                  </tr>
                ) : (
                  queueRows.map((slot) => (
                    <tr key={slot.id} className="border-b border-slate-800 last:border-b-0">
                      <td className="py-4 pr-4 text-slate-200">{slot.date}</td>
                      <td className="py-4 pr-4 text-slate-200">{slot.time_slot}</td>
                      <td className="py-4 pr-4 text-slate-200">{slot.tech_id}</td>
                      <td className="py-4 pr-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${slot.status === "Available" ? "bg-emerald-950/60 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                          {slotStatusLabel(slot.status)}
                        </span>
                      </td>
                      <td className="py-4">
                        <button
                          type="button"
                          disabled={slot.status !== "Available"}
                          onClick={() => void handleQuickBook(slot.id)}
                          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          ดำเนินการ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {queueError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{queueError}</p>}
        </section>

        <FloatingChatbot />
      </main>
    </div>
  );
}

export default function BookingPage() {
  return (
    <RoleGuard allowedRoles={["user"]}>
      <BookingContent />
    </RoleGuard>
  );
}
