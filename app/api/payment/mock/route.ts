// [F01] Mock-оплата: симулирует успешный платёж ЮКассы
// В проде заменить на реальный вызов ЮКасса API
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { plan } = await request.json() as { plan: "one_time" | "monthly" };

    // Имитируем задержку платёжного шлюза
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (plan === "one_time") {
      return NextResponse.json({
        success: true,
        plan: "one_time",
        credits: 1,
        message: "Оплата прошла успешно! +1 КП на ваш счёт.",
      });
    }

    if (plan === "monthly") {
      return NextResponse.json({
        success: true,
        plan: "monthly",
        credits: 999,
        message: "Подписка активирована! Безлимитные КП на 30 дней.",
      });
    }

    return NextResponse.json({ error: "Неизвестный тип плана" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Ошибка обработки платежа" }, { status: 500 });
  }
}
