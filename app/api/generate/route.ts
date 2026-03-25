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
    } else {
      // Гость (не авторизован) — проверяем серверный IP-лимит через KV
      // Это защищает от обхода лимита через очистку localStorage
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown";

      if (ip !== "unknown" && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        try {
          const kvUrl   = process.env.KV_REST_API_URL;
          const kvToken = process.env.KV_REST_API_TOKEN;
          const key     = `ip_free:${ip}`;

          // Читаем текущий счётчик
          const getRes  = await fetch(`${kvUrl}/get/${key}`, {
            headers: { Authorization: `Bearer ${kvToken}` },
          });
          const { result: countRaw } = await getRes.json() as { result: string | null };
          const count = countRaw ? parseInt(countRaw, 10) : 0;

          if (count >= 3) {
            return NextResponse.json(
              { error: "Бесплатные генерации исчерпаны. Зарегистрируйтесь чтобы получить ещё." },
              { status: 402 }
            );
          }

          // Инкрементируем и ставим TTL 7 дней
          await fetch(`${kvUrl}/set/${key}/${count + 1}/EX/604800`, {
            method: "POST",
            headers: { Authorization: `Bearer ${kvToken}` },
          });
        } catch {
          // KV недоступен — fail-open (не блокируем пользователя)
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

    // B21: Гарантируем что AI не перезаписал цену и срок пользователя
    kp.price = price;
    kp.priceTotal = price;
    kp.deadline = deadline;

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
