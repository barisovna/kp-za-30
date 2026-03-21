/**
 * POST /api/user/reset-credits
 * Сбрасывает кредиты пользователя на бесплатный план (3 КП).
 * Используется для тестирования free-флоу.
 * В проде: ограничить доступ (например, только для admins или убрать совсем).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-magic";
import { setUserCredits } from "@/lib/user-kv";

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("kp_session")?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const session = await getSession(sessionId).catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Сессия не найдена" }, { status: 401 });
  }

  await setUserCredits(session.userId, {
    plan: "free",
    totalLeft: 3,
    vipLeft: 0,
    modernLeft: 0,
    expiresAt: null,
  });

  return NextResponse.json({ success: true, message: "Кредиты сброшены на free (3 КП)" });
}
