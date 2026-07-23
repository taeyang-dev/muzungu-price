const serviceDefaultImageByCategory: Record<string, string> = {
  electrical:
    "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80",
  events:
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
  "language-lessons":
    "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80",
  "real-estate":
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80",
  safari:
    "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80",
  other:
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80"
};

export function getDefaultServiceImage(categorySlug?: string | null): string {
  if (!categorySlug) {
    return serviceDefaultImageByCategory.other;
  }

  return serviceDefaultImageByCategory[categorySlug] ?? serviceDefaultImageByCategory.other;
}
