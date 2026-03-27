import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAppStore } from "@/store/useAppStore";

export const AnalysisPreview = () => {
  const finalResult = useAppStore((s) => s.finalResult);
  const isAnalyzing = useAppStore((s) => s.isAnalyzing);
  const finishedAgents = useAppStore((s) => s.finishedAgents);

  const result = (finalResult ?? {}) as Record<string, Record<string, unknown>>;

  const quality = result.quality as {
    health_score?: number;
    test_coverage?: number;
    complexity?: string;
    maintainability?: string;
  } | undefined;

  const codeParser = result.code_parser as {
    total_files?: number;
    total_functions?: number;
    total_classes?: number;
  } | undefined;

  const healthScore = quality?.health_score ?? 0;
  const complexity = quality?.complexity ?? "—";
  const totalFiles = codeParser?.total_files ?? 0;

  const healthLabel = healthScore >= 80 ? "A-" : healthScore >= 60 ? "B+" : healthScore >= 40 ? "B" : "C";

  const insightText = (() => {
    if (isAnalyzing) return "正在分析中，请稍候...";
    if (finishedAgents.length === 0) return "输入仓库地址开始分析";
    if (complexity === "High") return "项目复杂度较高，建议优先处理架构耦合问题";
    if (complexity === "Medium") return "项目结构合理，可针对性进行模块优化";
    if (complexity === "Low") return "项目维护性良好，建议关注依赖风险";
    return "分析完成，请查看各模块详细结果";
  })();

  return (
    <GlassCard className="p-6">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
        分析结果预览
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">架构复杂度</span>
          <span className="text-xs font-mono px-1.5 py-0.5 bg-[#31353c] rounded">
            {complexity}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">维护性评分</span>
          <span className={`text-xs font-mono font-bold ${
            healthScore >= 70 ? "text-emerald-400" : healthScore >= 40 ? "text-yellow-400" : "text-rose-400"
          }`}>
            {healthLabel}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">代码体积</span>
          <span className="text-xs font-mono">
            {totalFiles > 0 ? `~${totalFiles} 文件` : "—"}
          </span>
        </div>
      </div>
      <div className="mt-6 p-4 rounded-lg bg-[#0a0e14] border border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isAnalyzing ? "bg-blue-400 animate-pulse" : "bg-emerald-400"
            }`}
          />
          <span className="text-[10px] text-slate-500 uppercase">
            实时洞察
          </span>
        </div>
        <p className="text-xs leading-relaxed text-[#dfe2eb]">
          {insightText}
        </p>
      </div>
    </GlassCard>
  );
};
