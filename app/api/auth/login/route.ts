import { NextRequest, NextResponse } from "next/server";
import { sendMagicLink } from "@/lib/auth-magic";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Введи корректный email" },
        { status: 400 }
      );
    }

    // Если KV не настроен — сообщаем об этом понятно
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      return NextResponse.json(
        { error: "База данных не настроена. Добавь KV_REST_API_URL и KV_REST_API_TOKEN в .env.local (скопируй из Vercel Dashboard → Storage → KV)." },
        { status: 503 }
      );
    }

    const { link, sent } = await sendMagicLink(email.trim().toLowerCase());
    // Если письмо не ушло — возвращаем ссылку ТОЛЬКО в dev-режиме, чтобы не светить токен в production
    const devLink = (!sent && process.env.NODE_ENV === "development") ? link : undefined;
    return NextResponse.json({ ok: true, sent, devLink });
  } catch (err) {
    console.error("auth/login error:", err);
    return NextResponse.json(
      { error: "Не удалось отправить письмо. Попробуй ещё раз." },
      { status: 500 }
    );
  }
}
