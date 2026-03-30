type TokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  model_breakdown?: Array<{
    model: string;
    requests: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }>;
};

type TokenUsageChartProps = {
  usage: TokenUsage | null;
};

export function TokenUsageChart({ usage }: TokenUsageChartProps) {
  const prompt = usage?.prompt_tokens ?? 0;
  const completion = usage?.completion_tokens ?? 0;
  const total = usage?.total_tokens ?? 0;
  const promptPct = total > 0 ? Math.round((prompt / total) * 100) : 0;
  const completionPct = total > 0 ? Math.round((completion / total) * 100) : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
      <h3 className="font-display text-lg font-semibold text-slate-800">ภาพรวมการใช้งานโทเคน</h3>
      <p className="mt-1 text-sm text-slate-600">สัดส่วนการใช้โทเคนระหว่าง prompt และ completion</p>

      <div className="mt-6 space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-600">โทเคนฝั่ง Prompt</span>
            <span className="font-semibold text-slate-900">{prompt.toLocaleString()}</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100">
            <div className="h-3 rounded-full bg-red-600" style={{ width: `${promptPct}%` }} />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-600">โทเคนฝั่ง Completion</span>
            <span className="font-semibold text-slate-900">{completion.toLocaleString()}</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100">
            <div className="h-3 rounded-full bg-slate-900" style={{ width: `${completionPct}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm">
          <p className="text-slate-700">โทเคนรวม: <span className="font-semibold text-slate-900">{total.toLocaleString()}</span></p>
          <p className="text-slate-700">ต้นทุนโดยประมาณ: <span className="font-semibold text-red-700">${usage?.estimated_cost_usd?.toFixed(4) ?? "0.0000"}</span></p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-500">สัดส่วนโมเดล</p>
          <div className="space-y-2">
            {(usage?.model_breakdown ?? []).length === 0 ? (
              <p className="text-slate-500">ยังไม่มีการใช้งานโมเดล</p>
            ) : (
              usage?.model_breakdown?.map((item) => (
                <div key={item.model} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{item.model}</span>
                    <span className="text-slate-500">{item.requests} ครั้ง</span>
                  </div>
                  <p className="mt-1 text-slate-600">{item.total_tokens.toLocaleString()} โทเคนรวม</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
