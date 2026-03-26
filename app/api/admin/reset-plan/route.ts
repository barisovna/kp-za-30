/**
 * GET /api/admin/reset-plan?email=...&token=CRON_SECRET
 * Сбрасывает план пользователя на Free. Только для тестирования.
 * Защищён токеном CRON_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const token = request.nextUrl.searchParams.get("token");
  const email = request.nextUrl.searchParams.get("email");

  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const userId = `user:${email}`;

  // Сбрасываем план на Free
  await kv.del(`kp_credits:${userId}`);
  // Также чистим pending-индексы на всякий случай
  await kv.del(`kp_payment_user:${userId}`).catch(() => {});

  return NextResponse.json({
    ok: true,
    message: `Plan reset to Free for ${email}`,
    userId,
  });
}
