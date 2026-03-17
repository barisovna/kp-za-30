// [F01] Mock-оплата — Вариант A «Пакетная модель»
// В проде: заменить на реальный вызов ЮКасса API + СБП
import { NextRequest, NextResponse } from "next/server";
import { PLANS } from "@/lib/credits";

type PlanKey = "start" | "active" | "monthly";

export async function POST(request: NextRequest) {
  try {
    const { plan } = await request.json() as { plan: PlanKey };

    if (!["start", "active", "monthly"].includes(plan)) {
      return NextResponse.json({ error: "Неизвестный тип плана" }, { status: 400 });
    }

    // Имитируем задержку платёжного шлюза (~800 мс)
    await new Promise((resolve) => setTimeout(resolve, 800));

    const def = PLANS[plan];

    return NextResponse.json({
      success: true,
      plan,
      kps: def.kps,
      vip: def.vip,
      modern: def.modern,
      daysValid: def.daysValid,
      message: plan === "monthly"
        ? "Подписка активирована! Безлимитные КП на 30 дней."
        : `Оплата успешна! +${def.kps} КП на ${def.daysValid} дней.`,
    });
  } catch {
    return NextResponse.json({ error: "Ошибка обработки платежа" }, { status: 500 });
  }
}
