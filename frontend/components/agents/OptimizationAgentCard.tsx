import React from "react";
import { Zap, Rocket } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

const SUGGESTIONS = [
  {
    title: "性能提升建议 #1",
    description: '将 `Context.Provider` 拆分为更细粒度的组件以减少重绘。',
    done: true,
  },
  {
    title: "重构建议 #2",
    description: '检测到 3 处冗余的 `useEffect` 逻辑，建议合并为自定义 Hook...',
    done: false,
  },
];

export const OptimizationAgentCard = () => {
  return (
    <GlassCard className="p-5">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Zap size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold">优化建议 Agent</h3>
            <p className="text-[10px] text-purple-400/60 tracking-widest uppercase">
              PR Auto-Summary
            </p>
          </div>
        </div>
        <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded">
          AI GENERATING
        </span>
      </div>
      <div className="space-y-3">
        {SUGGESTIONS.map((item, i) => (
          <div
            key={i}
            className="p-3 bg-[#31353c] rounded border-l-2 border-purple-400 flex flex-col justify-between"
            style={{ opacity: item.done ? 1 : 0.6 }}
          >
            <div>
              <h4 className="text-xs font-bold mb-1">{item.title}</h4>
              <p className="text-[11px] text-slate-400">{item.description}</p>
            </div>
            <div className="mt-3 flex justify-end">
              <button className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-2 text-[10px] font-bold text-blue-400 hover:bg-blue-500/20 transition-all">
                <Rocket size={12} />
                <span>一键提交 PR</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};
