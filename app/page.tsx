"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { KpTone } from "@/lib/deepseek";
import type { ParsedKp } from "@/lib/parseKpResponse";
import {
  getCredits, applyPayment, decrementCredit,
  planLabel, PLANS,
  type Credits,
} from "@/lib/credits";
import {
  updateLastKpDate, getInactivityDays, getReminderEmail,
  shouldShowDailyTip, markDailyTipShown,
  isEmailCaptureDismissed, dismissEmailCapture, saveReminderEmail,
  getActiveBanner, dismissBannerToday,
  type BannerType,
} from "@/lib/notifications";

// ─── [F01] Paywall Modal — Вариант A «Пакетная модель» ───────────────────────
function PaywallModal({ onClose, onPaid, reason }: {
  onClose: () => void;
  onPaid: () => void;
  reason?: "limit" | "template";
}) {
  const [loading, setLoading] = useState<"start" | "active" | "monthly" | "yearly" | null>(null);
  const [error, setError]     = useState<string | null>(null);
  // [F02] Переключатель месяц / год
  const [billingYearly, setBillingYearly] = useState(false);

  const pay = async (plan: "start" | "active" | "monthly" | "yearly") => {
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/payment/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json() as { success: boolean; message: string };
      if (!data.success) throw new Error("Ошибка оплаты");
      applyPayment(plan);
      onPaid();
    } catch {
      setError("Не удалось провести оплату. Попробуй ещё раз.");
    } finally {
      setLoading(null);
    }
  };

  const title = reason === "template"
    ? "Этот шаблон — в платных пакетах"
    : "Бесплатные КП закончились";
  const subtitle = reason === "template"
    ? "ВИП и Современный шаблоны доступны с любым платным пакетом"
    : "Ты использовал все 3 бесплатных КП. Выбери пакет:";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>

        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-[#f59e0b]/10 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">
            {reason === "template" ? "🎨" : "🔒"}
          </div>
          <h2 className="text-xl font-bold font-heading text-[#1e293b]">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>

        {/* Бесплатный план — сравнение */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-xs text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">Бесплатно (текущий)</p>
          <div className="flex gap-4">
            <span>✅ 3 КП</span>
            <span>✅ Классика + Минимализм</span>
            <span>❌ ВИП и Современный</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          {/* Пакет Старт */}
          <div className="border-2 border-[#f59e0b] rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-bold text-[#1e293b]">{PLANS.start.name}</p>
                <p className="text-xs text-gray-500">{PLANS.start.perKp} · действует {PLANS.start.daysValid} дней</p>
              </div>
              <p className="text-2xl font-bold text-[#1e3a5f]">{PLANS.start.price}</p>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 mb-3">
              {PLANS.start.features.map((f) => (
                <li key={f} className="flex items-center gap-1.5"><span className="text-[#10b981]">✓</span>{f}</li>
              ))}
            </ul>
            <button
              onClick={() => pay("start")}
              disabled={loading !== null}
              className="w-full bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-gray-200 text-white font-bold py-2.5 rounded-xl text-sm transition"
            >
              {loading === "start" ? "Обрабатываем…" : `Купить за ${PLANS.start.price}`}
            </button>
          </div>

          {/* Пакет Активный */}
          <div className="border-2 border-[#1e3a5f] rounded-2xl p-4 relative">
            <div className="absolute -top-3 left-4">
              <span className="bg-[#10b981] text-white text-[10px] font-bold px-3 py-1 rounded-full">{PLANS.active.badge}</span>
            </div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-bold text-[#1e293b]">{PLANS.active.name}</p>
                <p className="text-xs text-gray-500">{PLANS.active.perKp} · {PLANS.active.daysValid} дней</p>
              </div>
              <p className="text-2xl font-bold text-[#1e3a5f]">{PLANS.active.price}</p>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 mb-3">
              {PLANS.active.features.map((f) => (
                <li key={f} className="flex items-center gap-1.5"><span className="text-[#10b981]">✓</span>{f}</li>
              ))}
            </ul>
            <button
              onClick={() => pay("active")}
              disabled={loading !== null}
              className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] disabled:bg-gray-200 text-white font-bold py-2.5 rounded-xl text-sm transition"
            >
              {loading === "active" ? "Обрабатываем…" : `Купить за ${PLANS.active.price}`}
            </button>
          </div>

          {/* [F02] Подписка Безлимит с переключателем мес/год */}
          <div className="border border-gray-200 rounded-2xl p-4">
            {/* Toggle */}
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-[#1e293b]">Подписка «Безлимит»</p>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setBillingYearly(false)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md transition ${!billingYearly ? "bg-white shadow text-[#1e3a5f]" : "text-gray-500"}`}
                >
                  Мес
                </button>
                <button
                  onClick={() => setBillingYearly(true)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md transition flex items-center gap-1 ${billingYearly ? "bg-white shadow text-[#1e3a5f]" : "text-gray-500"}`}
                >
                  Год
                  <span className="bg-[#10b981] text-white text-[9px] font-bold px-1 py-0.5 rounded-full">−32%</span>
                </button>
              </div>
            </div>
            {/* Цена */}
            <div className="flex items-end gap-2 mb-1">
              <p className="text-2xl font-bold text-[#1e3a5f]">
                {billingYearly ? "6 490 ₽" : "790 ₽"}
              </p>
              <p className="text-sm text-gray-400 mb-0.5">
                {billingYearly ? "/год" : "/мес"}
              </p>
              {billingYearly && (
                <p className="text-xs text-[#10b981] font-semibold mb-0.5">= 541 ₽/мес</p>
              )}
            </div>
            {billingYearly && (
              <div className="bg-[#10b981]/10 text-[#10b981] text-xs font-semibold px-3 py-1.5 rounded-lg mb-3 flex items-center gap-1">
                🎉 Экономия 1 900 ₽ по сравнению с месячной
              </div>
            )}
            <ul className="text-xs text-gray-600 space-y-1 mb-3">
              {(billingYearly ? PLANS.yearly : PLANS.monthly).features.map((f) => (
                <li key={f} className="flex items-center gap-1.5"><span className="text-[#10b981]">✓</span>{f}</li>
              ))}
            </ul>
            <button
              onClick={() => pay(billingYearly ? "yearly" : "monthly")}
              disabled={loading !== null}
              className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-200 text-white font-bold py-2.5 rounded-xl text-sm transition"
            >
              {loading === "monthly" || loading === "yearly"
                ? "Обрабатываем…"
                : billingYearly
                  ? "Купить на год за 6 490 ₽"
                  : "Подключить за 790 ₽/мес"}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-500 text-center mb-2">{error}</p>}
        <p className="text-center text-xs text-gray-400">🔒 Платежи через ЮКасса · СБП · Данные карты не хранятся</p>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

interface HistoryItem {
  id: string;
  title: string;
  createdAt: string;
  kp: ParsedKp;
  logo?: string;
}

interface KpFormData {
  companyName: string;
  clientName: string;
  service: string;
  price: string;
  deadline: string;
  advantages: string;
  tone: KpTone;
}

// ─── [F05] NotificationBanner — баннер неактивности / истечения подписки ─────
const BANNER_CONFIG: Record<NonNullable<BannerType>, { icon: string; text: string; cta: string; color: string }> = {
  inactivity7:  { icon: "💬", text: "Прошло 7 дней. Клиент всё ещё ждёт твоего КП?", cta: "Создать КП →", color: "bg-[#f59e0b]" },
  inactivity14: { icon: "📊", text: "14 дней без КП. Ты упускаешь потенциальных клиентов.", cta: "Создать КП →", color: "bg-orange-500" },
  expiry3:      { icon: "⏰", text: "Подписка заканчивается через 3 дня. Продли сейчас!", cta: "Продлить →", color: "bg-red-500" },
};

function NotificationBanner({ type, onDismiss, onCta }: {
  type: NonNullable<BannerType>;
  onDismiss: () => void;
  onCta: () => void;
}) {
  const cfg = BANNER_CONFIG[type];
  return (
    <div className={`${cfg.color} text-white px-4 py-2.5 flex items-center justify-between gap-3 print:hidden`}>
      <span className="text-sm flex items-center gap-2">
        <span>{cfg.icon}</span>
        <span>{cfg.text}</span>
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onCta}
          className="bg-white/20 hover:bg-white/30 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition"
        >
          {cfg.cta}
        </button>
        <button onClick={onDismiss} className="text-white/70 hover:text-white text-lg leading-none">✕</button>
      </div>
    </div>
  );
}

// ─── [F05] EmailCaptureModal — захват email после первого КП ─────────────────
function EmailCaptureModal({ onClose, plan, planExpires }: {
  onClose: () => void;
  plan: string;
  planExpires: number | null;
}) {
  const [email, setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), plan, planExpires }),
      });
      if (!res.ok) throw new Error("server");
      saveReminderEmail(email.trim());
      setDone(true);
      setTimeout(onClose, 2000);
    } catch {
      setError("Не удалось сохранить. Попробуй позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button onClick={() => { dismissEmailCapture(); onClose(); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>
        {done ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-bold text-[#1e293b]">Готово! Напомним когда надо</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🔔</div>
              <h3 className="font-bold text-[#1e293b] text-lg">Хочешь напоминания?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Пришлём письмо, если долго не создаёшь КП — чтобы не упустить клиентов
              </p>
            </div>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="твой@email.ru"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-bold py-2.5 rounded-xl text-sm transition"
              >
                {loading ? "Сохраняем…" : "Включить напоминания"}
              </button>
              <button
                type="button"
                onClick={() => { dismissEmailCapture(); onClose(); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Не надо, я сам не забуду
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── [F05] DailyTipModal — совет по отправке после генерации ─────────────────
const SENDING_TIPS = [
  { icon: "📧", title: "Тема письма решает всё", tip: "Напиши в теме: «КП для [имя клиента] — разработка сайта». Персонализация увеличивает открытие в 2 раза." },
  { icon: "⏰", title: "Лучшее время — вторник-четверг", tip: "Отправляй КП в 9:30–11:00 или 14:00–16:00. Избегай пятницу и понедельник утро." },
  { icon: "📞", title: "Позвони через 2 дня", tip: "После отправки КП позвони или напиши: «Получили наше предложение? Есть вопросы?» — это увеличивает конверсию на 40%." },
  { icon: "✏️", title: "Первая строка письма", tip: "Начни с конкретики: «Добрый день, [Имя]! Как обсуждали на встрече, направляем КП на разработку сайта.»" },
];

function DailyTipModal({ onClose }: { onClose: () => void }) {
  const tip = SENDING_TIPS[new Date().getDay() % SENDING_TIPS.length];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">{tip.icon}</div>
          <p className="text-xs font-bold text-[#f59e0b] uppercase tracking-wide mb-1">Совет дня</p>
          <h3 className="font-bold text-[#1e293b] text-lg">{tip.title}</h3>
        </div>
        <div className="bg-[#f8fafc] rounded-xl p-4 mb-4">
          <p className="text-sm text-[#1e293b] leading-relaxed">{tip.tip}</p>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-bold py-2.5 rounded-xl text-sm transition"
        >
          Понятно, спасибо!
        </button>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── [F14] Демо-блок ────────────────────────────────────────────────────────
const DEMO_SERVICES = [
  "Разработка сайта", "SMM-продвижение", "Дизайн логотипа",
  "Бухгалтерские услуги", "Юридическая консультация", "SEO-оптимизация",
];

function DemoBlock() {
  const [service, setService] = useState("");
  const [client, setClient] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [used, setUsed] = useState(false);

  const generate = useCallback(async () => {
    if (!service.trim()) return;
    if (used) { setShowCta(true); return; }

    setLoading(true);
    setPreview("");
    setShowCta(false);

    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, client }),
      });

      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const chunk = json.choices?.[0]?.delta?.content ?? "";
            if (chunk) setPreview((p) => p + chunk);
          } catch { /* skip */ }
        }
      }

      setUsed(true);
      setShowCta(true);
    } catch {
      setPreview("Не удалось сгенерировать демо. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  }, [service, client, used]);

  return (
    <section className="px-6 -mt-8 mb-2">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-6 border-2 border-[#f59e0b]/30">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#f59e0b] text-lg">⚡</span>
          <h2 className="font-bold font-heading text-[#1e293b] text-base">Попробуй прямо сейчас — без регистрации</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">Введи услугу — увидишь фрагмент настоящего КП</p>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="flex-1">
            <input
              value={service}
              onChange={(e) => setService(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              list="demo-services"
              placeholder="Ваша услуга (напр. разработка сайта)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/50"
            />
            <datalist id="demo-services">
              {DEMO_SERVICES.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="flex-1">
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              placeholder="Тип клиента (необязательно)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/50"
            />
          </div>
          <button
            onClick={generate}
            disabled={loading || !service.trim()}
            className="bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl text-sm transition whitespace-nowrap"
          >
            {loading ? "Генерирую…" : "Показать пример"}
          </button>
        </div>

        {preview && (
          <div className="bg-[#f8fafc] rounded-xl p-4 text-sm text-[#1e293b] leading-relaxed whitespace-pre-wrap border border-gray-100 mb-3">
            {preview}
            {loading && <span className="animate-pulse text-[#f59e0b]">|</span>}
            {!loading && <span className="text-gray-300"> …</span>}
          </div>
        )}

        {showCta && !loading && (
          <div className="bg-[#1e3a5f]/5 rounded-xl p-4 text-center">
            <p className="text-sm font-semibold text-[#1e293b] mb-2">
              {used && preview ? "Нравится? Получи полное КП — бесплатно!" : "Хочешь полное КП?"}
            </p>
            <button
              onClick={() => {
                const formEl = document.getElementById("kp-form");
                formEl?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-[#f59e0b] text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-[#d97706] transition"
            >
              ⚡ Создать полное КП бесплатно
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
// ────────────────────────────────────────────────────────────────────────────

const TONE_OPTIONS: { value: KpTone; label: string; hint: string }[] = [
  { value: "official", label: "Официальный", hint: "Строго и профессионально" },
  { value: "friendly", label: "Дружелюбный", hint: "Тепло и по-партнёрски" },
  { value: "aggressive", label: "Агрессивный", hint: "Давление и срочность" },
];

// [F07] Пример данных для онбординга новых пользователей
const ONBOARDING_EXAMPLE: KpFormData = {
  companyName: "Студия «Пиксель»",
  clientName: 'ООО "Мегастрой"',
  service: "Разработка корпоративного сайта",
  price: "85 000 ₽",
  deadline: "21 день",
  advantages: "Опыт 7 лет, 150+ сайтов, гарантия 12 месяцев, поддержка 24/7, SEO-оптимизация в подарок",
  tone: "official",
};

export default function HomePage() {
  const [formData, setFormData] = useState<KpFormData>({
    companyName: "",
    clientName: "",
    service: "",
    price: "",
    deadline: "",
    advantages: "",
    tone: "official",
  });
  const [isOnboardingExample, setIsOnboardingExample] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [kpCount, setKpCount] = useState<number>(847);
  // [F01] Кредиты и Paywall
  const [credits, setCredits] = useState<Credits>({
    plan: "free", totalLeft: 3, vipLeft: 0, modernLeft: 0, expiresAt: null, isExpired: false,
  });
  const [showPaywall, setShowPaywall] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  // [F05] Уведомления
  const [activeBanner, setActiveBanner]   = useState<BannerType>(null);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [showDailyTip, setShowDailyTip]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // VOICE — голосовой ввод через бесплатный Web Speech API (встроен в браузер)
  const [voiceField, setVoiceField] = useState<keyof KpFormData | null>(null);
  const recognitionRef = useRef<any>(null); // Web Speech API не имеет типов в TS

  useEffect(() => {
    const raw = localStorage.getItem("kp_history");
    if (raw) setHistory(JSON.parse(raw));
    // Загружаем текущего пользователя
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.user) setUser(d.user);
    }).catch(() => {});
    // [F13] Загружаем счётчик КП
    fetch("/api/counter").then((r) => r.json()).then((d) => {
      if (d.count) setKpCount(d.count);
    }).catch(() => {});
    // [F07] Первое посещение — предзаполняем форму примером
    if (!localStorage.getItem("kp_onboarded")) {
      setFormData(ONBOARDING_EXAMPLE);
      setIsOnboardingExample(true);
    }
    // [F01] Загружаем кредиты
    const c = getCredits();
    setCredits(c);
    // [F05] Проверяем баннер неактивности / истечения подписки
    const days = getInactivityDays();
    setActiveBanner(getActiveBanner(days, c.expiresAt));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    // [F07] Первое изменение — убираем подсказку "это пример"
    if (isOnboardingExample) setIsOnboardingExample(false);
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Логотип не должен превышать 2 МБ");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  // VOICE: Бесплатный Web Speech API — встроен в Chrome/Edge, без ключей
  const startVoice = (fieldName: keyof KpFormData) => {
    // Если уже пишем — останавливаем
    if (voiceField === fieldName) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // Web Speech API
    if (!SpeechAPI) {
      setError("Голосовой ввод работает только в Chrome или Edge. Откройте сайт в Chrome.");
      return;
    }

    const recognition = new SpeechAPI();
    recognition.lang = "ru-RU";
    recognition.continuous = false;    // одна фраза → стоп
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onresult = (e: { results: { 0: { 0: { transcript: string } } } }) => {
      const text = e.results[0][0].transcript;
      if (isOnboardingExample) setIsOnboardingExample(false);
      setFormData((prev) => ({ ...prev, [fieldName]: text }));
    };

    recognition.onerror = (e: { error: string }) => {
      if (e.error !== "aborted") {
        setError("Не удалось распознать речь. Говорите чётче или проверьте микрофон.");
      }
      setVoiceField(null);
    };

    recognition.onend = () => { setVoiceField(null); };

    setVoiceField(fieldName);
    recognition.start();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // [F01] Проверяем лимит
    const cur = getCredits();
    if (cur.totalLeft <= 0) {
      setShowPaywall(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка генерации");
      }

      sessionStorage.setItem("kp_result", JSON.stringify(data.kp));
      if (logoPreview) {
        sessionStorage.setItem("kp_logo", logoPreview);
      } else {
        sessionStorage.removeItem("kp_logo");
      }

      // Сохраняем в историю localStorage (последние 5)
      const historyRaw = localStorage.getItem("kp_history");
      const history: HistoryItem[] = historyRaw ? JSON.parse(historyRaw) : [];
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        title: data.kp.title,
        createdAt: new Date().toLocaleDateString("ru-RU"),
        kp: data.kp,
        logo: logoPreview || undefined,
      };
      const updated = [newItem, ...history].slice(0, 20);
      localStorage.setItem("kp_history", JSON.stringify(updated));

      // [F07] Отмечаем что онбординг пройден
      localStorage.setItem("kp_onboarded", "1");

      // [F01] Списываем 1 кредит генерации
      decrementCredit();
      setCredits(getCredits());

      // [F05] Обновляем дату последней генерации
      updateLastKpDate();

      // [F05] Обновляем дату в KV если есть email
      const reminderEmail = getReminderEmail();
      if (reminderEmail) {
        fetch("/api/notifications/subscribe", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: reminderEmail }),
        }).catch(() => {});
      }

      // [F05] Показать email-захват после первого КП (приоритет выше совета дня)
      const historyCount = JSON.parse(localStorage.getItem("kp_history") || "[]").length;
      if (historyCount === 1 && !isEmailCaptureDismissed() && !getReminderEmail()) {
        setShowEmailCapture(true);
        setIsLoading(false);
        return;
      }

      // [F05] Показать совет дня перед переходом (если не показывали сегодня)
      if (shouldShowDailyTip()) {
        markDailyTipShown();
        setShowDailyTip(true);
        setIsLoading(false);
        return; // Переход на /result — после закрытия совета (см. DailyTipModal onClose)
      }

      window.location.href = "/result";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Что-то пошло не так");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      {/* [F01] Paywall Modal */}
      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onPaid={() => { setCredits(getCredits()); setShowPaywall(false); }}
        />
      )}
      {/* [F05] Email capture после первого КП */}
      {showEmailCapture && (
        <EmailCaptureModal
          plan={credits.plan}
          planExpires={credits.expiresAt}
          onClose={() => { setShowEmailCapture(false); window.location.href = "/result"; }}
        />
      )}
      {/* [F05] Совет дня */}
      {showDailyTip && (
        <DailyTipModal
          onClose={() => { setShowDailyTip(false); window.location.href = "/result"; }}
        />
      )}

      {/* Шапка */}
      <header className="bg-[#1e3a5f] text-white py-4 px-6 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-heading">⚡ КП за 30 сек</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-blue-200 hover:text-white transition">
              📂 Мои КП
            </Link>
            {/* [F01] Счётчик кредитов + план */}
            {credits.totalLeft > 0 ? (
              <span className="text-sm text-blue-200 hidden sm:inline">
                <span className="opacity-60">[{planLabel(credits.plan)}]</span>{" "}
                Осталось: <strong className="text-[#f59e0b]">{credits.totalLeft > 900 ? "∞" : credits.totalLeft} КП</strong>
              </span>
            ) : (
              <button
                onClick={() => setShowPaywall(true)}
                className="text-sm bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold px-3 py-1.5 rounded-lg transition animate-pulse"
              >
                🔒 Купить КП →
              </button>
            )}
            {/* Вход / выход */}
            {user ? (
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  setUser(null);
                }}
                className="text-xs text-blue-300 hover:text-white underline transition"
                title={user.email}
              >
                Выйти
              </button>
            ) : (
              <Link
                href="/login"
                className="text-sm text-blue-200 hover:text-white font-semibold transition border border-blue-400 px-3 py-1 rounded-lg hover:border-white"
              >
                Войти
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* [F05] Баннер неактивности / истечения подписки */}
      {activeBanner && (
        <NotificationBanner
          type={activeBanner}
          onDismiss={() => { dismissBannerToday(); setActiveBanner(null); }}
          onCta={() => {
            if (activeBanner === "expiry3") setShowPaywall(true);
            dismissBannerToday();
            setActiveBanner(null);
          }}
        />
      )}

      {/* Hero секция */}
      <section className="bg-[#1e3a5f] text-white pb-20 pt-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* [F13] Счётчик социального доказательства */}
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6 text-sm text-blue-200">
            <span className="text-[#f59e0b] font-bold">{kpCount.toLocaleString("ru-RU")}</span>
            коммерческих предложений уже создано
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4 leading-tight">
            Коммерческое предложение<br />
            <span className="text-[#f59e0b]">за 30 секунд</span>
          </h1>
          <p className="text-lg text-blue-200 max-w-xl mx-auto mb-2">
            Заполни 6 полей — получи профессиональное КП. Без шаблонов, без копипаста.
          </p>
          <p className="text-sm text-blue-300">
            Для фрилансеров, ИП и малых агентств
          </p>
        </div>
      </section>

      {/* [F14] Демо-блок — попробовать без регистрации */}
      <DemoBlock />

      {/* Форма */}
      <section className="px-6 py-10 -mt-6">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold font-heading text-[#1e293b] mb-6">
            Заполни форму — и получи готовое КП
          </h2>

          {/* [F07] Онбординг-подсказка */}
          {isOnboardingExample && (
            <div className="flex items-start gap-2 bg-[#f59e0b]/10 border border-[#f59e0b]/40 rounded-xl px-4 py-3 mb-2 text-sm text-[#92400e]">
              <span className="text-base leading-none mt-0.5">✏️</span>
              <span>Это пример — замени на свои данные и нажми «Создать КП»</span>
            </div>
          )}

          <form id="kp-form" onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Логотип компании */}
            <div>
              <label className="block text-sm font-semibold text-[#1e293b] mb-1">
                Логотип компании <span className="font-normal text-gray-400">(необязательно)</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-4 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-[#1e3a5f] transition group"
              >
                {logoPreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoPreview} alt="Логотип" className="h-12 w-auto max-w-[120px] object-contain rounded" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#1e293b]">Логотип загружен</span>
                      <span className="text-xs text-[#1e3a5f] group-hover:underline">Нажми чтобы заменить</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setLogoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="ml-auto text-gray-400 hover:text-red-500 transition text-lg leading-none"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xl group-hover:bg-blue-50 transition">
                      🏢
                    </div>
                    <div>
                      <span className="text-sm font-medium text-[#1e293b]">Загрузить логотип</span>
                      <p className="text-xs text-gray-400">PNG, JPG до 2 МБ — будет в шапке КП</p>
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>

            {/* Поле 1 */}
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-[#1e293b] mb-1">
                Ваша компания / имя
                <button type="button" title="Заполнить голосом" onClick={() => startVoice("companyName")}
                  className={`ml-2 text-xs px-2 py-0.5 rounded-lg border transition ${voiceField === "companyName" ? "bg-red-50 border-red-300 text-red-600 animate-pulse" : "border-gray-200 text-gray-400 hover:border-[#1e3a5f] hover:text-[#1e3a5f]"}`}>
                  {voiceField === "companyName" ? "⏹ Стоп" : "🎤"}
                </button>
              </label>
              <input
                type="text"
                name="companyName"
                data-testid="form-companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Например: ООО «Ромашка» или Иван Петров"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
              />
            </div>

            {/* Поле 2 */}
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-[#1e293b] mb-1">
                Название компании клиента
                <button type="button" title="Заполнить голосом" onClick={() => startVoice("clientName")}
                  className={`ml-2 text-xs px-2 py-0.5 rounded-lg border transition ${voiceField === "clientName" ? "bg-red-50 border-red-300 text-red-600 animate-pulse" : "border-gray-200 text-gray-400 hover:border-[#1e3a5f] hover:text-[#1e3a5f]"}`}>
                  {voiceField === "clientName" ? "⏹ Стоп" : "🎤"}
                </button>
              </label>
              <input
                type="text"
                name="clientName"
                data-testid="form-clientName"
                value={formData.clientName}
                onChange={handleChange}
                placeholder="Например: ООО «Лидер» или Алексей Смирнов"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
              />
            </div>

            {/* Поле 3 */}
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-[#1e293b] mb-1">
                Услуга или продукт
                <button type="button" title="Заполнить голосом" onClick={() => startVoice("service")}
                  className={`ml-2 text-xs px-2 py-0.5 rounded-lg border transition ${voiceField === "service" ? "bg-red-50 border-red-300 text-red-600 animate-pulse" : "border-gray-200 text-gray-400 hover:border-[#1e3a5f] hover:text-[#1e3a5f]"}`}>
                  {voiceField === "service" ? "⏹ Стоп" : "🎤"}
                </button>
              </label>
              <input
                type="text"
                name="service"
                data-testid="form-service"
                value={formData.service}
                onChange={handleChange}
                placeholder="Например: разработка сайта, SMM, бухгалтерия"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
              />
            </div>

            {/* Поля 4 и 5 — в строку на десктопе */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1e293b] mb-1">
                  Стоимость
                </label>
                <input
                  type="text"
                  name="price"
                  data-testid="form-price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Например: 50 000 ₽"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1e293b] mb-1">
                  Срок выполнения
                </label>
                <input
                  type="text"
                  name="deadline"
                  data-testid="form-deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  placeholder="Например: 14 дней"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Поле 6 */}
            <div>
              <label className="flex items-center justify-between text-sm font-semibold text-[#1e293b] mb-1">
                Ключевые преимущества
                <button type="button" title="Наговорить преимущества голосом" onClick={() => startVoice("advantages")}
                  className={`ml-2 text-xs px-2 py-0.5 rounded-lg border transition ${voiceField === "advantages" ? "bg-red-50 border-red-300 text-red-600 animate-pulse" : "border-gray-200 text-gray-400 hover:border-[#1e3a5f] hover:text-[#1e3a5f]"}`}>
                  {voiceField === "advantages" ? "⏹ Стоп" : "🎤"}
                </button>
              </label>
              <textarea
                name="advantages"
                data-testid="form-advantages"
                value={formData.advantages}
                onChange={handleChange}
                placeholder="Например: опыт 5 лет, 200+ проектов, гарантия возврата, поддержка 24/7"
                required
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[#1e293b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">Перечисли через запятую — чем конкретнее, тем лучше КП</p>
            </div>

            {/* Тон КП */}
            <div>
              <label className="block text-sm font-semibold text-[#1e293b] mb-2">
                Тон коммерческого предложения
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TONE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex flex-col items-center text-center cursor-pointer rounded-xl border-2 px-3 py-3 transition ${
                      formData.tone === opt.value
                        ? "border-[#1e3a5f] bg-[#1e3a5f]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tone"
                      value={opt.value}
                      checked={formData.tone === opt.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className={`font-semibold text-sm ${formData.tone === opt.value ? "text-[#1e3a5f]" : "text-[#1e293b]"}`}>
                      {opt.label}
                    </span>
                    <span className="text-xs text-gray-400 mt-0.5">{opt.hint}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* VOICE — индикатор записи */}
            {voiceField && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2 text-sm text-red-700 animate-pulse">
                🔴 Слушаю... Говорите — запись остановится автоматически
              </div>
            )}

            {/* Ошибка */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Кнопка */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl py-4 md:py-3 mt-2 transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Генерирую КП...
                </span>
              ) : (
                "⚡ Создать КП"
              )}
            </button>
          </form>
        </div>
      </section>

      {/* История КП */}
      {history.length > 0 && (
        <section className="px-6 pb-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-bold font-heading text-[#1e293b] mb-3">
              📂 Ваши последние КП
            </h2>
            <div className="flex flex-col gap-2">
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem("kp_result", JSON.stringify(item.kp));
                    if (item.logo) sessionStorage.setItem("kp_logo", item.logo);
                    else sessionStorage.removeItem("kp_logo");
                    window.location.href = "/result";
                  }}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-[#1e3a5f] hover:shadow-sm transition text-left group"
                >
                  <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center text-[#1e3a5f] text-sm flex-shrink-0">
                    📄
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#1e293b] text-sm truncate group-hover:text-[#1e3a5f]">
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-400">{item.createdAt}</div>
                  </div>
                  <span className="text-xs text-gray-400 group-hover:text-[#1e3a5f]">Открыть →</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Зарегистрируйся чтобы не потерять КП — они хранятся только в браузере
            </p>
          </div>
        </section>
      )}

      {/* Преимущества */}
      <section className="px-6 pb-10">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { icon: "⚡", title: "30 секунд", desc: "Вместо 2–4 часов" },
            { icon: "📄", title: "4 шаблона", desc: "Включая ВИП" },
            { icon: "🆓", title: "3 КП бесплатно", desc: "Без карты" },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="font-bold text-[#1e3a5f] text-sm">{item.title}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* [F13] Отзывы */}
      <section className="px-6 pb-12">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-bold font-heading text-[#1e293b] mb-4 text-center">Что говорят пользователи</h2>
          <div className="grid gap-3">
            {[
              { name: "Анна К.", role: "Дизайнер-фрилансер", text: "Раньше тратила 3 часа на КП, теперь — 5 минут. Клиенты говорят что оно выглядит очень профессионально!", stars: 5 },
              { name: "Михаил Р.", role: "ИП, SMM-специалист", text: "Особенно нравится ВИП-шаблон — отправляю крупным клиентам, сразу видно класс. Уже 2 сделки закрыл после первого отправленного КП.", stars: 5 },
              { name: "Светлана Н.", role: "Агентство веб-разработки", text: "Удобно что можно редактировать текст после генерации. Нейросеть даёт хорошую основу, я немного правлю под себя.", stars: 5 },
            ].map((r) => (
              <div key={r.name} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex gap-3">
                <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center text-[#1e3a5f] font-bold text-sm flex-shrink-0">
                  {r.name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-[#1e293b]">{r.name}</span>
                    <span className="text-xs text-gray-400">{r.role}</span>
                    <span className="ml-auto text-[#f59e0b] text-xs">{"★".repeat(r.stars)}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Футер */}
      <footer className="text-center text-xs text-gray-400 pb-8 space-y-1">
        <div>
          <Link href="/partner" className="hover:text-[#1e3a5f] underline">🤝 Партнёрская программа</Link>
          {" · "}
          <span>© 2025 КП за 30 секунд</span>
        </div>
      </footer>
    </main>
  );
}
