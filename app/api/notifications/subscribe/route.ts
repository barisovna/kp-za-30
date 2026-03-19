// [F05] Подписка на email-уведомления
// Сохраняет email + метаданные в Vercel KV

import { NextRequest, NextResponse } from "next/server";

interface SubscribeBody {
  email: string;
  plan: string;
  planExpires: number | null;
}

async function kvPost(url: string, token: string, path: string, body?: unknown) {
  return fetch(`${url}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email, plan, planExpires } = await request.json() as SubscribeBody;

    // Валидация email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
    }

    const kvUrl   = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    // Без KV — просто подтверждаем (graceful degradation)
    if (!kvUrl || !kvToken) {
      return NextResponse.json({ ok: true, stored: false });
    }

    const userData = {
      email,
      plan: plan || "free",
      planExpires: planExpires ?? null,
      lastKpDate: new Date().toISOString(),
      subscribedAt: new Date().toISOString(),
    };

    // Сохраняем данные пользователя
    await kvPost(kvUrl, kvToken, `/set/notif:user:${encodeURIComponent(email)}`, userData);
    // Добавляем в множество подписчиков
    await kvPost(kvUrl, kvToken, `/sadd/notif:subscribers/${encodeURIComponent(email)}`);

    return NextResponse.json({ ok: true, stored: true });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// Отписать пользователя
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email") ?? "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
    }

    const kvUrl   = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (!kvUrl || !kvToken) {
      return NextResponse.json({ ok: true });
    }

    const encoded = encodeURIComponent(email);
    // Удаляем данные пользователя
    await fetch(`${kvUrl}/del/notif:user:${encoded}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    // Удаляем из множества подписчиков
    await fetch(`${kvUrl}/srem/notif:subscribers/${encoded}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}` },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// Обновить дату последнего КП для существующего подписчика
export async function PATCH(request: NextRequest) {
  try {
    const { email } = await request.json() as { email: string };
    const kvUrl   = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    if (!kvUrl || !kvToken || !email) return NextResponse.json({ ok: true });

    const key = `/get/notif:user:${encodeURIComponent(email)}`;
    const res = await fetch(`${kvUrl}${key}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    const { result } = await res.json() as { result: string | null };
    if (!result) return NextResponse.json({ ok: true });

    const user = JSON.parse(result) as Record<string, unknown>;
    user.lastKpDate = new Date().toISOString();
    await kvPost(kvUrl, kvToken, `/set/notif:user:${encodeURIComponent(email)}`, user);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
