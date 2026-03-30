"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, CalendarRange, CarFront, LogOut } from "lucide-react";

import { useAuth } from "@/lib/auth";

export function UserSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const userSession = {
    email: user?.email || "customer@demo.com",
  };

  const navItems = [
    { href: "/", label: "เคลมอัจฉริยะ", icon: CarFront },
    { href: "/support", label: "ผู้ช่วย AI", icon: BookOpenText },
    { href: "/booking", label: "จองคิวบริการ", icon: CalendarRange },
  ];

  return (
    <aside className="sticky top-0 hidden h-screen w-full overflow-y-auto border-r border-white/15 bg-slate-900 text-white lg:block">
      <div className="relative h-full p-6 flex flex-col">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-panel">
          <p className="text-xl font-semibold tracking-[0.08em] text-white">AUTO CORE</p>
          <p className="mt-2 text-sm text-slate-300">พอร์ทัลลูกค้า</p>
        </div>

        <nav className="mt-8 flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "border-red-400/50 bg-red-700/20 text-white"
                    : "border-transparent text-slate-100 hover:border-red-400/40 hover:bg-red-700/20"
                }`}
              >
                <Icon size={18} className="text-red-300" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-slate-700 pt-4">
          <div className="rounded-xl bg-slate-100 p-4 text-sm">
            <p className="text-slate-600">บัญชีที่ใช้งาน</p>
            <p className="font-semibold text-slate-600">{userSession.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-2 rounded-lg bg-red-900/40 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-900/60"
          >
            <LogOut size={16} />
            ออกจากระบบ
          </button>
        </div>
      </div>
    </aside>
  );
}
