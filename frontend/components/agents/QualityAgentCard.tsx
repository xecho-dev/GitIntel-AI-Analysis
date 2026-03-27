import React from "react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAppStore } from "@/store/useAppStore";

interface QualityData {
  health_score?: number;
  test_coverage?: number;
  complexity?: string;
  maintainability?: string;
  python_metrics?: { avg_cyclomatic?: number; avg_length?: number; doc_ratio?: number };
  typescript_metrics?: { avg_cyclomatic?: number; avg_length?: number; doc_ratio?: number };
}

const EMPTY_DATA = [
  { name: "M1", value: 0 },
  { name: "M2", value: 0 },
  { name: "M3", value: 0 },
  { name: "M4", value: 0 },
  { name: "M5", value: 0 },
  { name: "M6", value: 0 },
  { name: "M7", value: 0 },
  { name: "M8", value: 0 },
];

export const QualityAgentCard = () => {
  const qualityEvent = useAppStore((s) => s.agentEvents["quality"]);
  const isAnalyzing = useAppStore((s) => s.isAnalyzing);
  const finishedAgents = useAppStore((s) => s.finishedAgents);
  const qualityDone = finishedAgents.includes("quality");

  const raw = qualityEvent?.data as QualityData | undefined;
  const healthScore = raw?.health_score ?? 0;
  const testCoverage = raw?.test_coverage ?? 0;
  const complexity = raw?.complexity ?? "—";
  const pyMetrics = raw?.python_metrics;
  const tsMetrics = raw?.typescript_metrics;

  const barData = pyMetrics
    ? [
        { name: "CYCL", value: Math.round((pyMetrics.avg_cyclomatic ?? 0) * 10) },
        { name: "LEN", value: Math.round((pyMetrics.avg_length ?? 0) / 10) },
        { name: "DOC", value: Math.round((pyMetrics.doc_ratio ?? 0) * 100) },
      ]
    : tsMetrics
    ? [
        { name: "CYCL", value: Math.round((tsMetrics.avg_cyclomatic ?? 0) * 10) },
        { name: "LEN", value: Math.round((tsMetrics.avg_length ?? 0) / 10) },
        { name: "DOC", value: Math.round((tsMetrics.doc_ratio ?? 0) * 100) },
      ]
    : EMPTY_DATA;

  const peakIndex = barData.reduce(
    (maxIdx, v, i, arr) => (v.value > arr[maxIdx].value ? i : maxIdx),
    0
  );

  return (
    <GlassCard className="p-5">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <BarChart3 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold">代码质量 Agent</h3>
            <p className="text-[10px] text-emerald-400/60 tracking-widest uppercase">
              Quality Pulse
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-emerald-400">
            {healthScore || "—"}
          </span>
          <span className="text-[10px] text-slate-500 ml-1">HEALTH</span>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "#1c2026",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 6,
                fontSize: 11,
              }}
              cursor={{ fill: "rgba(0,226,151,0.05)" }}
            />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {barData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === peakIndex ? "#00e297" : "#00e29733"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex justify-between text-[10px] text-slate-500">
        <span>
          复杂度分析:{" "}
          <span className={complexity === "Low" ? "text-emerald-400" : complexity === "High" ? "text-rose-400" : "text-yellow-400"}>
            {complexity}
          </span>
        </span>
        <span>
          单元测试覆盖率:{" "}
          <span className="text-emerald-400">{testCoverage > 0 ? `${testCoverage}%` : "—"}</span>
        </span>
      </div>
    </GlassCard>
  );
};
