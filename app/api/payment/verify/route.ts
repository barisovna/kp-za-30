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

  // Получаем userId из сессии
  const sessionId = request.cookies.get("kp_session")?.value;
  if (!sessionId) {
    return NextResponse.json({ ok: false, reason: "no_session" });
  }

  let session;
  try {
    session = await getSession(sessionId);
  } catch {
    return NextResponse.json({ ok: false, reason: "session_error" });
  }
  if (!session) {
    return NextResponse.json({ ok: false, reason: "invalid_session" });
  }
  const userId = session.userId;

  // Читаем paymentId из обратного индекса
  let paymentId: string | null = null;
  try {
    paymentId = await kv.get<string>(`kp_payment_user:${userId}`);
  } catch {
    return NextResponse.json({ ok: false, reason: "kv_error_index" });
  }
  if (!paymentId) {
    return NextResponse.json({ ok: false, reason: "no_pending_payment" });
  }

  // Верифицируем через YooKassa API
  let payment;
  try {
    payment = await getPayment(paymentId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("verify: getPayment failed:", msg);
    return NextResponse.json({ ok: false, reason: "yookassa_error", detail: msg });
  }

  if (payment.status !== "succeeded") {
    return NextResponse.json({ ok: false, reason: "payment_not_succeeded", status: payment.status });
  }

  // Читаем pending-запись
  let pendingRaw;
  try {
    pendingRaw = await kv.get(`kp_payment_pending:${paymentId}`);
  } catch {
    return NextResponse.json({ ok: false, reason: "kv_error_pending" });
  }

  if (!pendingRaw) {
    // Уже активировано webhook'ом — всё хорошо
    return NextResponse.json({ ok: true, activated: false, reason: "already_processed" });
  }

  // @vercel/kv может вернуть уже-объект или строку
  let parsed: { plan: PlanKey; userId: string };
  try {
    parsed = typeof pendingRaw === "string"
      ? JSON.parse(pendingRaw)
      : pendingRaw as { plan: PlanKey; userId: string };
  } catch {
    return NextResponse.json({ ok: false, reason: "parse_error" });
  }

  const { plan } = parsed;
  const def = PLANS[plan];
  if (!def) {
    return NextResponse.json({ ok: false, reason: "unknown_plan", plan });
  }

  // Активируем план
  try {
    await activateUserPlan(userId, plan, def.kps, def.vip, def.modern, def.daysValid);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("verify: activateUserPlan failed:", msg);
    return NextResponse.json({ ok: false, reason: "activate_error", detail: msg });
  }

  // Удаляем pending-запись и индекс
  await kv.del(`kp_payment_pending:${paymentId}`).catch(() => {});
  await kv.del(`kp_payment_user:${userId}`).catch(() => {});

  console.log(`✅ verify: plan ${plan} activated for ${userId}`);
  return NextResponse.json({ ok: true, activated: true, plan });
}
