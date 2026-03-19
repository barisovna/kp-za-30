/**
 * Серверное хранилище данных пользователя в Vercel KV.
 * userId = "user:email@example.com"
 */
import { kv } from "@vercel/kv";
import type { ParsedKp } from "@/lib/parseKpResponse";

// ── Тарифы / кредиты ──────────────────────────────────────────────────────────

export interface ServerCredits {
  plan: "free" | "start" | "active" | "monthly" | "yearly";
  totalLeft: number;   // осталось генераций (-1 = безлимит)
  vipLeft: number;     // осталось VIP (-1 = безлимит)
  modernLeft: number;  // осталось Современный (-1 = безлимит)
  expiresAt: number | null; // unix ms
}

const DEFAULT_CREDITS: ServerCredits = {
  plan: "free",
  totalLeft: 3,
  vipLeft: 0,
  modernLeft: 0,
  expiresAt: null,
};

export async function getUserCredits(userId: string): Promise<ServerCredits> {
  try {
    const raw = await kv.get<string>(`kp_credits:${userId}`);
    if (!raw) return { ...DEFAULT_CREDITS };
    const data = JSON.parse(raw) as ServerCredits;

    // Проверяем срок действия
    if (data.expiresAt && Date.now() > data.expiresAt) {
      const expired = { ...DEFAULT_CREDITS };
      await kv.set(`kp_credits:${userId}`, JSON.stringify(expired));
      return expired;
    }
    return data;
  } catch {
    return { ...DEFAULT_CREDITS };
  }
}

export async function setUserCredits(
  userId: string,
  credits: ServerCredits
): Promise<void> {
  await kv.set(`kp_credits:${userId}`, JSON.stringify(credits));
}

/** Списывает 1 кредит генерации. Возвращает false если кредитов нет. */
export async function decrementUserCredit(userId: string): Promise<boolean> {
  const credits = await getUserCredits(userId);

  if (credits.totalLeft === 0) return false;          // кончились
  if (credits.totalLeft > 0) credits.totalLeft -= 1; // -1 = безлимит, не трогаем

  await setUserCredits(userId, credits);
  return true;
}

/** Активирует план после оплаты. */
export async function activateUserPlan(
  userId: string,
  plan: ServerCredits["plan"],
  kps: number,      // -1 = безлимит
  vip: number,
  modern: number,
  daysValid: number
): Promise<void> {
  const expiresAt = Date.now() + daysValid * 24 * 60 * 60 * 1000;
  const credits: ServerCredits = {
    plan,
    totalLeft: kps,
    vipLeft: vip,
    modernLeft: modern,
    expiresAt,
  };
  await setUserCredits(userId, credits);
}

// ── История КП ────────────────────────────────────────────────────────────────

export interface ServerHistoryItem {
  id: string;
  title: string;
  createdAt: string;
  kp: ParsedKp;
  logo?: string;
  status?: "draft" | "sent" | "accepted" | "rejected";
}

const HISTORY_MAX = 20;

export async function getUserHistory(
  userId: string
): Promise<ServerHistoryItem[]> {
  try {
    const items = await kv.lrange(`kp_history:${userId}`, 0, HISTORY_MAX - 1);
    return items.map((item) =>
      typeof item === "string" ? JSON.parse(item) : item
    ) as ServerHistoryItem[];
  } catch {
    return [];
  }
}

export async function addToUserHistory(
  userId: string,
  item: ServerHistoryItem
): Promise<void> {
  await kv.lpush(`kp_history:${userId}`, JSON.stringify(item));
  await kv.ltrim(`kp_history:${userId}`, 0, HISTORY_MAX - 1);
}

export async function updateHistoryItem(
  userId: string,
  id: string,
  patch: Partial<ServerHistoryItem>
): Promise<void> {
  const items = await getUserHistory(userId);
  const updated = items.map((item) =>
    item.id === id ? { ...item, ...patch } : item
  );
  // Перезаписываем список
  await kv.del(`kp_history:${userId}`);
  if (updated.length > 0) {
    // lpush добавляет в начало — push в обратном порядке чтобы сохранить
    for (let i = updated.length - 1; i >= 0; i--) {
      await kv.lpush(`kp_history:${userId}`, JSON.stringify(updated[i]));
    }
  }
}

export async function deleteHistoryItem(
  userId: string,
  id: string
): Promise<void> {
  const items = await getUserHistory(userId);
  const updated = items.filter((item) => item.id !== id);
  await kv.del(`kp_history:${userId}`);
  for (let i = updated.length - 1; i >= 0; i--) {
    await kv.lpush(`kp_history:${userId}`, JSON.stringify(updated[i]));
  }
}
