// VOICE — голосовой ввод теперь работает через бесплатный Web Speech API
// (встроен в браузер Chrome/Edge, без API ключей)
// Этот серверный endpoint не используется — только информационный.

import { NextResponse } from "next/server";

const MSG = "Голосовой ввод работает прямо в браузере через Web Speech API. Используйте Chrome или Edge.";

export async function GET() {
  return NextResponse.json({ message: MSG }, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ error: MSG }, { status: 410 });
}
