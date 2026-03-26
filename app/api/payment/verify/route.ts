/**
 * POST /api/payment/verify
 * Верифицирует последний платёж пользователя и активирует план.
 * Вызывается из /payment/success как резервный механизм (если webhook не дошёл).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-magic";
import { getPayment, isYookassaConfigured } from "@/lib/yookassa";
import { PLANS } from "@/lib/credits";
import { activateUserPlan } from "@/lib/user-kv";
import { kv } from "@vercel/kv";

type PlanKey = "start" | "active" | "monthly" | "yearly";

export async function POST(request: NextRequest) {
  if (!isYookassaConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  try {
    // Получаем userId из сессии
    const sessionId = request.cookies.get("kp_session")?.value;
    if (!sessionId) {
      return NextResponse.json({ ok: false, reason: "no_session" });
    }
    const session = await getSession(sessionId).catch(() => null);
    if (!session) {
      return NextResponse.json({ ok: false, reason: "invalid_session" });
    }
    const userId = session.userId;

    // Читаем paymentId из обратного индекса
    const paymentId = await kv.get<string>(`kp_payment_user:${userId}`);
    if (!paymentId) {
      return NextResponse.json({ ok: false, reason: "no_pending_payment" });
    }

    // Верифицируем через YooKassa API
    const payment = await getPayment(paymentId);
    if (payment.status !== "succeeded") {
      return NextResponse.json({ ok: false, reason: "payment_not_succeeded", status: payment.status });
    }

    // Читаем pending-запись
    const pending = await kv.get<string>(`kp_payment_pending:${paymentId}`);
    if (!pending) {
      // Уже активировано webhook'ом — всё хорошо
      return NextResponse.json({ ok: true, activated: false, reason: "already_processed" });
    }

    const { plan } = JSON.parse(pending) as { plan: PlanKey; userId: string };
    const def = PLANS[plan];

    // Активируем план
    await activateUserPlan(
      userId,
      plan,
      def.kps,
      def.vip,
      def.modern,
      def.daysValid,
    );

    // Удаляем pending-запись и индекс
    await kv.del(`kp_payment_pending:${paymentId}`);
    await kv.del(`kp_payment_user:${userId}`);

    return NextResponse.json({ ok: true, activated: true, plan });
  } catch (err) {
    console.error("payment/verify error:", err);
    return NextResponse.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
