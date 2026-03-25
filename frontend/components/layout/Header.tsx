"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  History,
  UserCircle,
  Bell,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "工作台", icon: LayoutDashboard },
  { href: "/history", label: "历史记录", icon: History },
  { href: "/account", label: "账户中心", icon: UserCircle },
];

export const Header = () => {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 w-full z-50 bg-[#10141a]/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center px-6 h-16">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tighter text-blue-400 font-headline">
            GitIntel
          </span>
        </div>
        <nav className="hidden md:flex gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 text-sm tracking-tight transition-all duration-200 rounded flex items-center gap-2",
                  isActive
                    ? "text-blue-400 font-bold bg-blue-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button className="hidden md:block px-4 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-sm hover:bg-blue-500/20 transition-all font-medium text-xs uppercase tracking-widest">
          升级专业版
        </button>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:bg-white/5 rounded-full transition-colors">
            <Bell size={20} />
          </button>
          <button className="p-2 text-slate-400 hover:bg-white/5 rounded-full transition-colors">
            <Settings size={20} />
          </button>
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center overflow-hidden border border-white/10 ml-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkPsi_KTxSXNH9ttW5l6V7hIV-OQ3BDUygCu3ymWaH3BM-g9HKp1L-QsN9HdOcQLssuyWdLPDLGZXTeBDrd12OmGNn31RfbEk222AfDci-T9UmIAsj6AKzQ5Du0gU3T7Xjx34J2426XlzRq9tLWgr_S7yyYRSb7jpw9BNa2O6R52iBtUQmU96WfwgIAhrAHTF3YPRQVFF3SZqiXCYw9wEtJtUye7Gf1sVl0K40UOWk3RD7FONeqNz7EAtC-lcuYiE00jPwBDLHwmVP"
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
