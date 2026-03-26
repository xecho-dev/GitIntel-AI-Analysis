"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Trash2,
  Loader2,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { HistoryItem, HistoryStats, HistoryListResponse } from "@/lib/types";

const PAGE_SIZE = 20;

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 30) return `${diffDay} 天前`;
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function healthLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 85) return `优 (${score}%)`;
  if (score >= 60) return `良 (${score}%)`;
  return `危 (${score}%)`;
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(
    async (p: number, q: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(p),
          page_size: String(PAGE_SIZE),
          ...(q ? { search: q } : {}),
        });
        const res = await fetch(`/api/history?${params}`);
        if (!res.ok) throw new Error(`请求失败: ${res.status}`);
        const data: HistoryListResponse = await res.json();
        setItems(data.items);
        setStats(data.stats);
        setTotal(data.total);
        setPage(data.page);
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchHistory(1, search);
  }, [fetchHistory, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条记录吗？")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => prev - 1);
      setStats((prev) =>
        prev
          ? {
              ...prev,
              total_scans: prev.total_scans - 1,
            }
          : prev
      );
    } catch {
      alert("删除失败，请重试");
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative group">
            <input
              type="text"
              placeholder="搜索存储库..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-[#1c2026] border-none text-[#dfe2eb] px-4 py-2 pl-10 rounded-sm focus:ring-1 focus:ring-blue-500 w-64 transition-all text-sm"
            />
            <Search
              className="absolute left-3 top-2.5 text-slate-500"
              size={16}
            />
          </div>
          <button
            type="submit"
            className="bg-[#1c2026] p-2 px-4 rounded-sm hover:bg-[#31353c] transition-colors flex items-center gap-2 text-sm"
          >
            <Filter size={16} />
            <span>筛选</span>
          </button>
        </form>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GlassCard className="p-6 flex flex-col justify-between">
            <span className="text-slate-500 text-[10px] uppercase tracking-widest mb-4">
              扫描总计
            </span>
            <div className="text-4xl font-bold text-blue-400">
              {stats.total_scans}
            </div>
            <div className="mt-4 flex items-center gap-1 text-emerald-400 text-xs">
              <TrendingUp size={12} />
              <span>历史累计</span>
            </div>
          </GlassCard>
          <GlassCard className="p-6 flex flex-col justify-between">
            <span className="text-slate-500 text-[10px] uppercase tracking-widest mb-4">
              平均健康得分
            </span>
            <div className="text-4xl font-bold text-emerald-400">
              {stats.avg_health_score}
            </div>
            <div className="mt-4 h-1 bg-[#1c2026] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${Math.min(100, stats.avg_health_score)}%` }}
              />
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
                  <div className="text-3xl font-bold text-rose-400">
                    {String(stats.high_risk_count).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase mt-1">
                    高风险
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-white/10" />
                <div>
                  <div className="text-3xl font-bold text-purple-400">
                    {String(stats.medium_risk_count).padStart(2, "0")}
                  </div>
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
      )}

      {/* Loading / Error / Empty States */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-400" />
          <span className="ml-3 text-slate-400">加载中...</span>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-20">
          <p className="text-rose-400 mb-4">{error}</p>
          <button
            onClick={() => fetchHistory(page, search)}
            className="px-4 py-2 bg-[#31353c] rounded-sm hover:bg-[#414754] transition-colors text-sm"
          >
            重试
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <History size={48} className="mx-auto text-slate-600" />
          <p className="text-slate-400">暂无分析记录</p>
          <p className="text-slate-600 text-sm">
            {search
              ? `没有找到包含 "${search}" 的记录`
              : "在首页分析一个 GitHub 仓库开始使用"}
          </p>
        </div>
      )}

      {/* History List */}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <GlassCard
              key={item.id}
              className={cn(
                "group border-l-2",
                item.border_color ?? "border-blue-400"
              )}
            >
              <div className="flex flex-col md:flex-row items-center p-6 gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Code2 className="text-xl text-blue-400" size={20} />
                    <h3 className="text-lg font-bold tracking-tight truncate">
                      {item.repo_name}
                    </h3>
                    {item.branch && (
                      <Badge variant="primary">
                        {item.branch === "main" ? "主分支" : item.branch}
                      </Badge>
                    )}
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {item.repo_url}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <History size={14} /> {formatDate(item.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <RefreshCw size={14} /> {formatRelativeTime(item.created_at)} 完成
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
                        (item.health_score ?? 0) >= 85
                          ? "text-emerald-400"
                          : (item.health_score ?? 0) >= 60
                          ? "text-slate-200"
                          : "text-rose-400"
                      )}
                    >
                      {healthLabel(item.health_score)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                      代码质量
                    </div>
                    <div className="text-xl font-bold">
                      {item.quality_score ?? "—"}
                    </div>
                  </div>
                  <div className="text-center min-w-[100px]">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                      安全风险
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          item.risk_level_bg ?? "bg-slate-400"
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm font-bold",
                          item.risk_level_color ?? "text-slate-400"
                        )}
                      >
                        {item.risk_level ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-[#31353c] hover:bg-blue-500/20 hover:text-blue-400 transition-all text-xs font-bold uppercase tracking-widest rounded-sm border border-white/5">
                    查看详情
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="p-2 bg-[#31353c] hover:bg-rose-500/20 hover:text-rose-400 transition-all text-[#dfe2eb] rounded-sm border border-white/5 disabled:opacity-50"
                    title="删除"
                  >
                    {deletingId === item.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && total > 0 && (
        <div className="mt-12 flex items-center justify-between border-t border-white/5 pt-8">
          <span className="text-xs text-slate-500 uppercase tracking-widest">
            显示 {total} 条结果中的 {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} 条
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                const p = page - 1;
                setPage(p);
                fetchHistory(p, search);
              }}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-sm bg-[#31353c] text-slate-500 hover:text-blue-400 transition-all disabled:opacity-30"
            >
              <ChevronRight className="rotate-180" size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => {
                    setPage(pageNum);
                    fetchHistory(pageNum, search);
                  }}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-sm text-xs font-bold transition-all",
                    page === pageNum
                      ? "bg-blue-500 text-blue-950"
                      : "bg-[#31353c] text-slate-300 hover:bg-[#414754]"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => {
                const p = page + 1;
                setPage(p);
                fetchHistory(p, search);
              }}
              disabled={page >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-sm bg-[#31353c] text-slate-500 hover:text-blue-400 transition-all disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
