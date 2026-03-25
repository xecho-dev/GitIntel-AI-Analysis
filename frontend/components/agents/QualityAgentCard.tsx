import React from "react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

const QUALITY_PULSE_DATA = [
  { name: "M1", value: 60 },
  { name: "M2", value: 40 },
  { name: "M3", value: 75 },
  { name: "M4", value: 90 },
  { name: "M5", value: 55 },
  { name: "M6", value: 30 },
  { name: "M7", value: 80 },
  { name: "M8", value: 65 },
];

export const QualityAgentCard = () => {
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
          <span className="text-2xl font-black text-emerald-400">84</span>
          <span className="text-[10px] text-slate-500 ml-1">HEALTH</span>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={QUALITY_PULSE_DATA}>
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {QUALITY_PULSE_DATA.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === 3 ? "#00e297" : "#00e29733"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex justify-between text-[10px] text-slate-500">
        <span>复杂度分析: 正常</span>
        <span>单元测试覆盖率: 62%</span>
      </div>
    </GlassCard>
  );
};
