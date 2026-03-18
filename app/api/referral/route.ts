// [F04] Партнёрская программа — API
// POST /api/referral        { email } → создать реферальный код
// GET  /api/referral?code=X            → получить статистику
// POST /api/referral        { code }   → засчитать клик (внутренний)

import { NextRequest, NextResponse } from "next/server";
import {
  createReferral,
  getReferralStats,
  getReferralByEmail,
  trackClick,
} from "@/lib/referral";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string; trackClick?: string };

    // Засчитать клик
    if (body.trackClick) {
      await trackClick(body.trackClick);
      return NextResponse.json({ ok: true });
    }

    // Создать/найти реферала по email
    if (!body.email || !body.email.includes("@")) {
      return NextResponse.json({ error: "Нужен email" }, { status: 400 });
    }

    const stats = await createReferral(body.email.trim().toLowerCase());
    if (!stats) {
      return NextResponse.json(
        { error: "Сервис временно недоступен. Попробуйте позже." },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, code: stats.code, stats });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const email = searchParams.get("email");

  try {
    if (code) {
      const stats = await getReferralStats(code);
      if (!stats) return NextResponse.json({ error: "Код не найден" }, { status: 404 });
      return NextResponse.json({ ok: true, stats });
    }

    if (email) {
      const stats = await getReferralByEmail(email);
      if (!stats) return NextResponse.json({ error: "Email не найден" }, { status: 404 });
      return NextResponse.json({ ok: true, stats });
    }

    return NextResponse.json({ error: "Нужен code или email" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
