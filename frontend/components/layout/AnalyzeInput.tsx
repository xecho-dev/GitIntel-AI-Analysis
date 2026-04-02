"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Search, Zap, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { analyzeRepo } from "@/lib/api";

export const AnalyzeInput = ({ userId }: { userId: string }) => {
  const [localRepoUrl, setLocalRepoUrl] = useState("https://github.com/xecho-dev/test.git");
  const isAnalyzing = useAppStore((s) => s.isAnalyzing);

  const handleAnalyze = useCallback(async () => {
      const store = useAppStore.getState();
      if (!localRepoUrl.trim()) {
        store.setError("请输入仓库地址");
        return;
      }
      const repoUrl = localRepoUrl;

      // 清空上一次的分析结果
      store.reset();
      store.setError(null);
      store.setIsAnalyzing(true);
      store.setRepoUrl(repoUrl);



    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await analyzeRepo(repoUrl, undefined, userId, (data: any) => {
        const event = data as { agent?: string; type?: string };
        if (event?.agent) {
          store.setActiveAgent(event.agent);
        }
        store.pushAgentEvent(data);
      });
    } catch (err) {
      useAppStore.getState().setError(err instanceof Error ? err.message : "分析失败");
    } finally {
      store.setIsAnalyzing(false);
      store.setActiveAgent(null);
    }
  }, [localRepoUrl, userId]);

  return (
    <div className="relative max-w-3xl mx-auto mt-8 flex gap-3 p-1.5 bg-[#1c2026] rounded-xl border border-white/5 shadow-2xl">
      <div className="flex-1 flex items-center px-4 gap-3">
        <Search className="text-slate-500" size={18} />
        <input
          type="text"
          value={localRepoUrl}
          onChange={(e) => setLocalRepoUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          placeholder="https://github.com/facebook/react"
          className="bg-transparent border-none text-[#dfe2eb] w-full focus:ring-0 placeholder:text-slate-600 text-sm"
        />
      </div>
      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        className="bg-blue-400 text-blue-950 px-8 py-2.5 font-black text-sm rounded-lg hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isAnalyzing ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>分析中...</span>
          </>
        ) : (
          <>
            <span>立即分析</span>
            <Zap size={16} fill="currentColor" />
          </>
        )}
      </button>
    </div>
  );
};
