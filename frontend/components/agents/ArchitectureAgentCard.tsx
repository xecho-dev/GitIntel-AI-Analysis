import React from "react";
import { Code2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAppStore } from "@/store/useAppStore";

export const ArchitectureAgentCard = () => {
  const repoLoaderEvent = useAppStore((s) => s.agentEvents["repo_loader"]);
  const techStackEvent = useAppStore((s) => s.agentEvents["tech_stack"]);
  const isAnalyzing = useAppStore((s) => s.isAnalyzing);
  const finishedAgents = useAppStore((s) => s.finishedAgents);

  const repoLoaderDone = finishedAgents.includes("repo_loader");
  const techStackDone = finishedAgents.includes("tech_stack");

  const data = techStackEvent?.data as {
    languages?: string[];
    frameworks?: string[];
  } | undefined;

  const lines: { text: string; color: string }[] = [];

  if (isAnalyzing || repoLoaderEvent || repoLoaderDone) {
    if (repoLoaderEvent?.message) {
      lines.push({ text: repoLoaderEvent.message, color: "text-blue-400" });
    } else if (repoLoaderDone) {
      lines.push({ text: "仓库加载完成", color: "text-emerald-400" });
    }
  }

  if (techStackEvent?.message) {
    lines.push({ text: techStackEvent.message, color: "text-blue-400" });
  } else if (techStackDone && data) {
    const langs = data.languages ?? [];
    const fws = data.frameworks ?? [];
    if (langs.length) {
      lines.push({
        text: `检测到: ${[...langs, ...fws].slice(0, 5).join(" + ")}`,
        color: "text-slate-400",
      });
    }
    lines.push({ text: "架构分析完成", color: "text-emerald-400" });
  }

  if (!isAnalyzing && lines.length === 0) {
    lines.push({ text: "等待分析开始...", color: "text-slate-600" });
  }

  return (
    <GlassCard className="p-5 relative border-l-2 border-blue-400" glow>
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent animate-pulse" />
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Code2 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold">架构分析 Agent</h3>
            <p className="text-[10px] text-blue-400/60 tracking-widest uppercase">
              System Mapping
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isAnalyzing
              ? "bg-blue-500/20 text-blue-400 animate-pulse"
              : "bg-emerald-500/20 text-emerald-400"
          }`}
        >
          {isAnalyzing ? "LIVE" : repoLoaderDone ? "DONE" : "IDLE"}
        </span>
      </div>
      <div className="bg-[#0a0e14] rounded p-4 font-mono text-[11px] h-48 overflow-y-auto border border-white/5 space-y-1">
        {lines.map((line, i) => (
          <p key={i} className={line.color}>
            {line.text}
          </p>
        ))}
        {isAnalyzing && (
          <p className="text-blue-400 animate-pulse">_ 正在分析中...</p>
        )}
      </div>
    </GlassCard>
  );
};
