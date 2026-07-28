"use client";

import { useEffect, useRef } from "react";
import { useLoadingContext } from "@/components/LoadingProvider";

export function useSyncAppLoading(active: boolean): void {
  const loadingContext = useLoadingContext();
  const isTrackingRef = useRef(false);

  useEffect(() => {
    if (!loadingContext) {
      return undefined;
    }

    if (active && !isTrackingRef.current) {
      loadingContext.beginLoading();
      isTrackingRef.current = true;
    } else if (!active && isTrackingRef.current) {
      loadingContext.endLoading();
      isTrackingRef.current = false;
    }

    return () => {
      if (isTrackingRef.current) {
        loadingContext.endLoading();
        isTrackingRef.current = false;
      }
    };
  }, [active, loadingContext]);
}
