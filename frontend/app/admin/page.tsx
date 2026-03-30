"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminSidebar } from "@/components/AdminSidebar";
import { ClaimAuditTable } from "@/components/ClaimAuditTable";
import { RoleGuard } from "@/components/RoleGuard";
import { getClaimInbox, submitClaimCorrection, type ClaimInboxRecord } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function AdminDashboardContent() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ClaimInboxRecord[]>([]);
  const [error, setError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const dashboardStats = useMemo(() => {
    const total = rows.length;
    const high = rows.filter((row) => row.severity === "high").length;
    const medium = rows.filter((row) => row.severity === "medium").length;
    const low = rows.filter((row) => row.severity === "low").length;
    const pending = rows.filter((row) => row.status === "new" || row.status === "reviewing").length;
    const approved = rows.filter((row) => row.status === "approved").length;

    const toPercent = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

    return {
      total,
      pending,
      approved,
      high,
      medium,
      low,
      highPct: toPercent(high),
      mediumPct: toPercent(medium),
      lowPct: toPercent(low),
    };
  }, [rows]);

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      try {
        const claimData = await getClaimInbox(user.id, user.role ?? "admin");
        setRows(claimData.rows || []);
      } catch {
        setError("ไม่สามารถโหลดคิวตรวจสอบเคลมได้ กรุณาตรวจสอบ backend และลองส่งเคลมจากฝั่งลูกค้าก่อน");
      }
    })();
  }, [user?.id, user?.role]);

  async function handleCorrection(claimId: string) {
    if (!user?.id) return;
    const correctedDamage = window.prompt("กรอกผลวินิจฉัยความเสียหายที่แก้ไขแล้ว");
    if (!correctedDamage) return;
    const notes = window.prompt("บันทึกเพิ่มเติม (ถ้ามี)") || "";
    try {
      const response = await submitClaimCorrection(claimId, correctedDamage, notes, user.id, user.role ?? "admin");
      setFeedbackMessage(`บันทึกผลแก้ไขเรียบร้อย: ${response.feedback_file}`);
    } catch {
      setFeedbackMessage("ส่งผลแก้ไขไม่สำเร็จ");
    }
  }

  return (
    <div className="dashboard-shell">
      <AdminSidebar />
      <main className="p-6 lg:p-8">
        <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-panel">
          <p className="text-sm tracking-[0.04em] text-red-700">ศูนย์ควบคุมผู้ดูแลระบบ</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">แดชบอร์ดตรวจสอบเคลม</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            ตรวจสอบรายการเคลมจาก AI ทั้งตำแหน่งความเสียหาย VIN สถานะประกัน และระดับความรุนแรงก่อนอนุมัติงานซ่อม
          </p>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel">
            <p className="text-sm text-slate-500">เคลมทั้งหมด</p>
            <p className="mt-2 font-display text-4xl font-extrabold text-slate-950">{dashboardStats.total}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel">
            <p className="text-sm text-slate-500">รอดำเนินการ</p>
            <p className="mt-2 font-display text-4xl font-extrabold text-slate-950">{dashboardStats.pending}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel">
            <p className="text-sm text-slate-500">อนุมัติแล้ว</p>
            <p className="mt-2 font-display text-4xl font-extrabold text-slate-950">{dashboardStats.approved}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-panel">
            <p className="text-sm text-slate-500">ระดับรุนแรงสูง</p>
            <p className="mt-2 font-display text-4xl font-extrabold text-slate-950">{dashboardStats.high}</p>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
          <ClaimAuditTable rows={rows} onCorrect={handleCorrection} />

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
            <h3 className="font-display text-lg font-semibold text-slate-800">กราฟสรุปความรุนแรง</h3>
            <p className="mt-1 text-sm text-slate-600">ภาพรวมสัดส่วนเคลมแต่ละระดับ เพื่อจัดลำดับการตรวจสอบ</p>

            <div className="mt-6 space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                  <span>รุนแรงสูง</span>
                  <span>{dashboardStats.highPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className="h-2.5 rounded-full bg-red-700" style={{ width: `${dashboardStats.highPct}%` }} />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                  <span>รุนแรงกลาง</span>
                  <span>{dashboardStats.mediumPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className="h-2.5 rounded-full bg-red-500" style={{ width: `${dashboardStats.mediumPct}%` }} />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                  <span>รุนแรงต่ำ</span>
                  <span>{dashboardStats.lowPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className="h-2.5 rounded-full bg-red-300" style={{ width: `${dashboardStats.lowPct}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">ข้อเสนอแนะการจัดคิว</p>
              <p className="mt-1 text-sm text-slate-700">ให้จัดการเคสความรุนแรงสูงก่อน แล้วตามด้วยเคสที่มีสถานะรอตรวจสอบ</p>
            </div>
          </aside>
        </section>

        {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {feedbackMessage && <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{feedbackMessage}</p>}
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={["admin", "staff"]}>
      <AdminDashboardContent />
    </RoleGuard>
  );
}
