// VOICE — голосовой ввод через OpenAI Whisper API
// POST /api/voice — принимает audio/webm blob → возвращает { text }
// Graceful degradation: без OPENAI_API_KEY возвращает ошибку с подсказкой

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // нужен для работы с FormData и Buffer

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Голосовой ввод не настроен. Добавьте OPENAI_API_KEY в Vercel → Settings → Environment Variables",
      },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "Аудиофайл не передан" }, { status: 400 });
    }

    // Проверка размера (макс 25 MB — лимит Whisper)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Запись слишком длинная. Говорите короче (до 1 минуты)" },
        { status: 400 }
      );
    }

    // Отправляем в Whisper
    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, "audio.webm");
    whisperForm.append("model", "whisper-1");
    whisperForm.append("language", "ru");
    whisperForm.append("response_format", "json");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Voice] Whisper error:", errText);
      return NextResponse.json(
        { error: "Ошибка распознавания речи. Попробуйте ещё раз." },
        { status: 502 }
      );
    }

    const data = await res.json() as { text: string };
    return NextResponse.json({ text: data.text?.trim() ?? "" });
  } catch (err) {
    console.error("[Voice] error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
