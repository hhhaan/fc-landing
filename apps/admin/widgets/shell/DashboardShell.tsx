"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Sidebar } from "@/widgets/shell/Sidebar";

type ShellCtx = {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
};

const ShellContext = createContext<ShellCtx | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within DashboardShell");
  return ctx;
}

const STORAGE_KEY = "fc-admin-sidebar-collapsed";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  // default expanded; read localStorage after mount to avoid SSR mismatch flash
  const [collapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") {
        setCollapsedState(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((v: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    persist(v);
  }, [persist]);

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      persist(next);
      return next;
    });
  }, [persist]);

  return (
    <ShellContext.Provider value={{ collapsed, toggle, setCollapsed }}>
      <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </ShellContext.Provider>
  );
}
