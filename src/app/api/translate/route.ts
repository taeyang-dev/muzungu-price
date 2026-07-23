import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";

type Lang = "en" | "ko" | "rw";

const schema = z.object({
  text: z.string().min(1).max(2000),
  targetLanguage: z.enum(["en", "ko", "rw"]),
  sourceLanguage: z.enum(["auto", "en", "ko", "rw"]).optional()
});

const fallbackDictionary: Record<string, Record<Lang, string>> = {
  "Thanks for your message. We will confirm scope, timeline, and final RWF quotation shortly.": {
    en: "Thanks for your message. We will confirm scope, timeline, and final RWF quotation shortly.",
    ko: "문의 감사합니다. 범위와 일정, 최종 RWF 견적을 곧 안내드리겠습니다.",
    rw: "Murakoze ku butumwa bwawe. Turahita tubasubiza ku ncamake y'akazi, igihe n'igiciro cya nyuma cya RWF."
  },
  "Hi, this is vendor support. Please share your requirements and preferred timeline.": {
    en: "Hi, this is vendor support. Please share your requirements and preferred timeline.",
    ko: "안녕하세요, 업체 지원팀입니다. 요청 내용과 원하는 일정을 알려주세요.",
    rw: "Muraho, hano ni itsinda ry'ubufasha bw'ikigo. Mudusangize ibyo mukeneye n'igihe mwifuza."
  }
};

function fallbackTranslate(text: string, targetLanguage: Lang): string {
  const exact = fallbackDictionary[text];
  if (exact) {
    return exact[targetLanguage];
  }
  return text;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = schema.parse(await request.json());
    const source = payload.sourceLanguage ?? "auto";

    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", source);
    url.searchParams.set("tl", payload.targetLanguage);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", payload.text);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "User-Agent": "MuzunguPriceTranslator/1.0"
        }
      });

      if (!response.ok) {
        const fallback = fallbackTranslate(payload.text, payload.targetLanguage);
        return ok({
          translatedText: fallback,
          detectedSourceLanguage: source === "auto" ? "unknown" : source,
          fallbackUsed: true
        });
      }

      const data = (await response.json()) as unknown;
      if (!Array.isArray(data) || !Array.isArray(data[0])) {
        const fallback = fallbackTranslate(payload.text, payload.targetLanguage);
        return ok({
          translatedText: fallback,
          detectedSourceLanguage: source === "auto" ? "unknown" : source,
          fallbackUsed: true
        });
      }

      const translatedText = (data[0] as unknown[])
        .map((item) => (Array.isArray(item) ? String(item[0] ?? "") : ""))
        .join("")
        .trim();

      const detectedSourceLanguage =
        typeof data[2] === "string" ? data[2] : source === "auto" ? "unknown" : source;

      return ok({
        translatedText: translatedText || fallbackTranslate(payload.text, payload.targetLanguage),
        detectedSourceLanguage,
        fallbackUsed: translatedText.length === 0
      });
    } catch {
      const fallback = fallbackTranslate(payload.text, payload.targetLanguage);
      return ok({
        translatedText: fallback,
        detectedSourceLanguage: source === "auto" ? "unknown" : source,
        fallbackUsed: true
      });
    }
  } catch {
    return fail("Invalid translation payload", 400, "VAL_001");
  }
}
