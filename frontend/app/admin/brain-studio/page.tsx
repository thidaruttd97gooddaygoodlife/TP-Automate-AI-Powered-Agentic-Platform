"use client";

import { useEffect, useState } from "react";

import { AdminSidebar } from "@/components/AdminSidebar";
import { ExtractionTable } from "@/components/ExtractionTable";
import { RoleGuard } from "@/components/RoleGuard";
import { SmartDropZone } from "@/components/SmartDropZone";
import { getExtractionPreview, ingestDocuments } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function BrainStudioContent() {
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<Array<{ file_name: string; vin: string; model: string; warranty_id: string }>>([]);

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      try {
        const response = await getExtractionPreview(user.id, user.role ?? "admin");
        setRows(response.rows || []);
      } catch {
        setRows([]);
      }
    })();
  }, [user?.id, user?.role]);

  async function handleDocumentsUpload(files: File[]) {
    if (!user?.id) return;
    try {
      const response = await ingestDocuments(files, user.id, user.role ?? "admin");
      setStatus(`จัดทำดัชนีแล้ว ${response.files_indexed} ไฟล์ ไปยัง ${response.collection} พร้อมแบ่งเอกสาร ${response.chunks_created} ส่วน`);
    } catch {
      setStatus("นำเข้าเอกสารไม่สำเร็จ กรุณาใช้ไฟล์ PDF/TXT/MD และตรวจสอบการตั้งค่า embedding");
    }
  }

  return (
    <div className="dashboard-shell">
      <AdminSidebar />
      <main className="p-6 lg:p-8">
        <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-panel">
          <p className="text-sm tracking-[0.04em] text-red-700">ปฏิบัติการอัจฉริยะ</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">คลังความรู้ AI</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            อัปโหลดเอกสารเทคนิคและคู่มือรุ่นรถใหม่ ระบบจะจัดแบ่งข้อความ ฝังเวกเตอร์ และบันทึกเข้า ChromaDB อัตโนมัติ
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
            <SmartDropZone title="คู่มือซ่อมและเอกสารเทคนิค" accept=".pdf,.txt,.md" multiple onFiles={handleDocumentsUpload} />
            {status && <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">{status}</p>}
          </section>
          <ExtractionTable rows={rows} />
        </div>
      </main>
    </div>
  );
}

export default function BrainStudioPage() {
  return (
    <RoleGuard allowedRoles={["admin", "staff"]}>
      <BrainStudioContent />
    </RoleGuard>
  );
}
