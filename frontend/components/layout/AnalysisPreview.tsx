import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";

export const AnalysisPreview = () => {
  return (
    <GlassCard className="p-6">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
        分析结果预览
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">架构复杂度</span>
          <span className="text-xs font-mono px-1.5 py-0.5 bg-[#31353c] rounded">
            Medium
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">维护性评分</span>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            A-
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">代码体积</span>
          <span className="text-xs font-mono">1.2 MB</span>
        </div>
      </div>
      <div className="mt-6 p-4 rounded-lg bg-[#0a0e14] border border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-[10px] text-slate-500 uppercase">
            实时洞察
          </span>
        </div>
        <p className="text-xs leading-relaxed text-[#dfe2eb]">
          当前项目存在较大的组件重叠风险，建议在第 4 阶段进行模块解耦。
        </p>
      </div>
    </GlassCard>
  );
};
