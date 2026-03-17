// [F05] Триггерные уведомления — утилиты клиентской стороны

// ── localStorage ключи ────────────────────────────────────────────────────────
export const NLS = {
  LAST_KP:          "kp_last_generated",       // ISO timestamp последней генерации
  REMINDER_EMAIL:   "kp_reminder_email",        // email пользователя для уведомлений
  TIP_SHOWN:        "kp_daily_tip_shown",       // "YYYY-MM-DD" — когда показан совет дня
  EMAIL_DISMISSED:  "kp_email_capture_skip",    // "1" если отказался от email-напоминалок
  BANNER_DISMISSED: "kp_inactivity_banner_dismissed", // "YYYY-MM-DD" — скрыл баннер сегодня
} as const;

// ── Дата последней генерации ──────────────────────────────────────────────────
export function updateLastKpDate(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NLS.LAST_KP, new Date().toISOString());
}

export function getInactivityDays(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(NLS.LAST_KP);
  if (!raw) return 0;
  const diff = Date.now() - new Date(raw).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ── Совет дня (показываем 1 раз в сутки после генерации) ─────────────────────
export function shouldShowDailyTip(): boolean {
  if (typeof window === "undefined") return false;
  const shown = localStorage.getItem(NLS.TIP_SHOWN);
  const today = new Date().toISOString().slice(0, 10);
  return shown !== today;
}

export function markDailyTipShown(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NLS.TIP_SHOWN, new Date().toISOString().slice(0, 10));
}

// ── Email-напоминалки ─────────────────────────────────────────────────────────
export function getReminderEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NLS.REMINDER_EMAIL);
}

export function isEmailCaptureDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(NLS.EMAIL_DISMISSED) === "1";
}

export function dismissEmailCapture(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NLS.EMAIL_DISMISSED, "1");
}

export function saveReminderEmail(email: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NLS.REMINDER_EMAIL, email);
}

// ── Баннер неактивности ───────────────────────────────────────────────────────
export function isBannerDismissedToday(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(NLS.BANNER_DISMISSED);
  const today = new Date().toISOString().slice(0, 10);
  return raw === today;
}

export function dismissBannerToday(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NLS.BANNER_DISMISSED, new Date().toISOString().slice(0, 10));
}

// ── Тип активного баннера ─────────────────────────────────────────────────────
export type BannerType = "inactivity7" | "inactivity14" | "expiry3" | null;

export function getActiveBanner(
  inactivityDays: number,
  expiresAt: number | null,
): BannerType {
  if (isBannerDismissedToday()) return null;
  // Истечение подписки — высший приоритет
  if (expiresAt) {
    const daysLeft = Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0 && daysLeft <= 3) return "expiry3";
  }
  if (inactivityDays >= 14) return "inactivity14";
  if (inactivityDays >= 7)  return "inactivity7";
  return null;
}
