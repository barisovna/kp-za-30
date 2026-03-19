import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-magic";
import {
  getUserHistory,
  updateHistoryItem,
  deleteHistoryItem,
  type ServerHistoryItem,
} from "@/lib/user-kv";

async function requireSession(request: NextRequest) {
  const sessionId = request.cookies.get("kp_session")?.value;
  if (!sessionId) return null;
  return await getSession(sessionId).catch(() => null);
}

/** GET — список КП пользователя */
export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const items = await getUserHistory(session.userId);
  return NextResponse.json({ items });
}

/** PATCH — обновить статус КП */
export async function PATCH(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { id, ...patch } = await request.json() as Partial<ServerHistoryItem> & { id: string };
  if (!id) return NextResponse.json({ error: "id обязателен" }, { status: 400 });

  await updateHistoryItem(session.userId, id, patch);
  return NextResponse.json({ ok: true });
}

/** DELETE — удалить КП */
export async function DELETE(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { id } = await request.json() as { id: string };
  if (!id) return NextResponse.json({ error: "id обязателен" }, { status: 400 });

  await deleteHistoryItem(session.userId, id);
  return NextResponse.json({ ok: true });
}
