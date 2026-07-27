"use client";

import { useEffect } from "react";
import { useLoadingContext } from "@/components/LoadingProvider";

export function useSyncAppLoading(active: boolean): void {
  const loadingContext = useLoadingContext();

  useEffect(() => {
    if (!loadingContext || !active) {
      return undefined;
    }

    loadingContext.beginLoading();
    return () => {
      loadingContext.endLoading();
    };
  }, [active, loadingContext]);
}
