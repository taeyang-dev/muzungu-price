"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { GorillaLoader } from "@/components/GorillaLoader";
import type { Locale } from "@/lib/i18n";

interface LoadingContextValue {
  beginLoading: () => void;
  endLoading: () => void;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({
  children,
  locale = "en"
}: {
  children: ReactNode;
  locale?: Locale;
}) {
  const [activeCount, setActiveCount] = useState(0);

  const beginLoading = useCallback(() => {
    setActiveCount((count) => count + 1);
  }, []);

  const endLoading = useCallback(() => {
    setActiveCount((count) => Math.max(0, count - 1));
  }, []);

  const value = useMemo(
    () => ({
      beginLoading,
      endLoading
    }),
    [beginLoading, endLoading]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {activeCount > 0 && (
        <div aria-busy="true" aria-live="polite" className="gorilla-loading-overlay">
          <GorillaLoader locale={locale} />
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useAppLoading(): LoadingContextValue {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useAppLoading must be used within LoadingProvider");
  }
  return context;
}

export function useLoadingContext(): LoadingContextValue | null {
  return useContext(LoadingContext);
}
