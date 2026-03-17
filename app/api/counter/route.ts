// [F13] Счётчик сгенерированных КП — читает из Vercel KV или возвращает стартовое число
import { NextResponse } from "next/server";

// Стартовое значение (показываем даже без KV — создаём ощущение социального доказательства)
const SEED_COUNT = 847;

export async function GET() {
  try {
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (!kvUrl || !kvToken) {
      return NextResponse.json({ count: SEED_COUNT });
    }

    const res = await fetch(`${kvUrl}/get/kp_total_count`, {
      headers: { Authorization: `Bearer ${kvToken}` },
      next: { revalidate: 300 }, // кешируем 5 минут
    });

    if (!res.ok) {
      return NextResponse.json({ count: SEED_COUNT });
    }

    const data = await res.json() as { result: string | null };
    const count = data.result ? parseInt(data.result) + SEED_COUNT : SEED_COUNT;

    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: SEED_COUNT });
  }
}

export async function POST() {
  // Инкрементируем счётчик при каждой генерации КП
  try {
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (!kvUrl || !kvToken) {
      return NextResponse.json({ ok: true });
    }

    await fetch(`${kvUrl}/incr/kp_total_count`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kvToken}` },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
