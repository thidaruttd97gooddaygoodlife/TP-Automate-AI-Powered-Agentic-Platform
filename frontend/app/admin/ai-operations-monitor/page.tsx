"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminSidebar } from "@/components/AdminSidebar";
import { RoleGuard } from "@/components/RoleGuard";
import { TokenUsageChart } from "@/components/TokenUsageChart";
import { getAIOperationsMonitor, getTokenUsage } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function AIOperationsMonitorContent() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<any>(null);
  const [monitor, setMonitor] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      try {
        const [usageData, monitorData] = await Promise.all([
          getTokenUsage(user.id, user.role ?? "admin"),
          getAIOperationsMonitor(user.id, user.role ?? "admin"),
        ]);
        setUsage(usageData);
        setMonitor(monitorData);
      } catch {
        setError("ไม่สามารถโหลดข้อมูลมอนิเตอร์แบบเรียลไทม์ได้");
      }
    })();
  }, [user?.id, user?.role]);

  const latencyStatus = useMemo(() => {
    const latency = monitor?.avg_latency_ms ?? 0;
    if (latency <= 10000) return "normal";
    return "warning";
  }, [monitor]);

  return (
    <div className="dashboard-shell">
      <AdminSidebar />
      <main className="p-6 lg:p-8">
        <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-panel">
          <p className="text-sm tracking-[0.04em] text-red-700">ปฏิบัติการอัจฉริยะ</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">ติดตามระบบ AI</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            ติดตามค่า latency ต้นทุนต่อเคลม และสัดส่วนการใช้งานโมเดล เพื่อควบคุมคุณภาพและต้นทุนงานบริการ
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <TokenUsageChart usage={usage} />
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
            <h3 className="font-display text-lg font-semibold text-slate-800">ตัวชี้วัดเรียลไทม์</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="rounded-lg bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">ค่าเฉลี่ยเวลา API</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{(monitor?.avg_latency_ms ?? 0).toFixed(2)} ms</p>
                <p className={latencyStatus === "normal" ? "text-slate-900" : "text-red-700"}>
                  เป้าหมายต่ำกว่า 10,000 ms
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">ต้นทุนโทเคนต่อเคลม</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">${(monitor?.avg_cost_per_claim_usd ?? 0).toFixed(4)}</p>
                <p className="text-slate-500">ค่าอ้างอิงโดยประมาณ $0.03-$0.05</p>
              </div>
            </div>
            {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          </section>
        </div>
      </main>
    </div>
  );
}

export default function AIOperationsMonitorPage() {
  return (
    <RoleGuard allowedRoles={["admin", "staff"]}>
      <AIOperationsMonitorContent />
    </RoleGuard>
  );
}
