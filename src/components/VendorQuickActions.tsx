"use client";

import { useEffect, useState } from "react";
import {
  getVendorStorageEventName,
  isFavoriteVendor,
  recordRecentVendor,
  toggleFavoriteVendor
} from "@/lib/vendor-storage";

interface VendorQuickActionsProps {
  vendorId: string;
  vendorName: string;
}

export function VendorQuickActions({ vendorId, vendorName }: VendorQuickActionsProps) {
  const [favorite, setFavorite] = useState(() =>
    typeof window === "undefined" ? false : isFavoriteVendor(vendorId)
  );

  useEffect(() => {
    recordRecentVendor({ id: vendorId, name: vendorName });

    function refresh(): void {
      setFavorite(isFavoriteVendor(vendorId));
    }

    window.addEventListener(getVendorStorageEventName(), refresh);
    return () => window.removeEventListener(getVendorStorageEventName(), refresh);
  }, [vendorId, vendorName]);

  function toggle(): void {
    const current = toggleFavoriteVendor({ id: vendorId, name: vendorName });
    setFavorite(current);
  }

  return (
    <div className="row">
      <button className={`btn ${favorite ? "secondary" : ""}`} onClick={toggle} type="button">
        {favorite ? "Saved in favorites" : "Add to favorites"}
      </button>
    </div>
  );
}
