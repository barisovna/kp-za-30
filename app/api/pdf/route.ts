/**
 * POST /api/pdf
 * Генерация PDF на сервере через @react-pdf/renderer.
 * Body: { kp: ParsedKp, logo: string|null, template: Template }
 * Response: application/pdf
 */
import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ParsedKp } from "@/lib/parseKpResponse";
import type { Template } from "@/lib/pdf-templates";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { kp, logo, template } = (await req.json()) as {
      kp: ParsedKp;
      logo: string | null;
      template: Template;
    };

    if (!kp || !template) {
      return NextResponse.json({ error: "kp and template are required" }, { status: 400 });
    }

    // Защита от undefined-массивов — pdf-шаблоны вызывают .map() на этих полях
    const safeKp: import("@/lib/parseKpResponse").ParsedKp = {
      title:     kp.title     ?? "Коммерческое предложение",
      greeting:  kp.greeting  ?? "",
      about:     kp.about     ?? "",
      offer:     kp.offer     ?? "",
      benefits:  kp.benefits  ?? [],
      price:     kp.price     ?? "",
      deadline:  kp.deadline  ?? "",
      cta:       kp.cta       ?? "",
      signature: kp.signature ?? "",
      // Опциональные поля ВИП-шаблона — дефолт: пустые массивы
      benefitCards: kp.benefitCards ?? [],
      priceItems:   kp.priceItems   ?? [],
      priceTotal:   kp.priceTotal   ?? "",
      timeline:     kp.timeline     ?? [],
      conditions:   kp.conditions   ?? [],
    };

    // Dynamic import: @react-pdf/renderer не должен грузиться при старте сервера
    const { KpDocument } = await import("@/lib/pdf-templates");

    const element = React.createElement(KpDocument, { kp: safeKp, logo: logo ?? null, template });
    // @ts-ignore — KpDocument wraps <Document> which satisfies renderToBuffer
    const buffer = await renderToBuffer(element);

    // Имя файла на основе заголовка КП
    const safeTitle = safeKp.title
      .replace(/[^\wА-яа-яёЁ\s]/g, "")
      .trim()
      .slice(0, 50)
      .replace(/\s+/g, "_");
    const filename = `КП_${safeTitle}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/pdf] PDF generation error:", err);
    return NextResponse.json(
      { error: "PDF generation failed", detail: String(err) },
      { status: 500 }
    );
  }
}
