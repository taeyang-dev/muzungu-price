import { NextResponse } from "next/server";
import { ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: { name: "asc" }
  });
  return ok(categories);
}
