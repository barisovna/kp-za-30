// [F04] Партнёрская программа — реферальные ссылки
// Хранится в Vercel KV. Graceful degradation без KV.

import { kv } from "@vercel/kv";

export const REFERRAL_COMMISSION = 0.2; // 20% с каждой оплаты реферала
export const REFERRAL_COOKIE = "kp_ref";

// ── Типы ──────────────────────────────────────────────────────────────────────
export interface ReferralStats {
  code: string;
  email: string;          // email партнёра (для связи)
  clicks: number;
  conversions: number;    // число оплат от рефералов
  earned: number;         // накоплено ₽ (расчётно)
  createdAt: number;      // timestamp
}

// ── KV ключи ──────────────────────────────────────────────────────────────────
const key = {
  stats:    (code: string) => `ref:stats:${code}`,
  byEmail:  (email: string) => `ref:byemail:${email.toLowerCase()}`,
  allCodes: () => "ref:all_codes",
};

// ── Генерация кода ────────────────────────────────────────────────────────────
export function generateCode(email: string): string {
  const prefix = email.split("@")[0].replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase();
  const rand   = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${rand}`;
}

// ── Зарегистрировать партнёра ─────────────────────────────────────────────────
export async function createReferral(email: string): Promise<ReferralStats | null> {
  try {
    // Проверить не зарегистрирован ли уже
    const existing = await kv.get<string>(key.byEmail(email));
    if (existing) {
      return kv.get<ReferralStats>(key.stats(existing));
    }

    const code  = generateCode(email);
    const stats: ReferralStats = {
      code,
      email,
      clicks: 0,
      conversions: 0,
      earned: 0,
      createdAt: Date.now(),
    };

    await kv.set(key.stats(code), stats);
    await kv.set(key.byEmail(email), code);

    // Добавляем код в общий список
    const all = await kv.get<string[]>(key.allCodes()) ?? [];
    await kv.set(key.allCodes(), [...all, code]);

    return stats;
  } catch {
    return null;
  }
}

// ── Получить статистику по коду ───────────────────────────────────────────────
export async function getReferralStats(code: string): Promise<ReferralStats | null> {
  try {
    return kv.get<ReferralStats>(key.stats(code));
  } catch {
    return null;
  }
}

// ── Получить код по email ─────────────────────────────────────────────────────
export async function getReferralByEmail(email: string): Promise<ReferralStats | null> {
  try {
    const code = await kv.get<string>(key.byEmail(email.toLowerCase()));
    if (!code) return null;
    return kv.get<ReferralStats>(key.stats(code));
  } catch {
    return null;
  }
}

// ── Засчитать клик ────────────────────────────────────────────────────────────
export async function trackClick(code: string): Promise<void> {
  try {
    const stats = await kv.get<ReferralStats>(key.stats(code));
    if (!stats) return;
    stats.clicks++;
    await kv.set(key.stats(code), stats);
  } catch {}
}

// ── Засчитать конверсию (оплату реферала) ─────────────────────────────────────
export async function trackConversion(code: string, amountRub: number): Promise<void> {
  try {
    const stats = await kv.get<ReferralStats>(key.stats(code));
    if (!stats) return;
    stats.conversions++;
    stats.earned += Math.round(amountRub * REFERRAL_COMMISSION);
    await kv.set(key.stats(code), stats);
  } catch {}
}

// ── Список всех партнёров (для админки) ───────────────────────────────────────
export async function listAllReferrals(): Promise<ReferralStats[]> {
  try {
    const codes = await kv.get<string[]>(key.allCodes()) ?? [];
    const results = await Promise.all(codes.map((c) => kv.get<ReferralStats>(key.stats(c))));
    return results.filter(Boolean) as ReferralStats[];
  } catch {
    return [];
  }
}
