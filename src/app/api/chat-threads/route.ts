import { NextRequest, NextResponse } from "next/server";
import { ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import { listUserChatThreads } from "@/lib/vendor-chat";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const threads = await listUserChatThreads(auth.session.userId);
  return ok(threads);
}
