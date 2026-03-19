// [F01] Mock-оплата — Вариант A «Пакетная модель»
// В проде: заменить на реальный вызов ЮКасса API + СБП
import { NextRequest, NextResponse } from "next/server";
import { PLANS } from "@/lib/credits";
import { trackConversion } from "@/lib/referral";

type PlanKey = "start" | "active" | "monthly" | "yearly";

export async function POST(request: NextRequest) {
  try {
    const { plan } = await request.json() as { plan: PlanKey };

    if (!["start", "active", "monthly", "yearly"].includes(plan)) {
      return NextResponse.json({ error: "Неизвестный тип плана" }, { status: 400 });
    }

    // Имитируем задержку платёжного шлюза (~800 мс)
    await new Promise((resolve) => setTimeout(resolve, 800));

    const def = PLANS[plan];

    // [F04] Засчитываем конверсию рефералу, если пришёл по реферальной ссылке
    const refCode = request.cookies.get("kp_ref")?.value;
    if (refCode) {
      await trackConversion(refCode, def.priceNum).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      plan,
      kps: def.kps,
      vip: def.vip,
      modern: def.modern,
      daysValid: def.daysValid,
      message: plan === "yearly"
        ? "Годовая подписка активирована! Безлимитные КП на 365 дней."
        : plan === "monthly"
          ? "Подписка активирована! Безлимитные КП на 30 дней."
          : `Оплата успешна! +${def.kps} КП на ${def.daysValid} дней.`,
    });
  } catch {
    return NextResponse.json({ error: "Ошибка обработки платежа" }, { status: 500 });
  }
}
