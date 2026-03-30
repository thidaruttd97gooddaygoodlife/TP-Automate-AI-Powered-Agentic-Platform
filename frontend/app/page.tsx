"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarCheck2, CheckCircle2, CircleHelp, ClipboardList, ScanSearch } from "lucide-react";

import { FloatingChatbot } from "@/components/FloatingChatbot";
import { RoleGuard } from "@/components/RoleGuard";
import { SmartDropZone } from "@/components/SmartDropZone";
import { UserSidebar } from "@/components/UserSidebar";
import { getMyClaims, submitSmartClaim, type MyClaim, type SmartClaim } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const policyStatusText: Record<"active" | "review" | "expired", string> = {
  active: "ใช้งานได้",
  review: "รอตรวจสอบ",
  expired: "หมดอายุ",
};

const policyStatusColor: Record<"active" | "review" | "expired", string> = {
  active: "bg-green-50 text-green-700",
  review: "bg-amber-50 text-amber-700",
  expired: "bg-red-50 text-red-700",
};

const severityConfig: Record<"low" | "medium" | "high", { label: string; code: string; bg: string; text: string }> = {
  low:    { label: "เล็กน้อย",  code: "L1", bg: "bg-emerald-50", text: "text-emerald-700" },
  medium: { label: "ปานกลาง", code: "M2", bg: "bg-amber-50",   text: "text-amber-700"   },
  high:   { label: "รุนแรง",   code: "H3", bg: "bg-red-50",     text: "text-red-700"     },
};

function parseMarking(marking: string): string {
  const parts = marking.split(":");
  if (parts.length >= 2 && parts[0] === "bbox") return parts[1].replace(/-/g, " ");
  return marking;
}

const otherModules = [
  {
    title: "RAG Knowledge Assistant",
    description: "ถาม-ตอบจากคลังความรู้ที่ควบคุมได้ พร้อมอ้างอิงเอกสาร",
    href: "/support",
    icon: CircleHelp,
  },
  {
    title: "AI Agent & จองคิวซ่อม",
    description: "วางแผนงาน จองคิวซ่อม และติดตามสถานะผ่าน Agent Workflow",
    href: "/booking",
    icon: CalendarCheck2,
  },
];

function UserPortalContent() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [damagePhoto, setDamagePhoto] = useState<File | null>(null);
  const [claim, setClaim] = useState<SmartClaim | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myClaims, setMyClaims] = useState<MyClaim[]>([]);

  useEffect(() => {
    if (user?.role === "user") {
      getMyClaims()
        .then((data) => setMyClaims(data.claims))
        .catch(() => {/* silently skip if unauthenticated */});
    }
  }, [user, claim]); // refetch after new claim submitted

  const canSubmit = fullName.trim().length > 0 && policyNumber.trim().length > 0 && damagePhoto !== null;

  async function handleDamageUpload(files: File[]) {
    setDamagePhoto(files[0] ?? null);
    setSubmitError("");
  }

  async function handleSubmitClaim() {
    if (!user?.id) return;
    if (!fullName.trim() || !policyNumber.trim()) {
      setSubmitError("กรุณากรอกชื่อ-นามสกุลและเลขกรมธรรม์ให้ครบถ้วน");
      return;
    }
    if (!damagePhoto) {
      setSubmitError("กรุณาอัปโหลดรูปรถที่เสียหาย");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await submitSmartClaim(fullName.trim(), policyNumber.trim(), damagePhoto, user.id, user.role ?? "user");
      setClaim(response.claim);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401") || msg.includes("403")) {
        setSubmitError("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
      } else if (msg.includes("422")) {
        setSubmitError("วิเคราะห์ภาพไม่สำเร็จ กรุณาตรวจสอบว่าไฟล์เป็นรูปภาพ JPG/PNG");
      } else {
        setSubmitError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง หรือตรวจสอบการเชื่อมต่อ backend");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const sev = claim ? severityConfig[claim.severity] : null;
  const step1Done = fullName.trim().length > 0 && policyNumber.trim().length > 0;
  const step2Done = damagePhoto !== null;
  const step3Done = claim !== null;

  return (
    <div className="dashboard-shell">
      <UserSidebar />

      <main className="relative p-6 lg:p-8">

        {/* Compact header — no redundant CTA buttons */}
        <header className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-panel">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(204,0,0,0.08),_transparent_28%),linear-gradient(135deg,_#ffffff_0%,_#f8f9fa_100%)] px-6 py-7 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-red-700">TP-Automate · AI Platform</p>
            <h1 className="mt-1.5 font-display text-2xl font-bold text-slate-900 lg:text-3xl">ระบบเคลมอัจฉริยะ & ผู้ช่วย AI</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              วิเคราะห์ความเสียหายรถยนต์จากรูปภาพ ประเมินระดับ L1/M2/H3 ตามมาตรฐาน TP-AS-001/2569 พร้อม RAG Chatbot และระบบจองคิวแบบ Agent
            </p>
          </div>
        </header>

        {/* ── Smart Claim Panel – Hero Feature ── */}
        <section id="smart-claim-panel" className="rounded-3xl border border-slate-200 bg-white shadow-panel">

          {/* Panel title */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-700">
              <ScanSearch size={18} />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">วิเคราะห์ความเสียหายด้วย Vision AI</h2>
              <p className="text-xs text-slate-500">AI ประเมินระดับ L1/M2/H3 ตามมาตรฐาน TP-AS-001/2569 อัตโนมัติ</p>
            </div>
            {step3Done && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                <CheckCircle2 size={12} /> ส่งเคลมสำเร็จ
              </span>
            )}
          </div>

          <div className="grid lg:grid-cols-2">

            {/* Left: input form */}
            <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">

              {/* Step indicators */}
              <div className="mb-6 flex items-center gap-2 text-xs">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${step1Done ? "bg-green-100 text-green-700" : "bg-red-700 text-white"}`}>1</span>
                <span className="font-medium text-slate-600">ข้อมูลผู้เอาประกัน</span>
                <span className="text-slate-300">→</span>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${step2Done ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>2</span>
                <span className="font-medium text-slate-600">รูปความเสียหาย</span>
                <span className="text-slate-300">→</span>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${step3Done ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>3</span>
                <span className="font-medium text-slate-600">ผลวิเคราะห์</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    ชื่อ-นามสกุล ผู้แจ้งเคลม <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="เช่น นายสมชาย ใจดี"
                    suppressHydrationWarning
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-red-300 transition focus:border-red-400 focus:ring"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    เลขกรมธรรม์ / เลขสมาชิก <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    placeholder="เช่น TP-2026-00123"
                    suppressHydrationWarning
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-red-300 transition focus:border-red-400 focus:ring"
                  />
                </div>
                <SmartDropZone
                  title={damagePhoto ? `✓  ${damagePhoto.name}` : "อัปโหลดรูปรถที่เสียหาย (JPG / PNG)"}
                  accept="image/*"
                  onFiles={handleDamageUpload}
                />
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => void handleSubmitClaim()}
                  disabled={submitting || !canSubmit}
                  className="w-full rounded-xl bg-red-700 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      กำลังวิเคราะห์ด้วย AI...
                    </span>
                  ) : (
                    "วิเคราะห์ความเสียหาย"
                  )}
                </button>
                {!canSubmit && !submitting && (
                  <p className="mt-2 text-center text-xs text-slate-400">
                    {!step1Done && !step2Done ? "กรอกข้อมูลและอัปโหลดรูปก่อนส่ง" : !step1Done ? "กรอกชื่อและเลขกรมธรรม์ก่อน" : "อัปโหลดรูปก่อนส่ง"}
                  </p>
                )}
              </div>

              {submitError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}
            </div>

            {/* Right: result */}
            <div className="p-6">
              {claim && sev ? (
                <div>
                  {/* Severity hero badge */}
                  <div className={`mb-5 flex items-center gap-4 rounded-2xl p-4 ${sev.bg}`}>
                    <div className={`text-center ${sev.text}`}>
                      <p className="text-3xl font-black leading-none">{sev.code}</p>
                      <p className="mt-0.5 text-xs font-bold">{sev.label}</p>
                    </div>
                    <div className={sev.text}>
                      <p className="font-bold">ระดับความเสียหาย</p>
                      <p className="text-xs opacity-75">มาตรฐาน TP-AS-001/2569</p>
                    </div>
                    <CheckCircle2 className="ml-auto shrink-0 opacity-60" size={22} />
                  </div>

                  <div className="space-y-3 text-sm">
                    {/* KPI grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">รหัสเคลม</p>
                        <p className="mt-0.5 font-mono text-xs font-semibold text-slate-900">{claim.claim_id}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">สถานะประกัน</p>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${policyStatusColor[claim.policy_status]}`}>
                          {policyStatusText[claim.policy_status]}
                        </span>
                      </div>
                      {claim.estimated_days > 0 && (
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">เวลาซ่อมประมาณ</p>
                          <p className="mt-0.5 font-semibold text-slate-900">{claim.estimated_days} วัน</p>
                        </div>
                      )}
                      {claim.estimated_cost > 0 && (
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">ค่าซ่อมประมาณ</p>
                          <p className="mt-0.5 font-semibold text-slate-900">
                            {claim.estimated_cost.toLocaleString("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Summary */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-1 text-xs font-semibold text-slate-500">สรุปความเสียหาย</p>
                      <p className="leading-relaxed text-slate-700">{claim.summary}</p>
                    </div>

                    {/* Parts chips */}
                    <div>
                      <p className="mb-2 text-xs font-semibold text-slate-500">ชิ้นส่วนที่ต้องซ่อม / เปลี่ยน</p>
                      <div className="flex flex-wrap gap-1.5">
                        {claim.estimated_parts.map((part) => (
                          <span key={part} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* AI markings — parsed, human-readable */}
                    {claim.ai_markings.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold text-slate-500">ตำแหน่งที่ AI ตรวจพบ</p>
                        <div className="flex flex-wrap gap-1.5">
                          {claim.ai_markings.map((m) => (
                            <span key={m} className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                              {parseMarking(m)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate-400">ส่งเข้าคิวตรวจสอบแล้ว</p>
                  </div>
                </div>
              ) : (
                /* Empty state with photo tips */
                <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <ScanSearch size={26} className="text-slate-400" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-700">ผลวิเคราะห์จะแสดงที่นี่</p>
                  <p className="mt-1 max-w-[200px] text-xs text-slate-400">กรอกข้อมูล อัปโหลดรูป แล้วกดวิเคราะห์</p>
                  <div className="mt-6 w-full max-w-xs space-y-2 text-left">
                    <p className="text-xs font-semibold text-slate-500">รูปที่ได้ผลดีที่สุด:</p>
                    {[
                      "ถ่ายตรง เห็นตำแหน่งความเสียหายชัด",
                      "แสงสว่างเพียงพอ ไม่สะท้อน",
                      "ไฟล์ JPG หรือ PNG ขนาดไม่เกิน 10 MB",
                    ].map((tip) => (
                      <div key={tip} className="flex items-start gap-2 text-xs text-slate-500">
                        <span className="mt-0.5 text-green-500">✓</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* My Claim History */}
        {myClaims.length > 0 && (
          <section className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList size={16} className="text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-600">ประวัติเคลมของฉัน</h2>
            </div>
            <div className="space-y-2">
              {myClaims.map((c) => {
                const sev = severityConfig[c.severity];
                return (
                  <div key={c.claim_id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${sev.bg} ${sev.text}`}>
                      {sev.code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.claim_id}</p>
                      <p className="text-xs text-slate-500 truncate">VIN: {c.vin} · {policyStatusText[c.policy_status]}</p>
                    </div>
                    <p className="text-xs text-slate-400 shrink-0">
                      {new Date(c.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Other AI modules — compact 2-card nav */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {otherModules.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-red-50 group-hover:text-red-700">
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800">{card.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{card.description}</p>
                </div>
                <ArrowRight size={16} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-red-700" />
              </Link>
            );
          })}
        </section>

        <FloatingChatbot />
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <RoleGuard allowedRoles={["user"]}>
      <UserPortalContent />
    </RoleGuard>
  );
}
