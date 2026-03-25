"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { ParsedKp } from "@/lib/parseKpResponse";
import {
  getCredits, canUseTemplate, applyPayment, decrementPremiumCredit,
  planLabel, PLANS, LS,
  type Credits,
} from "@/lib/credits";

type Template = "classic" | "modern" | "minimal" | "vip";

const TEMPLATES: { id: Template; label: string; color: string }[] = [
  { id: "classic", label: "Классика", color: "bg-[#1e3a5f]" },
  { id: "modern", label: "Современный", color: "bg-[#2d5a8e]" },
  { id: "minimal", label: "Минимализм", color: "bg-gray-700" },
  { id: "vip", label: "ВИП", color: "bg-[#0f1f36]" },
];

// ─── [F01] Paywall на странице результата ────────────────────────────────────
function ResultPaywall({ onClose, onPaid }: { onClose: () => void; onPaid: () => void }) {
  const [loading, setLoading] = useState<"start" | "active" | "monthly" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pay = async (plan: "start" | "active" | "monthly") => {
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/payment/yookassa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json() as {
        confirmationUrl?: string;
        mock?: boolean;
        error?: string;
      };
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
        return;
      }
      if (data.mock) {
        // ЮКасса не настроена — применяем локально (только dev)
        applyPayment(plan);
        onPaid();
        return;
      }
      throw new Error(data.error ?? "Неожиданный ответ");
    } catch {
      setError("Ошибка оплаты. Попробуй ещё раз.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🎨</div>
          <h2 className="text-lg font-bold text-[#1e293b]">ВИП и Современный — в платных пакетах</h2>
          <p className="text-sm text-gray-500 mt-1">Выбери пакет чтобы разблокировать все шаблоны</p>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          {(["start", "active", "monthly"] as const).map((plan) => {
            const def = PLANS[plan];
            return (
              <button
                key={plan}
                onClick={() => pay(plan)}
                disabled={loading !== null}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm transition border-2 ${
                  def.highlight
                    ? "border-[#1e3a5f] bg-[#1e3a5f] text-white hover:bg-[#162d4a]"
                    : "border-gray-200 text-[#1e293b] hover:border-[#1e3a5f]"
                }`}
              >
                <span>{def.name}</span>
                <span className="font-bold">{loading === plan ? "…" : def.price}</span>
              </button>
            );
          })}
        </div>
        {error && <p className="text-xs text-red-500 text-center mb-2">{error}</p>}
        <p className="text-center text-xs text-gray-400">🔒 Платежи через ЮКасса · СБП</p>
      </div>
    </div>
  );
}

function ResultPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kpId = searchParams.get("id");
  const [kp, setKp] = useState<ParsedKp | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [template, setTemplate] = useState<Template>("classic");
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editKp, setEditKp] = useState<ParsedKp | null>(null);
  // [F01] Кредиты и апгрейд-модал
  const [credits, setCredits] = useState<Credits>({
    plan: "free", totalLeft: 3, vipLeft: 0, modernLeft: 0, expiresAt: null, isExpired: false,
  });
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadKp = async () => {
      // 1. sessionStorage (самый быстрый путь — только что сгенерировали)
      const stored = sessionStorage.getItem("kp_result");
      if (stored) {
        try {
          const parsed: ParsedKp = JSON.parse(stored);
          setKp(parsed);
          setEditKp(parsed);
          setLogo(sessionStorage.getItem("kp_logo"));
          // B14: сохраняем копию в localStorage как fallback на случай refresh
          localStorage.setItem(
            "kp_last_result",
            JSON.stringify({ kp: parsed, logo: sessionStorage.getItem("kp_logo"), ts: Date.now() })
          );
          setLoading(false);
          return;
        } catch { /* битый JSON — идём дальше */ }
      }

      // 2. Авторизованный пользователь: грузим с сервера по kpId
      if (kpId) {
        try {
          const r = await fetch(`/api/kp/${kpId}`);
          if (r.ok) {
            const { item } = await r.json();
            setKp(item.kp);
            setEditKp(item.kp);
            if (item.logo) setLogo(item.logo);
            setLoading(false);
            return;
          }
        } catch { /* падение сети */ }
      }

      // 3. B14 fix: localStorage fallback — гость обновил страницу (sessionStorage очистился)
      const lastRaw = localStorage.getItem("kp_last_result");
      if (lastRaw) {
        try {
          const { kp: savedKp, logo: savedLogo, ts } = JSON.parse(lastRaw) as {
            kp: ParsedKp; logo: string | null; ts: number;
          };
          const TWO_HOURS = 2 * 60 * 60 * 1000;
          if (savedKp && Date.now() - ts < TWO_HOURS) {
            setKp(savedKp);
            setEditKp(savedKp);
            if (savedLogo) setLogo(savedLogo);
            setLoading(false);
            return;
          }
        } catch { /* битый JSON */ }
        localStorage.removeItem("kp_last_result");
      }

      // 4. Данных нет — отправляем на главную
      router.push("/");
    };

    loadKp();
  }, [router, kpId]);

  // [B01] Синхронизация кредитов с сервером (отдельный эффект — не завязан на загрузку КП)
  useEffect(() => {
    setCredits(getCredits()); // сначала localStorage для мгновенного UI
    fetch("/api/user/credits")
      .then((r) => r.json())
      .then((d) => {
        if (d.credits) {
          const sc = d.credits;
          // Синкаем localStorage из авторитетного источника (KV)
          localStorage.setItem(LS.PLAN, sc.plan);
          if (sc.plan === "free") {
            localStorage.setItem(LS.FREE, String(sc.totalLeft));
          } else {
            localStorage.setItem(LS.PAID, String(sc.totalLeft));
          }
          // VIP/Modern: всегда синкаем с сервером (сервер — единственный источник правды)
          localStorage.setItem(LS.VIP, String(sc.vipLeft));
          localStorage.setItem(LS.MODERN, String(sc.modernLeft));
          if (sc.expiresAt) localStorage.setItem(LS.EXPIRES, String(sc.expiresAt));
          setCredits(getCredits());
        }
      })
      .catch(() => {});
  }, []);

  // Предупреждение перед уходом со страницы — чтобы КП не потерялось
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Большинство браузеров показывают стандартный текст, игнорируя returnValue
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleCopy = () => {
    if (!kp) return;
    const text = [
      kp.title, "", kp.greeting, "",
      "О нас:", kp.about, "",
      "Наше предложение:", kp.offer, "",
      "Почему мы:", ...kp.benefits.map((b) => `• ${b}`), "",
      `Стоимость: ${kp.price}`,
      `Сроки: ${kp.deadline}`, "",
      kp.cta, "", kp.signature,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSaveEdits = () => {
    if (!editKp) return;
    setKp(editKp);
    sessionStorage.setItem("kp_result", JSON.stringify(editKp));
    setIsEditing(false);
  };

  const updateField = (field: keyof ParsedKp, value: string) => {
    setEditKp((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const updateBenefit = (i: number, value: string) => {
    if (!editKp) return;
    const benefits = [...editKp.benefits];
    benefits[i] = value;
    setEditKp({ ...editKp, benefits });
  };

  const handleDownloadPdf = async () => {
    if (!kp) return;
    setPdfLoading(true);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kp, logo, template }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert("Ошибка генерации PDF: " + (err.detail || res.statusText));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `КП_${kp.title.slice(0, 50)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Ошибка скачивания PDF. Попробуй ещё раз.");
      console.error(e);
    } finally {
      setPdfLoading(false);
    }
  };

  // [F01][B01] Обработка клика по шаблону
  const handleTemplateSelect = async (t: Template) => {
    const isPremium = t === "vip" || t === "modern";
    if (!isPremium) { setTemplate(t); setIsEditing(false); return; }

    // Premium шаблон — клиентская проверка (быстрый UI-фидбек)
    if (!canUseTemplate(t, credits)) { setShowUpgrade(true); return; }

    // Уже использовали premium в этой сессии — бесплатное переключение
    const sessionUsed = sessionStorage.getItem("kp_premium_used");
    if (!sessionUsed) {
      // Первое использование premium — списываем на сервере (авторитетно)
      try {
        const res = await fetch("/api/user/credits/decrement-premium", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template: t }),
        });
        if (res.status === 403) {
          // Сервер говорит: кредитов нет (хотя localStorage думал иначе)
          setShowUpgrade(true);
          return;
        }
        if (res.ok) {
          const data = await res.json() as { credits?: { vipLeft: number; modernLeft: number; plan: string; totalLeft: number; expiresAt: number | null } };
          // Синкаем localStorage из ответа сервера
          if (data.credits) {
            localStorage.setItem(LS.VIP, String(data.credits.vipLeft));
            localStorage.setItem(LS.MODERN, String(data.credits.modernLeft));
            setCredits(getCredits());
          }
        }
        // 401 = гость, нет сессии — fallback на localStorage для UX
        if (res.status === 401) {
          decrementPremiumCredit(t);
          setCredits(getCredits());
        }
      } catch {
        // Сетевая ошибка — fallback на localStorage чтобы не ломать UX
        decrementPremiumCredit(t);
        setCredits(getCredits());
      }
      sessionStorage.setItem("kp_premium_used", t);
    }
    // Уже использовали — бесплатное переключение между VIP/Modern в рамках одного КП
    setTemplate(t);
    setIsEditing(false);
  };

  if (loading || !kp || !editKp) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-3 animate-pulse">⚡</div>
          <p className="text-gray-400 text-sm">Загружаем КП…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      {/* [F01] Апгрейд-модал при попытке использовать premium шаблон */}
      {showUpgrade && (
        <ResultPaywall
          onClose={() => setShowUpgrade(false)}
          onPaid={() => { setCredits(getCredits()); setShowUpgrade(false); }}
        />
      )}

      {/* Шапка */}
      <header className="bg-[#1e3a5f] text-white py-4 px-6 shadow-md print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-2xl font-bold font-heading">⚡ КП за 30 сек</span>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-blue-200 hover:text-white transition">
              📂 Мои КП
            </Link>
            <button onClick={() => router.push("/")} className="text-sm text-blue-200 hover:text-white transition">
              ← Создать новое КП
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Статус */}
        <div className="text-center mb-6 print:hidden">
          <div className="inline-flex items-center gap-2 bg-[#10b981]/10 text-[#10b981] font-semibold px-4 py-2 rounded-full mb-3">
            ✅ КП готово!
          </div>
          <h1 className="text-xl font-bold font-heading text-[#1e293b]">{kp.title}</h1>
        </div>

        {/* [F01] Выбор шаблона с локами */}
        <div className="print:hidden mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-[#1e293b]">Шаблон оформления:</p>
            {credits.plan !== "free" && (
              <span className="text-xs text-gray-400">
                [{planLabel(credits.plan)}]
                {credits.vipLeft > 0 && credits.vipLeft !== -1 && ` · ВИП: ${credits.vipLeft}`}
                {credits.modernLeft > 0 && credits.modernLeft !== -1 && ` · Совр: ${credits.modernLeft}`}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {TEMPLATES.map((t) => {
              const isPremium = t.id === "vip" || t.id === "modern";
              const allowed   = canUseTemplate(t.id, credits);
              const isActive  = template === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTemplateSelect(t.id)}
                  className={`relative flex flex-col items-center gap-1 rounded-xl border-2 py-3 px-2 transition font-semibold text-sm ${
                    isActive
                      ? "border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]"
                      : allowed
                        ? "border-gray-200 text-gray-600 hover:border-gray-300"
                        : "border-gray-100 text-gray-300 bg-gray-50 cursor-pointer hover:border-[#f59e0b]"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full ${allowed ? t.color : "bg-gray-300"}`}></span>
                  <span>{t.label}</span>
                  {isPremium && !allowed && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#f59e0b] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      PRO
                    </span>
                  )}
                  {isPremium && allowed && credits.plan === "start" && (
                    <span className="text-[9px] text-[#10b981] font-semibold mt-0.5">
                      {t.id === "vip" ? `${credits.vipLeft} ост.` : `${credits.modernLeft} ост.`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {credits.plan === "free" && (
            <p className="text-xs text-gray-400 text-center mt-2">
              🔒 ВИП и Современный шаблоны — в{" "}
              <button onClick={() => setShowUpgrade(true)} className="text-[#f59e0b] hover:underline font-semibold">
                платных пакетах от 199 ₽
              </button>
            </p>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="flex flex-wrap gap-3 mb-6 justify-center print:hidden">
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="bg-[#10b981] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#059669] transition disabled:opacity-60"
          >
            {pdfLoading ? "⏳ Генерация…" : "📄 Скачать PDF"}
          </button>
          <button
            onClick={handleCopy}
            className={`font-semibold px-6 py-3 rounded-xl transition ${
              copied ? "bg-[#10b981] text-white" : "bg-white border border-gray-200 text-[#1e293b] hover:bg-gray-50"
            }`}
          >
            {copied ? "✓ Скопировано!" : "📋 Скопировать текст"}
          </button>
          <button
            onClick={() => setIsEditing((v) => !v)}
            className={`font-semibold px-6 py-3 rounded-xl transition ${
              isEditing ? "bg-[#f59e0b] text-white" : "bg-white border border-gray-200 text-[#1e293b] hover:bg-gray-50"
            }`}
          >
            {isEditing ? "✕ Отмена" : "✏️ Редактировать"}
          </button>
          {isEditing && (
            <button onClick={handleSaveEdits} className="bg-[#1e3a5f] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#16324f] transition">
              💾 Сохранить
            </button>
          )}
        </div>

        {isEditing && (
          <div className="print:hidden bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-xl px-4 py-2 mb-4 text-sm text-[#92400e] text-center">
            ✏️ Режим редактирования — правь текст, затем «Сохранить»
          </div>
        )}

        {/* ─── КП ПРЕВЬЮ ─── */}
        {isEditing ? (
          <EditableView kp={kp} editKp={editKp} logo={logo} updateField={updateField} updateBenefit={updateBenefit} />
        ) : (
          <>
            {template === "classic" && <TemplateClassic kp={kp} logo={logo} />}
            {template === "modern"  && <TemplateModern  kp={kp} logo={logo} />}
            {template === "minimal" && <TemplateMinimal kp={kp} logo={logo} />}
            {template === "vip"     && <TemplateVip     kp={kp} logo={logo} />}
          </>
        )}
      </div>
    </main>
  );
}

/* ================================================================
   РЕДАКТИРОВАНИЕ
   ================================================================ */
function EditableView({
  kp, editKp, logo, updateField, updateBenefit,
}: {
  kp: ParsedKp;
  editKp: ParsedKp;
  logo: string | null;
  updateField: (f: keyof ParsedKp, v: string) => void;
  updateBenefit: (i: number, v: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8" id="kp-preview">
      <div className="border-b-4 border-[#1e3a5f] pb-5 mb-5 flex items-start gap-3 kp-section">
        {logo && <img src={logo} alt="Логотип" className="h-14 w-auto max-w-[140px] object-contain" />}
        <div className="flex-1">
          <input value={editKp.title} onChange={(e) => updateField("title", e.target.value)}
            className="w-full text-2xl font-bold font-heading text-[#1e3a5f] border-b border-dashed border-[#1e3a5f]/30 focus:outline-none bg-transparent mb-1" />
          <p className="text-gray-400 text-sm">Коммерческое предложение</p>
        </div>
      </div>
      <textarea value={editKp.greeting} onChange={(e) => updateField("greeting", e.target.value)}
        rows={2} className="w-full text-[#1e293b] mb-5 text-base border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none" />
      <EditSection label="О нас">
        <textarea value={editKp.about} onChange={(e) => updateField("about", e.target.value)}
          rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none text-[#1e293b]" />
      </EditSection>
      <EditSection label="Наше предложение">
        <textarea value={editKp.offer} onChange={(e) => updateField("offer", e.target.value)}
          rows={4} className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none text-[#1e293b]" />
      </EditSection>
      <EditSection label="Почему мы?">
        <div className="space-y-2">
          {editKp.benefits.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[#f59e0b] font-bold">✓</span>
              <input value={item} onChange={(e) => updateBenefit(i, e.target.value)}
                className="flex-1 border-b border-gray-200 focus:outline-none focus:border-[#1e3a5f] text-[#1e293b] bg-transparent py-1" />
            </div>
          ))}
        </div>
      </EditSection>
      <div className="grid grid-cols-2 gap-4 mb-5 kp-price-block">
        <div className="bg-[#f8fafc] rounded-xl p-4 border border-gray-100">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Стоимость</div>
          <input value={editKp.price} onChange={(e) => updateField("price", e.target.value)}
            className="font-bold text-[#1e3a5f] text-lg w-full border-b border-dashed border-[#1e3a5f]/30 focus:outline-none bg-transparent" />
        </div>
        <div className="bg-[#f8fafc] rounded-xl p-4 border border-gray-100">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Сроки</div>
          <input value={editKp.deadline} onChange={(e) => updateField("deadline", e.target.value)}
            className="font-bold text-[#1e3a5f] text-lg w-full border-b border-dashed border-[#1e3a5f]/30 focus:outline-none bg-transparent" />
        </div>
      </div>
      <div className="bg-[#1e3a5f] rounded-xl p-4 mb-5 text-white text-center kp-section">
        <textarea value={editKp.cta} onChange={(e) => updateField("cta", e.target.value)}
          rows={2} className="w-full font-semibold bg-transparent text-center focus:outline-none resize-none" />
      </div>
      <div className="border-t border-gray-100 pt-4">
        <textarea value={editKp.signature} onChange={(e) => updateField("signature", e.target.value)}
          rows={2} className="w-full text-gray-500 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none resize-none" />
      </div>
    </div>
  );
}

function EditSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 kp-section">
      <h3 className="font-bold font-heading text-[#1e3a5f] mb-2">{label}</h3>
      {children}
    </div>
  );
}

/* ================================================================
   ШАБЛОН 1: КЛАССИКА
   ================================================================ */
function TemplateClassic({ kp, logo }: { kp: ParsedKp; logo: string | null }) {
  return (
    <div id="kp-preview" className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Синяя шапка */}
      <div className="bg-[#1e3a5f] px-10 py-8 flex items-center gap-5 kp-section">
        {logo && (
          <div className="bg-white rounded-xl p-2 flex-shrink-0">
            <img src={logo} alt="Логотип" className="h-14 w-auto max-w-[130px] object-contain" />
          </div>
        )}
        <div>
          <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">Коммерческое предложение</p>
          <h2 className="text-white text-2xl font-bold font-heading leading-snug">{kp.title}</h2>
        </div>
      </div>

      <div className="px-10 py-8">
        <p className="text-[#1e293b] text-base mb-7 leading-relaxed kp-section">{kp.greeting}</p>

        <div className="mb-6 kp-section">
          <h3 className="font-bold font-heading text-[#1e3a5f] text-sm uppercase tracking-wide mb-2 border-l-4 border-[#f59e0b] pl-3">О нас</h3>
          <p className="text-[#1e293b] leading-relaxed">{kp.about}</p>
        </div>

        <div className="mb-6 kp-section">
          <h3 className="font-bold font-heading text-[#1e3a5f] text-sm uppercase tracking-wide mb-2 border-l-4 border-[#f59e0b] pl-3">Наше предложение</h3>
          <p className="text-[#1e293b] leading-relaxed">{kp.offer}</p>
        </div>

        <div className="mb-6 kp-section">
          <h3 className="font-bold font-heading text-[#1e3a5f] text-sm uppercase tracking-wide mb-3 border-l-4 border-[#f59e0b] pl-3">Почему мы?</h3>
          <ul className="space-y-2">
            {kp.benefits.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-1 w-5 h-5 bg-[#f59e0b] rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">{i + 1}</span>
                <span className="text-[#1e293b]">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 kp-price-block">
          <div className="border-2 border-[#1e3a5f] rounded-xl p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Стоимость</div>
            <div className="font-bold text-[#1e3a5f] text-lg">{kp.price}</div>
          </div>
          <div className="border-2 border-[#1e3a5f] rounded-xl p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Срок выполнения</div>
            <div className="font-bold text-[#1e3a5f] text-lg">{kp.deadline}</div>
          </div>
        </div>

        <div className="bg-[#1e3a5f] rounded-xl p-5 mb-6 text-white text-center kp-section">
          <p className="font-semibold text-base">{kp.cta}</p>
        </div>

        <div className="border-t border-gray-100 pt-4 kp-section">
          <p className="text-gray-500 text-sm">{kp.signature}</p>
        </div>

        {/* Watermark бесплатного шаблона */}
        <div className="mt-6 pt-3 border-t border-gray-100 text-center">
          <p className="text-gray-300 text-xs tracking-wide">
            Создано с помощью КП за 30 сек · kp-za-30.vercel.app
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   ШАБЛОН 2: СОВРЕМЕННЫЙ
   ================================================================ */
function TemplateModern({ kp, logo }: { kp: ParsedKp; logo: string | null }) {
  return (
    <div id="kp-preview" className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Градиентная шапка */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d6a9f] px-10 py-10 kp-section">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-[#f59e0b] text-xs font-bold uppercase tracking-widest mb-3">Коммерческое предложение</p>
            <h2 className="text-white text-3xl font-bold font-heading leading-snug mb-0">{kp.title}</h2>
          </div>
          {logo && (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-3 flex-shrink-0">
              <img src={logo} alt="Логотип" className="h-16 w-auto max-w-[120px] object-contain" />
            </div>
          )}
        </div>
      </div>

      {/* Жёлтая полоса */}
      <div className="h-1.5 bg-[#f59e0b]" />

      <div className="px-10 py-10">

        {/* Приветствие */}
        <p className="text-[#1e293b] text-base mb-8 leading-relaxed bg-[#f0f4f9] rounded-xl p-5 border-l-4 border-[#2d6a9f] kp-section">
          {kp.greeting}
        </p>

        {/* О нас */}
        <div className="mb-8 kp-section">
          <h3 className="font-bold font-heading text-[#1e293b] text-base mb-3 flex items-center gap-2">
            <span className="w-2 h-6 bg-[#f59e0b] rounded-full inline-block flex-shrink-0" />
            О нас
          </h3>
          <p className="text-[#374151] leading-relaxed pl-4 text-sm">{kp.about}</p>
        </div>

        <div className="border-t border-gray-100 my-6" />

        {/* Наше предложение */}
        <div className="mb-8 kp-section">
          <h3 className="font-bold font-heading text-[#1e293b] text-base mb-3 flex items-center gap-2">
            <span className="w-2 h-6 bg-[#f59e0b] rounded-full inline-block flex-shrink-0" />
            Наше предложение
          </h3>
          <p className="text-[#374151] leading-relaxed pl-4 text-sm">{kp.offer}</p>
        </div>

        <div className="border-t border-gray-100 my-6" />

        {/* Почему мы */}
        <div className="mb-8 kp-section">
          <h3 className="font-bold font-heading text-[#1e293b] text-base mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-[#f59e0b] rounded-full inline-block flex-shrink-0" />
            Почему мы?
          </h3>
          <div className="grid gap-2.5 pl-4">
            {kp.benefits.map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-[#f8fafc] border border-gray-100 rounded-xl px-4 py-3">
                <span className="w-6 h-6 rounded-full bg-[#2d6a9f] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-[#374151] text-sm leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 my-6" />

        {/* Стоимость и срок */}
        <div className="grid grid-cols-2 gap-4 mb-8 kp-price-block">
          <div className="bg-[#1e3a5f] rounded-xl p-5 text-white">
            <div className="text-blue-300 text-xs uppercase tracking-widest mb-2">Стоимость</div>
            <div className="font-bold text-2xl">{kp.price}</div>
          </div>
          <div className="bg-[#f59e0b] rounded-xl p-5 text-white">
            <div className="text-amber-100 text-xs uppercase tracking-widest mb-2">Срок выполнения</div>
            <div className="font-bold text-2xl">{kp.deadline}</div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d6a9f] rounded-xl p-6 mb-8 text-center kp-section">
          <p className="font-bold text-white text-base">{kp.cta}</p>
        </div>

        <div className="border-t border-gray-100 pt-5 kp-section">
          <p className="text-gray-500 text-sm">{kp.signature}</p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   ШАБЛОН 3: МИНИМАЛИЗМ
   ================================================================ */
function TemplateMinimal({ kp, logo }: { kp: ParsedKp; logo: string | null }) {
  return (
    <div id="kp-preview" className="bg-white rounded-2xl shadow-xl px-12 py-10">
      {/* Шапка */}
      <div className="flex items-start justify-between mb-10 pb-6 border-b border-gray-200 kp-section">
        <div className="flex-1">
          <p className="text-gray-400 text-xs uppercase tracking-[0.2em] mb-3">Коммерческое предложение</p>
          <h2 className="text-3xl font-bold font-heading text-gray-900 leading-snug">{kp.title}</h2>
        </div>
        {logo && (
          <img src={logo} alt="Логотип" className="h-12 w-auto max-w-[120px] object-contain ml-6" />
        )}
      </div>

      <p className="text-gray-600 text-base mb-8 leading-relaxed kp-section">{kp.greeting}</p>

      {[
        { label: "О нас", text: kp.about },
        { label: "Предложение", text: kp.offer },
      ].map((s) => (
        <div key={s.label} className="mb-8 kp-section">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">{s.label}</p>
          <p className="text-gray-800 leading-relaxed">{s.text}</p>
        </div>
      ))}

      <div className="mb-8 kp-section">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">Наши преимущества</p>
        <ul className="space-y-2">
          {kp.benefits.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-gray-800">
              <span className="text-gray-300 font-bold text-lg leading-none">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8 kp-price-block">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Стоимость</p>
          <p className="text-2xl font-bold text-gray-900">{kp.price}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Срок</p>
          <p className="text-2xl font-bold text-gray-900">{kp.deadline}</p>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl p-6 mb-8 text-center kp-section">
        <p className="text-gray-700 font-semibold text-base">{kp.cta}</p>
      </div>

      <div className="pt-6 border-t border-gray-100 kp-section">
        <p className="text-gray-400 text-sm">{kp.signature}</p>
      </div>

      {/* Watermark бесплатного тарифа */}
      <div className="mt-8 pt-3 border-t border-gray-100 text-center">
        <p className="text-gray-300 text-xs tracking-wide">
          Создано с помощью КП за 30 сек · kp-za-30.vercel.app
        </p>
      </div>
    </div>
  );
}

/* ================================================================
   ШАБЛОН 4: ВИП  — дизайн под профессиональный PDF
   Цвета: тёмный #1C1C1E, золотой #C8A84B, фон карточек #F9F6EE
   ================================================================ */

const GOLD = "#C8A84B";
const DARK = "#162038";           // глубокий тёмно-синий
const DARK_LIGHT = "#1e3054";     // чуть светлее — для градиента
const CARD_BG = "#F9F6EE";
const CARD_BORDER = "#EDE8DC";

function VipSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-bold font-heading text-base mb-4 flex items-center gap-2" style={{ color: DARK }}>
      <span className="text-xs flex-shrink-0" style={{ color: GOLD }}>■</span>
      <span className="uppercase tracking-wide">{children}</span>
    </h3>
  );
}

function VipDivider() {
  return <div className="border-b border-gray-100 my-7" />;
}

function TemplateVip({ kp, logo }: { kp: ParsedKp; logo: string | null }) {
  const today = new Date().toLocaleDateString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <div id="kp-preview" className="bg-white overflow-hidden rounded-2xl shadow-xl">

      {/* ── ШАПКА — градиент тёмно-синий ── */}
      <div
        className="px-10 py-6"
        style={{ background: `linear-gradient(135deg, ${DARK} 0%, ${DARK_LIGHT} 60%, ${DARK} 100%)` }}
      >
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {logo && (
              <div className="bg-white rounded-lg p-1.5 flex-shrink-0">
                <img src={logo} alt="Логотип" className="h-10 w-auto max-w-[110px] object-contain" />
              </div>
            )}
            <div>
              <p className="text-white font-bold text-base uppercase tracking-wide leading-none mb-1">
                Коммерческое предложение
              </p>
              <p className="text-xs font-semibold" style={{ color: GOLD }}>
                Профессиональное предложение
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold" style={{ color: GOLD }}>{today}</p>
            <p className="text-gray-500 text-xs mt-0.5">Конфиденциально</p>
          </div>
        </div>
        {/* Золотая линия под шапкой */}
        <div className="mt-5 h-px" style={{ backgroundColor: `${GOLD}60` }} />
      </div>
      {/* Золотая полоса */}
      <div className="h-1" style={{ backgroundColor: GOLD }} />

      {/* ── КОНТЕНТ ── */}
      <div className="px-10 py-9">

        {/* Метка + Заголовок + Кому */}
        <div className="mb-8 kp-section">
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: GOLD }}>
            Коммерческое предложение
          </p>
          <h2 className="font-bold font-heading leading-tight mb-3 text-3xl" style={{ color: DARK }}>
            {kp.title}
          </h2>
          <p className="text-gray-500 text-sm">{kp.greeting}</p>
        </div>

        <VipDivider />

        {/* О компании */}
        <div className="mb-7 kp-section">
          <VipSectionTitle>О компании</VipSectionTitle>
          <p className="text-gray-700 leading-relaxed text-sm">{kp.about}</p>
        </div>

        {/* Наше предложение */}
        <div className="mb-7 kp-section">
          <VipSectionTitle>Наше предложение</VipSectionTitle>
          <p className="text-gray-700 leading-relaxed text-sm">{kp.offer}</p>
        </div>

        <VipDivider />

        {/* Карточки преимуществ — 2×3 сетка */}
        {kp.benefitCards && kp.benefitCards.length > 0 ? (
          <div className="mb-7 kp-section">
            <VipSectionTitle>Почему выбирают нас</VipSectionTitle>
            <div className="grid grid-cols-2 gap-3">
              {kp.benefitCards.map((card, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4 flex gap-3 border"
                  style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
                >
                  <span
                    className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: GOLD }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-bold text-sm mb-0.5" style={{ color: DARK }}>{card.title}</p>
                    <p className="text-gray-500 text-xs leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-7 kp-section">
            <VipSectionTitle>Наши преимущества</VipSectionTitle>
            <div className="grid grid-cols-2 gap-3">
              {kp.benefits.map((item, i) => (
                <div key={i} className="rounded-xl p-4 flex gap-3 border" style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}>
                  <span className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: GOLD }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-gray-700 text-sm leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <VipDivider />

        {/* Таблица цен */}
        {kp.priceItems && kp.priceItems.length > 0 ? (
          <div className="mb-7 kp-section">
            <VipSectionTitle>Состав работ и стоимость</VipSectionTitle>
            <div className="overflow-hidden rounded-xl border" style={{ borderColor: CARD_BORDER }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: `linear-gradient(90deg, ${DARK} 0%, ${DARK_LIGHT} 100%)` }}>
                    <th className="py-3 px-4 text-left font-semibold text-white w-8">№</th>
                    <th className="py-3 px-4 text-left font-semibold text-white">Услуга</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-400 hidden md:table-cell">Описание</th>
                    <th className="py-3 px-4 text-right font-semibold text-white">Стоимость</th>
                  </tr>
                </thead>
                <tbody>
                  {kp.priceItems.map((item, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : CARD_BG }}>
                      <td className="py-3 px-4 font-bold text-xs" style={{ color: GOLD }}>
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="py-3 px-4 font-semibold" style={{ color: DARK }}>{item.name}</td>
                      <td className="py-3 px-4 text-gray-500 hidden md:table-cell">{item.desc}</td>
                      <td className="py-3 px-4 text-right font-bold" style={{ color: DARK }}>{item.price}</td>
                    </tr>
                  ))}
                  {/* Итого */}
                  <tr style={{ background: `linear-gradient(90deg, ${DARK} 0%, ${DARK_LIGHT} 100%)` }}>
                    <td colSpan={3} className="py-4 px-4 font-bold text-white">
                      Итого по проекту
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-lg" style={{ color: GOLD }}>
                      {kp.priceTotal || kp.price}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-7 kp-price-block">
            <div
              className="rounded-2xl p-5 text-white"
              style={{ background: `linear-gradient(135deg, ${DARK} 0%, ${DARK_LIGHT} 100%)` }}
            >
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: GOLD }}>Стоимость</div>
              <div className="text-2xl font-bold">{kp.price}</div>
            </div>
            <div className="rounded-2xl p-5 border-2" style={{ borderColor: DARK }}>
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: DARK }}>Срок</div>
              <div className="text-2xl font-bold" style={{ color: DARK }}>{kp.deadline}</div>
            </div>
          </div>
        )}

        <VipDivider />

        {/* Этапы работы */}
        {kp.timeline && kp.timeline.length > 0 && (
          <div className="mb-7 kp-section">
            <VipSectionTitle>Этапы работы</VipSectionTitle>
            <div className="relative pl-10">
              {/* Вертикальная линия */}
              <div
                className="absolute left-3 top-2 bottom-2 w-0.5"
                style={{ backgroundColor: CARD_BORDER }}
              />
              <div className="space-y-6">
                {kp.timeline.map((step, i) => (
                  <div key={i} className="relative kp-section">
                    <div
                      className="absolute -left-10 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: GOLD }}
                    >
                      {i + 1}
                    </div>
                    <p className="font-bold text-sm mb-0.5" style={{ color: DARK }}>{step.title}</p>
                    <p className="text-xs font-semibold mb-1" style={{ color: GOLD }}>{step.duration}</p>
                    <p className="text-gray-600 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Условия сотрудничества */}
        {kp.conditions && kp.conditions.length > 0 && (
          <div className="mb-7 kp-section">
            <VipSectionTitle>Условия сотрудничества</VipSectionTitle>
            <ul className="space-y-2">
              {kp.conditions.map((c, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="font-bold mt-0.5 flex-shrink-0" style={{ color: GOLD }}>■</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA блок — градиентный тёмно-синий */}
        <div
          className="rounded-2xl p-8 text-center kp-section"
          style={{ background: `linear-gradient(135deg, ${DARK} 0%, ${DARK_LIGHT} 50%, ${DARK} 100%)` }}
        >
          <p className="text-white font-bold text-xl font-heading mb-2">Готовы начать работу?</p>
          <p className="text-sm leading-relaxed mb-4" style={{ color: GOLD }}>{kp.cta}</p>
          <div className="h-px mb-4" style={{ backgroundColor: `${GOLD}40` }} />
          <p className="text-gray-400 text-sm">{kp.signature}</p>
        </div>

      </div>

      {/* Футер документа */}
      <div className="px-10 py-3 border-t flex items-center justify-between" style={{ borderColor: CARD_BORDER }}>
        <p className="text-gray-400 text-xs">{kp.signature}</p>
        <p className="text-gray-300 text-xs">КП за 30 секунд</p>
      </div>

    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-4xl animate-spin">⏳</div>
      </main>
    }>
      <ResultPageContent />
    </Suspense>
  );
}
