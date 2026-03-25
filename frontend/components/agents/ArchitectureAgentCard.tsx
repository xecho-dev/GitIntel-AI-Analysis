import React from "react";
import { Code2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export const ArchitectureAgentCard = () => {
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
        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold animate-pulse">
          LIVE
        </span>
      </div>
      <div className="bg-[#0a0e14] rounded p-4 font-mono text-[11px] h-48 overflow-y-auto border border-white/5 space-y-1">
        <p className="text-blue-400">[14:20:01] 正在扫描项目目录...</p>
        <p className="text-slate-400">
          [14:20:03] 检测到 React + Vite 技术栈...
        </p>
        <p className="text-slate-400">
          [14:20:05] 正在解析 42 个核心组件...
        </p>
        <p className="text-emerald-400">
          [14:20:07] 正在绘制组件依赖树...
        </p>
        <p className="text-blue-400 animate-pulse">
          _ 正在识别全局状态流 (Zustand)
        </p>
      </div>
    </GlassCard>
  );
};
