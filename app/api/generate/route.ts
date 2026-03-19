import { NextRequest, NextResponse } from "next/server";
import { generateKp } from "@/lib/deepseek";
import { parseKpResponse } from "@/lib/parseKpResponse";
import { getSession } from "@/lib/auth-magic";
import { decrementUserCredit, addToUserHistory } from "@/lib/user-kv";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, clientName, service, price, deadline, advantages, tone } = body;

    // Базовая валидация
    if (!companyName || !clientName || !service || !price || !deadline || !advantages) {
      return NextResponse.json(
        { error: "Заполни все поля" },
        { status: 400 }
      );
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY не задан в .env.local" },
        { status: 500 }
      );
    }

    // Проверяем авторизацию — если залогинен, списываем серверный кредит
    const sessionId = request.cookies.get("kp_session")?.value;
    let userId: string | null = null;

    if (sessionId) {
      const session = await getSession(sessionId).catch(() => null);
      if (session) {
        userId = session.userId;
        const allowed = await decrementUserCredit(userId).catch(() => true);
        if (!allowed) {
          return NextResponse.json(
            { error: "Кредиты закончились. Пополни баланс в личном кабинете." },
            { status: 402 }
          );
        }
      }
    }

    // Вызов DeepSeek
    const rawXml = await generateKp({
      companyName, clientName, service, price, deadline, advantages,
      tone: tone || "official",
    });

    // Парсинг XML-ответа
    const kp = parseKpResponse(rawXml);

    // Сохраняем КП в историю пользователя (если залогинен)
    const kpId = crypto.randomUUID();
    if (userId) {
      await addToUserHistory(userId, {
        id: kpId,
        title: kp.title || `КП для ${clientName}`,
        createdAt: new Date().toISOString(),
        kp,
        status: "draft",
      }).catch(() => {});
    }

    // [F13] Инкрементируем глобальный счётчик КП (fire-and-forget)
    fetch(`${request.nextUrl.origin}/api/counter`, { method: "POST" }).catch(() => {});

    return NextResponse.json({ kp, kpId: userId ? kpId : null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
