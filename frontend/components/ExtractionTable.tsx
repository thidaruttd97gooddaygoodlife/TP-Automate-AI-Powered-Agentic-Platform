type ExtractionRow = {
  file_name: string;
  vin: string;
  model: string;
  warranty_id: string;
};

type ExtractionTableProps = {
  rows: ExtractionRow[];
};

export function ExtractionTable({ rows }: ExtractionTableProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
      <h3 className="text-lg font-semibold text-slate-800">ข้อมูลที่สกัดได้</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">เอกสาร</th>
              <th className="py-2 pr-4">VIN</th>
              <th className="py-2 pr-4">รุ่นรถ</th>
              <th className="py-2">รหัสรับประกัน</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500">
                  ยังไม่มีเอกสารในคลังความรู้ กรุณาอัปโหลดผ่านช่องด้านซ้าย
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={`${row.file_name}-${idx}`} className="border-b border-slate-100 last:border-b-0">
                  <td className="py-3 pr-4 text-slate-700">{row.file_name}</td>
                  <td className="py-3 pr-4 font-mono text-slate-900">{row.vin}</td>
                  <td className="py-3 pr-4 text-slate-700">{row.model}</td>
                  <td className="py-3 text-red-700">{row.warranty_id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
