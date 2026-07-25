import { prisma } from "@/lib/prisma";

export const DEFAULT_SERVICE_CATEGORIES = [
  { slug: "language-lessons", name: "Language Lessons" },
  { slug: "events", name: "Event Services" },
  { slug: "electrical", name: "Electrical Services" },
  { slug: "real-estate", name: "Real Estate" },
  { slug: "safari", name: "Safari Tours" },
  { slug: "art-experience", name: "Art Experience" },
  { slug: "furniture", name: "Furniture Making" },
  { slug: "electronics", name: "Electronics Sales" },
  { slug: "general-services", name: "General Services" },
  { slug: "other", name: "Other Services" }
] as const;

export async function ensureDefaultServiceCategories(): Promise<void> {
  await Promise.all(
    DEFAULT_SERVICE_CATEGORIES.map((category) =>
      prisma.serviceCategory.upsert({
        where: { slug: category.slug },
        update: { name: category.name },
        create: category
      })
    )
  );
}

export function isMarketplaceCategorySlug(slug: string): boolean {
  return slug !== "other";
}
