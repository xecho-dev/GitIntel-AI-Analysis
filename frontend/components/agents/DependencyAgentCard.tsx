import React from "react";
import { ShieldAlert } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export const DependencyAgentCard = () => {
  return (
    <GlassCard className="p-5">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-rose-500/10 flex items-center justify-center text-rose-400">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold">依赖风险 Agent</h3>
            <p className="text-[10px] text-rose-400/60 tracking-widest uppercase">
              Vulnerability Scan
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-500">142/200</span>
      </div>
      <div className="h-32 flex flex-col justify-center gap-4">
        <div className="h-3 w-full bg-[#31353c] rounded-full overflow-hidden p-0.5">
          <div className="h-full bg-rose-400 rounded-full" style={{ width: "71%" }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#31353c] rounded p-2 border border-rose-400/20">
            <p className="text-[9px] text-slate-500 uppercase">High</p>
            <p className="text-lg font-bold text-rose-400">2</p>
          </div>
          <div className="bg-[#31353c] rounded p-2">
            <p className="text-[9px] text-slate-500 uppercase">Medium</p>
            <p className="text-lg font-bold">12</p>
          </div>
          <div className="bg-[#31353c] rounded p-2">
            <p className="text-[9px] text-slate-500 uppercase">Low</p>
            <p className="text-lg font-bold">45</p>
          </div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-slate-400 italic">
        正在扫描: lodash@4.17.21 (发现 CVE-2020-8203)
      </div>
    </GlassCard>
  );
};
