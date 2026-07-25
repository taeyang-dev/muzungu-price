import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { extensionForMimeType, parseDataUrl } from "@/lib/data-url";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ documentId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireRole(_request, ["admin"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const { documentId } = await params;
  const document = await prisma.verificationDocument.findUnique({
    where: { id: documentId }
  });

  if (!document) {
    return fail("Document not found", 404, "NOT_FOUND");
  }

  if (document.fileUrl.startsWith("http://") || document.fileUrl.startsWith("https://")) {
    return NextResponse.redirect(document.fileUrl);
  }

  const parsed = parseDataUrl(document.fileUrl);
  if (!parsed) {
    return fail("Document file is not available for preview", 400, "VER_006");
  }

  const extension = extensionForMimeType(parsed.mimeType);
  const filename = `${document.docType.replace(/[^a-zA-Z0-9._-]+/g, "_")}.${extension}`;

  return new NextResponse(new Uint8Array(parsed.buffer), {
    status: 200,
    headers: {
      "Content-Type": parsed.mimeType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600"
    }
  });
}
