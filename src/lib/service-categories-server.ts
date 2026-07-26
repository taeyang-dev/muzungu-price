import { prisma } from "@/lib/prisma";
import { DEFAULT_SERVICE_CATEGORIES } from "@/lib/service-categories";

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
