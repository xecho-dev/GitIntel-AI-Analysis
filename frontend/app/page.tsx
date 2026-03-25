"use client";

import React, { useState } from "react";
import { Search, Zap } from "lucide-react";
import { motion } from "motion/react";
import { ArchitectureAgentCard } from "@/components/agents/ArchitectureAgentCard";
import { QualityAgentCard } from "@/components/agents/QualityAgentCard";
import { DependencyAgentCard } from "@/components/agents/DependencyAgentCard";
import { OptimizationAgentCard } from "@/components/agents/OptimizationAgentCard";
import { PricingSidebar } from "@/components/layout/PricingSidebar";
import { AnalysisPreview } from "@/components/layout/AnalysisPreview";

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/facebook/react");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-10"
    >
      <section className="text-center">
        <h1 className="text-4xl font-black mb-2 tracking-tight">
          智能分析工作台
        </h1>
        <p className="text-slate-400 font-light">
          输入仓库地址，启动深度架构与风险评估
        </p>

        <div className="relative max-w-3xl mx-auto mt-8 flex gap-3 p-1.5 bg-[#1c2026] rounded-xl border border-white/5 shadow-2xl">
          <div className="flex-1 flex items-center px-4 gap-3">
            <Search className="text-slate-500" size={18} />
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/facebook/react"
              className="bg-transparent border-none text-[#dfe2eb] w-full focus:ring-0 placeholder:text-slate-600 text-sm"
            />
          </div>
          <button className="bg-blue-400 text-blue-950 px-8 py-2.5 font-black text-sm rounded-lg hover:brightness-110 transition-all flex items-center gap-2">
            <span>立即分析</span>
            <Zap size={16} fill="currentColor" />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
          <ArchitectureAgentCard />
          <QualityAgentCard />
          <DependencyAgentCard />
          <OptimizationAgentCard />
        </div>

        <div className="xl:col-span-3 space-y-6">
          <PricingSidebar />
          <AnalysisPreview />
        </div>
      </div>
    </motion.div>
  );
}
