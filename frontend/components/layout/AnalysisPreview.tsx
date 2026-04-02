import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAppStore } from "@/store/useAppStore";

interface CodeParserData {
  total_files?: number;
  total_functions?: number;
  total_classes?: number;
  parsed_files?: number;
  total_chunks?: number;
}

interface QualityData {
  health_score?: number;
  test_coverage?: number;
  complexity?: string;
  maintainability?: string;
}

interface ArchitectureData {
  complexity?: string;
  architectureStyle?: string;
  components?: number;
  maintainability?: string;
}

export const AnalysisPreview = () => {
  const eventsVersion = useAppStore((s) => s.eventsVersion);
  const isAnalyzing = useAppStore((s) => s.isAnalyzing);
  const finishedAgents = useAppStore((s) => s.finishedAgents);

  const archEvent = useAppStore((s) => s.agentEvents["architecture"]);
  const qualityEvent = useAppStore((s) => s.agentEvents["quality"]);
  const codeParserEvent = useAppStore((s) => s.agentEvents["code_parser_final"]);

  const archData = archEvent?.data as ArchitectureData | undefined;
  const qualityData = qualityEvent?.data as QualityData | undefined;
  const codeData = codeParserEvent?.data as CodeParserData | undefined;

  // 实时从 agentEvents 拿数据，不等 finalResult
  const complexity = archData?.complexity ?? qualityData?.complexity ?? "—";
  const healthScore = qualityData?.health_score ?? 0;
  const totalFiles = codeData?.total_files ?? codeData?.parsed_files ?? 0;
  const totalFunctions = codeData?.total_functions ?? 0;

  const healthLabel =
    healthScore >= 80 ? "A-" :
    healthScore >= 60 ? "B+" :
    healthScore >= 40 ? "B" : "C";

  const insightText = (() => {
    if (isAnalyzing) return "正在分析中，请稍候...";
    if (finishedAgents.length === 0) return "输入仓库地址开始分析";
    if (complexity === "High") return "项目复杂度较高，建议优先处理架构耦合问题";
    if (complexity === "Medium") return "项目结构合理，可针对性进行模块优化";
    if (complexity === "Low") return "项目维护性良好，建议关注依赖风险";
    return "分析完成，请查看各模块详细结果";
  })();

  const archStyle = archData?.architectureStyle;

  return (
    <GlassCard className="p-6">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
        分析结果预览
      </h3>

      {/* 实时进度指示 */}
      {isAnalyzing && finishedAgents.length > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>分析进度</span>
            <span>{finishedAgents.length} 个模块</span>
          </div>
          <div className="h-1 bg-[#1c2330] rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((finishedAgents.length / 6) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
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
            {healthScore > 0 ? healthLabel : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">代码体积</span>
          <span className="text-xs font-mono">
            {totalFiles > 0 ? `~${totalFiles} 文件` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">函数规模</span>
          <span className="text-xs font-mono">
            {totalFunctions > 0 ? `~${totalFunctions} 函数` : "—"}
          </span>
        </div>
        {archStyle && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">架构风格</span>
            <span className="text-xs font-mono text-blue-400">{archStyle}</span>
          </div>
        )}
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

      {/* 完成模块列表 */}
      {finishedAgents.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] text-slate-600 uppercase mb-2">已完成</p>
          <div className="flex flex-wrap gap-1">
            {finishedAgents.map((agent) => (
              <span
                key={agent}
                className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-400"
              >
                {agent}
              </span>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
};
