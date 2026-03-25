/**
 * POST /api/webhooks/yookassa
 * Обрабатывает уведомления от ЮКасса о статусе платежей.
 *
 * Безопасность: перепроверяем платёж через API ЮКасса (не доверяем только webhook payload).
 *
 * Настройка в личном кабинете ЮКасса:
 *   Интеграция → Webhook → URL: https://kp-za-30.vercel.app/api/webhooks/yookassa
 *   Тип событий: payment.succeeded
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayment, isYookassaConfigured } from "@/lib/yookassa";
import { PLANS } from "@/lib/credits";
import { activateUserPlan } from "@/lib/user-kv";
import { trackConversion } from "@/lib/referral";
import { kv } from "@vercel/kv";

type PlanKey = "start" | "active" | "monthly" | "yearly";

export async function POST(request: NextRequest) {
  // B02: Если ЮКасса не настроена — игнорируем webhook (не активируем кредиты)
  if (!isYookassaConfigured()) {
    return NextResponse.json({ ok: true });
  }

  try {
    const body = await request.json();

    // ЮКасса шлёт: { type: "notification", event: "payment.succeeded", object: { id, ... } }
    if (body.event !== "payment.succeeded") {
      return NextResponse.json({ ok: true }); // игнорируем другие события
    }

    const paymentId: string = body.object?.id;
    if (!paymentId) {
      return NextResponse.json({ error: "missing paymentId" }, { status: 400 });
    }

    // Верификация: перепроверяем статус платежа через API ЮКасса
    const payment = await getPayment(paymentId);
    if (payment.status !== "succeeded") {
      return NextResponse.json({ ok: true }); // ещё не оплачен
    }

    // Читаем данные из pending-записи в KV
    const pending = await kv.get<string>(`kp_payment_pending:${paymentId}`);
    if (!pending) {
      // Уже обработан или истёк — идемпотентно возвращаем OK
      return NextResponse.json({ ok: true });
    }

    const { plan, userId } = JSON.parse(pending) as { plan: PlanKey; userId: string };
    const def = PLANS[plan];

    // Активируем план для пользователя
    if (userId !== "guest") {
      await activateUserPlan(
        userId,
        plan === "monthly" || plan === "yearly" ? plan : plan,
        def.kps,
        def.vip,
        def.modern,
        def.daysValid,
      );
    }

    // Засчитываем конверсию рефералу
    const refCode = payment.metadata?.refCode;
    if (refCode) {
      await trackConversion(refCode, def.priceNum).catch(() => {});
    }

    // Удаляем pending-запись (идемпотентность)
    await kv.del(`kp_payment_pending:${paymentId}`);

    // Логируем успешный платёж
    await kv.lpush(
      "kp_payments_log",
      JSON.stringify({
        paymentId,
        plan,
        userId,
        amount: def.priceNum,
        createdAt: new Date().toISOString(),
      })
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("yookassa webhook error:", err);
    // Возвращаем 200 чтобы ЮКасса не повторяла запрос бесконечно
    return NextResponse.json({ ok: true });
  }
}
