"use client";

import React from "react";
import { motion } from "motion/react";
import {
  Search,
  Filter,
  RefreshCw,
  History,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  Code2,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const HISTORY_DATA = [
  {
    id: 1,
    repo: "kubernetes/kubernetes",
    branch: "main",
    date: "2023年10月24日",
    time: "2 小时前完成",
    health: "优 (94%)",
    quality: "A+",
    risk: "极低",
    riskColor: "text-emerald-400",
    riskBg: "bg-emerald-400",
    border: "border-blue-400",
    type: "default" as const,
  },
  {
    id: 2,
    repo: "intel/legacy-app-engine",
    branch: "premium",
    date: "2023年10月20日",
    time: "4 天前完成",
    health: "危 (42%)",
    quality: "C-",
    risk: "高危",
    riskColor: "text-rose-400",
    riskBg: "bg-rose-400",
    border: "border-rose-400",
    type: "premium" as const,
  },
  {
    id: 3,
    repo: "facebook/react",
    version: "v18.2.0",
    date: "2023年09月15日",
    time: "1 个月前完成",
    health: "良 (78%)",
    quality: "B+",
    risk: "中等",
    riskColor: "text-purple-400",
    riskBg: "bg-purple-400",
    border: "border-purple-400",
    type: "version" as const,
  },
];

export default function HistoryPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">
            分析历史记录
          </h1>
          <p className="text-slate-400">
            深度审计资产库：追溯代码演进与安全态势
          </p>
        </div>
        <div className="flex gap-4">
          <div className="relative group">
            <input
              type="text"
              placeholder="搜索存储库..."
              className="bg-[#1c2026] border-none text-[#dfe2eb] px-4 py-2 pl-10 rounded-sm focus:ring-1 focus:ring-blue-500 w-64 transition-all text-sm"
            />
            <Search
              className="absolute left-3 top-2.5 text-slate-500"
              size={16}
            />
          </div>
          <button className="bg-[#1c2026] p-2 px-4 rounded-sm hover:bg-[#31353c] transition-colors flex items-center gap-2 text-sm">
            <Filter size={16} />
            <span>筛选</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-6 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase tracking-widest mb-4">
            扫描总计
          </span>
          <div className="text-4xl font-bold text-blue-400">128</div>
          <div className="mt-4 flex items-center gap-1 text-emerald-400 text-xs">
            <TrendingUp size={12} />
            <span>本月 +12%</span>
          </div>
        </GlassCard>
        <GlassCard className="p-6 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase tracking-widest mb-4">
            平均健康得分
          </span>
          <div className="text-4xl font-bold text-emerald-400">84.2</div>
          <div className="mt-4 h-1 bg-[#1c2026] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 w-[84%]" />
          </div>
        </GlassCard>
        <GlassCard
          className="p-6 col-span-2 relative overflow-hidden"
        >
          <div className="relative z-10">
            <span className="text-slate-500 text-[10px] uppercase tracking-widest mb-4">
              安全概览
            </span>
            <div className="flex items-end gap-6 mt-2">
              <div>
                <div className="text-3xl font-bold text-rose-400">02</div>
                <div className="text-[10px] text-slate-500 uppercase mt-1">
                  高风险
                </div>
              </div>
              <div className="h-10 w-[1px] bg-white/10" />
              <div>
                <div className="text-3xl font-bold text-purple-400">14</div>
                <div className="text-[10px] text-slate-500 uppercase mt-1">
                  中风险
                </div>
              </div>
            </div>
          </div>
          <ShieldAlert
            className="absolute right-0 bottom-0 opacity-10"
            style={{ fontSize: 120 }}
          />
        </GlassCard>
      </div>

      <div className="space-y-4">
        {HISTORY_DATA.map((item) => (
          <GlassCard
            key={item.id}
            className={cn("group border-l-2", item.border)}
          >
            <div className="flex flex-col md:flex-row items-center p-6 gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Code2
                    className={cn(
                      "text-xl",
                      item.type === "premium" ? "text-rose-400" : "text-blue-400"
                    )}
                    size={20}
                  />
                  <h3 className="text-lg font-bold tracking-tight truncate">
                    {item.repo}
                  </h3>
                  {item.branch && (
                    <Badge
                      variant={item.type === "premium" ? "tertiary" : "primary"}
                    >
                      {item.branch === "main" ? "主分支" : "专业版分析"}
                    </Badge>
                  )}
                  {item.version && (
                    <Badge variant="outline">{item.version}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <History size={14} /> {item.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <RefreshCw size={14} /> {item.time}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap md:flex-nowrap gap-8 items-center">
                <div className="text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                    架构健康度
                  </div>
                  <div
                    className={cn(
                      "text-xl font-bold",
                      item.health.includes("优")
                        ? "text-emerald-400"
                        : item.health.includes("危")
                        ? "text-rose-400"
                        : "text-slate-200"
                    )}
                  >
                    {item.health}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                    代码质量
                  </div>
                  <div className="text-xl font-bold">{item.quality}</div>
                </div>
                <div className="text-center min-w-[100px]">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                    安全风险
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <span className={cn("w-2 h-2 rounded-full", item.riskBg)} />
                    <span className={cn("text-sm font-bold", item.riskColor)}>
                      {item.risk}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="px-4 py-2 bg-[#31353c] hover:bg-blue-500/20 hover:text-blue-400 transition-all text-xs font-bold uppercase tracking-widest rounded-sm border border-white/5">
                  查看详情
                </button>
                <button className="p-2 bg-[#31353c] hover:bg-blue-500 transition-all text-[#dfe2eb] hover:text-blue-950 rounded-sm border border-white/5">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="mt-12 flex items-center justify-between border-t border-white/5 pt-8">
        <span className="text-xs text-slate-500 uppercase tracking-widest">
          显示 128 条结果中的 1-10 条
        </span>
        <div className="flex gap-1">
          <button className="w-8 h-8 flex items-center justify-center rounded-sm bg-[#31353c] text-slate-500 hover:text-blue-400 transition-all">
            <ChevronRight className="rotate-180" size={16} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-sm bg-blue-500 text-blue-950 font-bold text-xs">
            1
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-sm bg-[#31353c] text-slate-300 hover:bg-[#414754] transition-all font-bold text-xs">
            2
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-sm bg-[#31353c] text-slate-300 hover:bg-[#414754] transition-all font-bold text-xs">
            3
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-sm bg-[#31353c] text-slate-500 hover:text-blue-400 transition-all">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
