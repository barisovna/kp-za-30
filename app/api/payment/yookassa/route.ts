/**
 * POST /api/payment/yookassa
 * Создаёт платёж в ЮКасса и возвращает URL для редиректа.
 *
 * Если YUKASSA_SHOP_ID / YUKASSA_SECRET_KEY не заданы — fallback на mock.
 *
 * Тело запроса: { plan: "start" | "active" | "monthly" | "yearly" }
 * Ответ:        { confirmationUrl: string, paymentId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { PLANS } from "@/lib/credits";
import { createPayment, isYookassaConfigured } from "@/lib/yookassa";
import { getSession } from "@/lib/auth-magic";
import { kv } from "@vercel/kv";

type PlanKey = "start" | "active" | "monthly" | "yearly";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://kp-za-30.vercel.app";

export async function POST(request: NextRequest) {
  try {
    const { plan } = await request.json() as { plan: PlanKey };

    if (!["start", "active", "monthly", "yearly"].includes(plan)) {
      return NextResponse.json({ error: "Неизвестный тип плана" }, { status: 400 });
    }

    const def = PLANS[plan];

    // Получаем userId из сессии (может быть гостем)
    const sessionId = request.cookies.get("kp_session")?.value;
    let userId = "guest";
    if (sessionId) {
      const session = await getSession(sessionId).catch(() => null);
      if (session) userId = session.userId;
    }

    // Если ЮКасса не настроена — возвращаем mock-режим
    if (!isYookassaConfigured()) {
      return NextResponse.json({
        mock: true,
        message: "YUKASSA_SHOP_ID / YUKASSA_SECRET_KEY не заданы. Используется mock.",
      });
    }

    const returnUrl = `${SITE_URL}/payment/success?plan=${plan}`;

    const payment = await createPayment({
      amountRub: def.priceNum,
      description: `${def.name} — КП за 30 секунд`,
      returnUrl,
      metadata: { plan, userId },
    });

    // Сохраняем pendingPayment в KV — свяжем с userId при успехе webhook
    await kv.set(
      `kp_payment_pending:${payment.id}`,
      JSON.stringify({ plan, userId }),
      { ex: 60 * 60 } // 1 час
    );

    return NextResponse.json({
      confirmationUrl: payment.confirmation.confirmation_url,
      paymentId: payment.id,
    });
  } catch (err) {
    console.error("yookassa payment error:", err);
    return NextResponse.json(
      { error: "Ошибка создания платежа. Попробуй ещё раз." },
      { status: 500 }
    );
  }
}
