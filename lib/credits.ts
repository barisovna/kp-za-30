// [F01] Вариант A — «Пакетная модель»
// Единый модуль управления кредитами и тарифами

export type PlanType = "free" | "start" | "active" | "unlimited" | "yearly";
export type Template  = "classic" | "modern" | "minimal" | "vip";

// ── localStorage ключи ────────────────────────────────────────────────────────
export const LS = {
  FREE:    "kp_free_count",     // осталось бесплатных КП
  PAID:    "kp_paid_credits",   // оплаченные кредиты
  PLAN:    "kp_plan",           // тип плана
  VIP:     "kp_vip_credits",    // доступные VIP-шаблоны (-1 = безлимит)
  MODERN:  "kp_modern_credits", // доступные Modern-шаблоны (-1 = безлимит)
  EXPIRES: "kp_plan_expires",   // timestamp истечения пакета
} as const;

export const FREE_KP_LIMIT = 3;

// ── Описания планов ──────────────────────────────────────────────────────────
export const PLANS = {
  start: {
    name: "Пакет «Старт»",
    price: "199 ₽",
    priceNum: 199,
    kps: 10,
    vip: 3,
    modern: 3,
    daysValid: 60,
    highlight: false,
    badge: null as string | null,
    perKp: "≈20 ₽/КП",
    features: [
      "10 коммерческих предложений",
      "3 КП в ВИП-шаблоне",
      "3 КП в Современном шаблоне",
      "Действует 60 дней",
    ],
  },
  active: {
    name: "Пакет «Активный»",
    price: "490 ₽",
    priceNum: 490,
    kps: 30,
    vip: -1,
    modern: -1,
    daysValid: 90,
    highlight: true,
    badge: "ВЫГОДНО",
    perKp: "≈16 ₽/КП",
    features: [
      "30 коммерческих предложений",
      "Все 4 шаблона без ограничений",
      "Действует 90 дней",
      "Приоритет генерации",
    ],
  },
  monthly: {
    name: "Подписка «Безлимит»",
    price: "790 ₽/мес",
    priceNum: 790,
    kps: -1,
    vip: -1,
    modern: -1,
    daysValid: 30,
    highlight: false,
    badge: null as string | null,
    perKp: "∞ КП",
    features: [
      "Безлимитные КП весь месяц",
      "Все 4 шаблона",
      "Годовая: 6 490 ₽ (−32%)",
      "Отмена в любой момент",
    ],
  },
  // [F02] Годовая подписка
  yearly: {
    name: "Подписка «Безлимит» — год",
    price: "6 490 ₽/год",
    priceNum: 6490,
    kps: -1,
    vip: -1,
    modern: -1,
    daysValid: 365,
    highlight: true,
    badge: "−32%" as string | null,
    perKp: "∞ КП · 541 ₽/мес",
    features: [
      "Безлимитные КП на 365 дней",
      "Все 4 шаблона без ограничений",
      "Экономия 1 900 ₽ vs месячной",
      "Один платёж — год без забот",
    ],
  },
} as const;

// ── Типы ──────────────────────────────────────────────────────────────────────
export interface Credits {
  plan: PlanType;
  totalLeft: number;      // оставшихся КП (99999 = безлимит)
  vipLeft: number;        // -1 = безлимит
  modernLeft: number;     // -1 = безлимит
  expiresAt: number | null;
  isExpired: boolean;
}

// ── Чтение состояния ─────────────────────────────────────────────────────────
export function getCredits(): Credits {
  if (typeof window === "undefined") {
    return { plan: "free", totalLeft: FREE_KP_LIMIT, vipLeft: 0, modernLeft: 0, expiresAt: null, isExpired: false };
  }

  const rawPlan  = localStorage.getItem(LS.PLAN) || "free";
  // Нормализуем legacy-значение: до рефакторинга applyPayment сохранял "monthly",
  // теперь сохраняет "unlimited". Исправляем старые данные при чтении.
  const plan     = (rawPlan === "monthly" ? "unlimited" : rawPlan) as PlanType;
  const expiresRaw = localStorage.getItem(LS.EXPIRES);
  const expiresAt  = expiresRaw ? parseInt(expiresRaw, 10) : null;
  const isExpired  = expiresAt != null && Date.now() > expiresAt;

  // Пакет/подписка истекла — ведём себя как free
  const effectivePlan: PlanType = isExpired ? "free" : plan;

  let totalLeft: number;
  if (effectivePlan === "free") {
    const stored = localStorage.getItem(LS.FREE);
    if (stored === null) {
      // Первый запуск — инициализируем 3 бесплатных КП.
      // Сервер — единственный авторитет для лимитов; клиент показывает лишь UX.
      totalLeft = FREE_KP_LIMIT;
      localStorage.setItem(LS.FREE, String(totalLeft));
    } else {
      totalLeft = parseInt(stored, 10);
    }
  } else if (effectivePlan === "unlimited" || effectivePlan === "yearly") {
    // "yearly" — legacy-значение; applyPayment сохраняет "unlimited",
    // но старые данные могут содержать "yearly" напрямую.
    totalLeft = 99999;
  } else {
    totalLeft = parseInt(localStorage.getItem(LS.PAID) || "0", 10);
  }

  const vipLeft    = isExpired ? 0 : parseInt(localStorage.getItem(LS.VIP)    || "0", 10);
  const modernLeft = isExpired ? 0 : parseInt(localStorage.getItem(LS.MODERN) || "0", 10);

  return { plan: effectivePlan, totalLeft, vipLeft, modernLeft, expiresAt, isExpired };
}

// ── Проверка доступности шаблона ─────────────────────────────────────────────
export function canUseTemplate(template: Template, credits?: Credits): boolean {
  const c = credits ?? getCredits();
  if (template === "classic" || template === "minimal") return true;
  if (c.plan === "free") return false;
  if (c.plan === "active" || c.plan === "unlimited" || c.plan === "yearly") return true;
  // start — проверяем кредиты конкретного шаблона
  if (template === "vip")    return c.vipLeft !== 0;
  if (template === "modern") return c.modernLeft !== 0;
  return false;
}

// ── Применить покупку ─────────────────────────────────────────────────────────
export function applyPayment(plan: "start" | "active" | "monthly" | "yearly"): void {
  const def = PLANS[plan];
  const effectivePlan: PlanType = (plan === "monthly" || plan === "yearly") ? "unlimited" : plan;
  localStorage.setItem(LS.PLAN, effectivePlan);
  localStorage.setItem(LS.PAID, String(def.kps === -1 ? 99999 : def.kps));
  localStorage.setItem(LS.VIP,    String(def.vip));
  localStorage.setItem(LS.MODERN, String(def.modern));
  localStorage.setItem(LS.EXPIRES, String(Date.now() + def.daysValid * 24 * 60 * 60 * 1000));
  localStorage.removeItem(LS.FREE);
}

// ── Списать 1 кредит генерации ────────────────────────────────────────────────
export function decrementCredit(): void {
  const { plan } = getCredits();
  if (plan === "free") {
    const cur = parseInt(localStorage.getItem(LS.FREE) || "0", 10);
    localStorage.setItem(LS.FREE, String(Math.max(0, cur - 1)));
  } else if (plan !== "unlimited" && plan !== "yearly") {
    const cur = parseInt(localStorage.getItem(LS.PAID) || "0", 10);
    if (cur > 0 && cur < 99999) localStorage.setItem(LS.PAID, String(cur - 1));
  }
}

// ── Списать premium-кредит при выборе VIP/Modern шаблона ─────────────────────
export function decrementPremiumCredit(template: "vip" | "modern"): void {
  const key = template === "vip" ? LS.VIP : LS.MODERN;
  const cur = parseInt(localStorage.getItem(key) || "0", 10);
  if (cur > 0) localStorage.setItem(key, String(cur - 1));
  // -1 (безлимит) — не трогаем
}

// ── Название плана для UI ─────────────────────────────────────────────────────
export function planLabel(plan: PlanType): string {
  const map: Record<PlanType, string> = {
    free:      "Бесплатно",
    start:     "Старт",
    active:    "Активный",
    unlimited: "Безлимит",
    yearly:    "Безлимит (год)",
  };
  return map[plan];
}
