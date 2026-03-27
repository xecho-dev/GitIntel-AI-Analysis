import React from "react";
import { ShieldAlert } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAppStore } from "@/store/useAppStore";

interface DependencyData {
  total?: number;
  scanned?: number;
  high?: number;
  medium?: number;
  low?: number;
  vulnerabilities?: Array<{ name: string; version: string; severity: string; cve?: string }>;
}

export const DependencyAgentCard = () => {
  const isAnalyzing = useAppStore((s) => s.isAnalyzing);
  const finishedAgents = useAppStore((s) => s.finishedAgents);
  const finalResult = useAppStore((s) => s.finalResult);

  // Dependency 结果从 finalResult 中获取（后端当前未接入，先展示空状态）
  const raw = (finalResult as Record<string, unknown>)?.dependency as DependencyData | undefined;
  const total = raw?.total ?? 0;
  const scanned = raw?.scanned ?? 0;
  const high = raw?.high ?? 0;
  const medium = raw?.medium ?? 0;
  const low = raw?.low ?? 0;
  const pct = total > 0 ? Math.round((scanned / total) * 100) : 0;
  const hasData = total > 0;

  const vulnList = raw?.vulnerabilities ?? [];
  const topVuln = vulnList[0];

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
        {hasData ? (
          <span className="text-xs font-mono text-slate-400">{scanned}/{total}</span>
        ) : (
          <span className="text-xs font-mono text-slate-600">—/—</span>
        )}
      </div>
      <div className="h-32 flex flex-col justify-center gap-4">
        <div className="h-3 w-full bg-[#31353c] rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-rose-400 rounded-full transition-all duration-500"
            style={{ width: `${hasData ? pct : 0}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#31353c] rounded p-2 border border-rose-400/20">
            <p className="text-[9px] text-slate-500 uppercase">High</p>
            <p className="text-lg font-bold text-rose-400">{high || "—"}</p>
          </div>
          <div className="bg-[#31353c] rounded p-2">
            <p className="text-[9px] text-slate-500 uppercase">Medium</p>
            <p className="text-lg font-bold">{medium || "—"}</p>
          </div>
          <div className="bg-[#31353c] rounded p-2">
            <p className="text-[9px] text-slate-500 uppercase">Low</p>
            <p className="text-lg font-bold">{low || "—"}</p>
          </div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-slate-400 italic">
        {isAnalyzing ? (
          <span className="text-blue-400 animate-pulse">正在扫描依赖包...</span>
        ) : topVuln ? (
          <span>
            发现: {topVuln.name}@{topVuln.version}
            {topVuln.cve && <span className="text-rose-400 ml-1">{topVuln.cve}</span>}
          </span>
        ) : hasData ? (
          <span className="text-emerald-400">未发现高危漏洞</span>
        ) : (
          <span>等待分析开始...</span>
        )}
      </div>
    </GlassCard>
  );
};
