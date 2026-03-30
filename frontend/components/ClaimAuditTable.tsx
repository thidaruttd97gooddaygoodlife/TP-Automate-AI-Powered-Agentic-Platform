import { type ClaimInboxRecord } from "@/lib/api";

type ClaimAuditTableProps = {
  rows: ClaimInboxRecord[];
  onCorrect: (claimId: string) => void;
};

export function ClaimAuditTable({ rows, onCorrect }: ClaimAuditTableProps) {
  const policyStatusText: Record<string, string> = {
    active: "ใช้งานได้",
    review: "รอตรวจสอบ",
    expired: "หมดอายุ",
  };

  const severityText: Record<string, string> = {
    low: "ต่ำ",
    medium: "กลาง",
    high: "สูง",
  };

  const claimStatusText: Record<string, string> = {
    new: "ใหม่",
    reviewing: "กำลังตรวจสอบ",
    approved: "อนุมัติแล้ว",
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-800">รายการเคลมที่เข้ามา</h3>
          <p className="mt-1 text-sm font-normal text-slate-600">ผลวิเคราะห์จาก Vision AI ถูกส่งเข้าแถวตรวจสอบนี้โดยตรง</p>
        </div>
        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">{rows.length} รายการ</span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">เคลม</th>
              <th className="py-2 pr-4">VIN / ประกัน</th>
              <th className="py-2 pr-4">ความรุนแรง</th>
              <th className="py-2 pr-4">ตำแหน่งที่ AI ตรวจพบ</th>
              <th className="py-2">สถานะ</th>
              <th className="py-2">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  ยังไม่มีข้อมูลเคลม กรุณาส่งเคลมจากหน้าลูกค้าก่อน
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.claim_id} className="border-b border-slate-100 align-top last:border-b-0">
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-slate-900">{row.claim_id}</p>
                    <p className="text-slate-500">{row.customer_name}</p>
                    <p className="text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p className="font-mono text-slate-900">{row.vin}</p>
                    <p className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                      {policyStatusText[row.policy_status] ?? row.policy_status}
                    </p>
                  </td>
                  <td className="py-4 pr-4">
                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold uppercase text-red-700">
                      {severityText[row.severity] ?? row.severity}
                    </span>
                    <p className="mt-2 text-slate-600">{row.estimated_parts.join(", ")}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="space-y-1">
                      {row.ai_markings.map((marking) => (
                        <div key={marking} className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700">
                          {marking}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {claimStatusText[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="py-4">
                    <button
                      type="button"
                      onClick={() => onCorrect(row.claim_id)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-900"
                    >
                      แก้ไขผล
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
