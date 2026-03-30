"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";

type RoleGuardProps = {
  children: ReactNode;
  allowedRoles: ("user" | "admin" | "staff")[];
  fallback?: ReactNode;
};

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    // If authenticated but wrong role, redirect to the right home
    if (user?.role && !allowedRoles.includes(user.role)) {
      if (user.role === "admin" || user.role === "staff") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
    }
  }, [isAuthenticated, loading, router, user, allowedRoles]);

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!user?.role || !allowedRoles.includes(user.role)) {
    return fallback ?? null;
  }

  return <>{children}</>;
}
