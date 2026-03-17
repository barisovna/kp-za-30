// [F14] Демо-генерация КП без регистрации — только первые 2 абзаца
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { service, client } = await request.json();

    if (!service?.trim()) {
      return NextResponse.json({ error: "Укажи услугу" }, { status: 400 });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: "API не настроен" }, { status: 500 });
    }

    const prompt = `Напиши ТОЛЬКО первые два абзаца коммерческого предложения (не более 120 слов).
Услуга: ${service}
Клиент: ${client || "потенциальный клиент"}

Требования: профессиональный деловой тон, конкретика, без заголовков и XML.
Просто два коротких абзаца текста КП — обращение и краткое описание предложения.`;

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 200,
        stream: true,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Ошибка генерации" }, { status: 500 });
    }

    // Проксируем стриминг напрямую
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return NextResponse.json({ error: "Что-то пошло не так" }, { status: 500 });
  }
}
