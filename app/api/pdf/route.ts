/**
 * POST /api/pdf
 * Генерация PDF на сервере через @react-pdf/renderer.
 * Body: { kp: ParsedKp, logo: string|null, template: Template }
 * Response: application/pdf
 *
 * [B01] Серверная защита premium-шаблонов:
 *   - VIP / Modern доступны только авторизованным пользователям с платным планом.
 *   - Гости и free-пользователи получают 403 при попытке скачать premium PDF.
 */
import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ParsedKp } from "@/lib/parseKpResponse";
import type { Template } from "@/lib/pdf-templates";
import { getSession } from "@/lib/auth-magic";
import { getUserCredits } from "@/lib/user-kv";

export const runtime = "nodejs";

const PREMIUM_TEMPLATES: Template[] = ["vip", "modern"];

export async function POST(req: NextRequest) {
  try {
    const { kp, logo, template } = (await req.json()) as {
      kp: ParsedKp;
      logo: string | null;
      template: Template;
    };

    // [B01] Серверная валидация доступа к premium-шаблонам
    if (PREMIUM_TEMPLATES.includes(template)) {
      const sessionId = req.cookies.get("kp_session")?.value;
      if (!sessionId) {
        return NextResponse.json(
          { error: "Требуется авторизация для ВИП-шаблонов" },
          { status: 403 }
        );
      }
      const session = await getSession(sessionId).catch(() => null);
      if (!session) {
        return NextResponse.json(
          { error: "Сессия недействительна" },
          { status: 403 }
        );
      }
      const credits = await getUserCredits(session.userId);
      const hasPremiumAccess =
        credits.plan === "active" ||
        credits.plan === "monthly" ||
        credits.plan === "yearly" ||
        (credits.plan === "start" &&
          (template === "vip" ? credits.vipLeft !== 0 : credits.modernLeft !== 0));
      if (!hasPremiumAccess) {
        return NextResponse.json(
          { error: "Нет доступа к premium-шаблону" },
          { status: 403 }
        );
      }
    }

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
