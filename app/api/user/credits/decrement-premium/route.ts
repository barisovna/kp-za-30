/**
 * POST /api/user/credits/decrement-premium
 * [B01] Серверное списание premium-кредита при выборе VIP / Modern шаблона.
 *
 * Body:  { template: "vip" | "modern" }
 * Returns: { ok: true, credits: ServerCredits } | { error: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-magic";
import { getUserCredits, setUserCredits } from "@/lib/user-kv";

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get("kp_session")?.value;
  if (!sessionId) {
    // Гость — premium недоступен
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const session = await getSession(sessionId).catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Сессия недействительна" }, { status: 401 });
  }

  let body: { template?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const { template } = body;
  if (template !== "vip" && template !== "modern") {
    return NextResponse.json({ error: "Неверный шаблон" }, { status: 400 });
  }

  const credits = await getUserCredits(session.userId);

  // Проверяем доступ
  const isUnlimited =
    credits.plan === "active" ||
    credits.plan === "monthly" ||
    credits.plan === "yearly";
  const isStartWithCredits =
    credits.plan === "start" &&
    (template === "vip" ? credits.vipLeft !== 0 : credits.modernLeft !== 0);

  if (!isUnlimited && !isStartWithCredits) {
    return NextResponse.json({ error: "Нет premium-кредитов" }, { status: 403 });
  }

  // Для безлимитных планов кредиты не трогаем
  if (!isUnlimited && credits.plan === "start") {
    if (template === "vip" && credits.vipLeft > 0) {
      credits.vipLeft -= 1;
      await setUserCredits(session.userId, credits);
    } else if (template === "modern" && credits.modernLeft > 0) {
      credits.modernLeft -= 1;
      await setUserCredits(session.userId, credits);
    }
  }

  return NextResponse.json({ ok: true, credits });
}
