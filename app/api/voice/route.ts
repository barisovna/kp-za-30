// VOICE — голосовой ввод теперь работает через бесплатный Web Speech API
// (встроен в браузер Chrome/Edge, без API ключей)
// Этот серверный endpoint не используется.

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Голосовой ввод работает прямо в браузере через Web Speech API. Используйте Chrome или Edge." },
    { status: 410 }
  );
}
