/**
 * GET /api/kp/[id]
 * Возвращает конкретное КП из истории пользователя по ID.
 * Используется страницей /result для восстановления результата после обновления страницы.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-magic";
import { getUserHistory } from "@/lib/user-kv";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = request.cookies.get("kp_session")?.value;
  if (!sessionId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const session = await getSession(sessionId).catch(() => null);
  if (!session) return NextResponse.json({ error: "Сессия недействительна" }, { status: 401 });

  const history = await getUserHistory(session.userId);
  const item = history.find((h) => h.id === params.id);

  if (!item) return NextResponse.json({ error: "КП не найдено" }, { status: 404 });

  return NextResponse.json({ item });
}
