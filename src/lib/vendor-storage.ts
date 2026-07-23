export interface VendorReference {
  id: string;
  name: string;
}

const FAVORITE_KEY = "muzungu_favorite_vendors";
const RECENT_KEY = "muzungu_recent_vendors";
const STORAGE_EVENT = "vendor-storage-updated";

function readList(key: string): VendorReference[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(
        (item): item is VendorReference =>
          typeof item === "object" &&
          item !== null &&
          typeof item.id === "string" &&
          typeof item.name === "string"
      )
      .slice(0, 20);
  } catch {
    return [];
  }
}

function writeList(key: string, value: VendorReference[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function readFavoriteVendors(): VendorReference[] {
  return readList(FAVORITE_KEY);
}

export function readRecentVendors(): VendorReference[] {
  return readList(RECENT_KEY);
}

export function isFavoriteVendor(id: string): boolean {
  return readFavoriteVendors().some((vendor) => vendor.id === id);
}

export function toggleFavoriteVendor(vendor: VendorReference): boolean {
  const existing = readFavoriteVendors();
  const alreadyFavorite = existing.some((item) => item.id === vendor.id);

  if (alreadyFavorite) {
    writeList(
      FAVORITE_KEY,
      existing.filter((item) => item.id !== vendor.id)
    );
    return false;
  }

  writeList(
    FAVORITE_KEY,
    [vendor, ...existing.filter((item) => item.id !== vendor.id)].slice(0, 10)
  );
  return true;
}

export function recordRecentVendor(vendor: VendorReference): void {
  const current = readRecentVendors();
  writeList(
    RECENT_KEY,
    [vendor, ...current.filter((item) => item.id !== vendor.id)].slice(0, 10)
  );
}

export function getVendorStorageEventName(): string {
  return STORAGE_EVENT;
}
