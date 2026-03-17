import { NextRequest, NextResponse } from "next/server";
import { generateKp } from "@/lib/deepseek";
import { parseKpResponse } from "@/lib/parseKpResponse";

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

    // Вызов DeepSeek
    const rawXml = await generateKp({ companyName, clientName, service, price, deadline, advantages, tone: tone || "official" });

    // Парсинг XML-ответа
    const kp = parseKpResponse(rawXml);

    return NextResponse.json({ kp });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
