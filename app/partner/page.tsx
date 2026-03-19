"use client";

// [F04] Партнёрская программа — страница для партнёров

import { useState } from "react";
import Link from "next/link";
import type { ReferralStats } from "@/lib/referral";

const SITE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://kp-za-30.vercel.app";

export default function PartnerPage() {
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [stats, setStats]       = useState<ReferralStats | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);

  const referralLink = stats
    ? `${SITE_URL}/ref?code=${stats.code}`
    : "";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Введите корректный email");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json() as { ok?: boolean; stats?: ReferralStats; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Ошибка");
      setStats(data.stats!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сервис временно недоступен");
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    if (!email.includes("@")) {
      setError("Введите email, с которым регистрировались");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/referral?email=${encodeURIComponent(email)}`);
      const data = await res.json() as { ok?: boolean; stats?: ReferralStats; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Email не найден");
      setStats(data.stats!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не найдено");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Хедер */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold font-heading text-[#1e3a5f]">КП за 30 сек</span>
        </Link>
        <Link href="/" className="text-sm text-[#1e3a5f] hover:underline">← На главную</Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#f59e0b]/10 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            🤝
          </div>
          <h1 className="text-3xl font-bold font-heading text-[#1e293b] mb-3">
            Партнёрская программа
          </h1>
          <p className="text-gray-500 text-lg">
            Зарабатывайте <span className="font-semibold text-[#1e3a5f]">20%</span> с каждой оплаты
            вашего реферала — навсегда
          </p>
        </div>

        {/* Как работает */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: "🔗", title: "Получи ссылку", desc: "Зарегистрируйся и получи уникальную реферальную ссылку" },
            { icon: "📤", title: "Поделись", desc: "Отправь ссылку в соцсетях, коллегам, в своём блоге" },
            { icon: "💰", title: "Зарабатывай", desc: "Получай 20% с каждой покупки твоих рефералов" },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="font-semibold text-[#1e293b] text-sm mb-1">{item.title}</div>
              <div className="text-xs text-gray-400">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Форма */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          {!stats ? (
            <>
              <h2 className="text-lg font-bold text-[#1e293b] mb-4">
                Получить реферальную ссылку
              </h2>
              <form onSubmit={handleRegister} className="space-y-3">
                <input
                  type="email"
                  placeholder="Ваш email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 text-sm"
                  required
                />
                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#1e3a5f] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#162d4a] transition disabled:opacity-60"
                  >
                    {loading ? "Создаю ссылку..." : "Стать партнёром"}
                  </button>
                  <button
                    type="button"
                    onClick={handleLookup}
                    disabled={loading}
                    className="px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition disabled:opacity-60"
                    title="Найти мой код по email"
                  >
                    Найти мой код
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-[#1e293b] mb-4">
                🎉 Ваша реферальная ссылка
              </h2>

              {/* Ссылка */}
              <div className="bg-[#f8fafc] rounded-xl p-3 flex items-center gap-2 mb-4">
                <span className="flex-1 text-sm text-[#1e3a5f] font-mono truncate">
                  {referralLink}
                </span>
                <button
                  onClick={copyLink}
                  className="shrink-0 bg-[#f59e0b] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-500 transition"
                >
                  {copied ? "✓ Скопировано" : "Скопировать"}
                </button>
              </div>

              {/* Статистика */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Переходов", value: stats.clicks, icon: "👆" },
                  { label: "Покупок", value: stats.conversions, icon: "💳" },
                  { label: "Заработано", value: `${stats.earned} ₽`, icon: "💰" },
                ].map((item) => (
                  <div key={item.label} className="bg-[#f8fafc] rounded-xl p-3 text-center">
                    <div className="text-xl mb-1">{item.icon}</div>
                    <div className="font-bold text-[#1e293b]">{item.value}</div>
                    <div className="text-xs text-gray-400">{item.label}</div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 text-center">
                Ваш код: <b>{stats.code}</b> · Зарегистрирован {new Date(stats.createdAt).toLocaleDateString("ru-RU")}
              </p>

              <button
                onClick={() => { setStats(null); setEmail(""); }}
                className="mt-3 w-full text-sm text-gray-400 hover:text-gray-600 transition"
              >
                Войти с другим email
              </button>
            </>
          )}
        </div>

        {/* Условия */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-[#1e293b] mb-3">Условия программы</h3>
          <ul className="space-y-2 text-sm text-gray-500">
            <li>✅ <b>20%</b> с каждого платежа реферала (пожизненно)</li>
            <li>✅ Реферал закрепляется за вами по cookie на <b>90 дней</b></li>
            <li>✅ Минимальная сумма для вывода: <b>500 ₽</b></li>
            <li>✅ Выплата на карту РФ или ЮMoney по запросу</li>
            <li>⚠️ Запрещён спам и вводящая в заблуждение реклама</li>
          </ul>
          <p className="text-xs text-gray-400 mt-4">
            Вопросы? Пишите: <a href="mailto:partner@kp-za-30.ru" className="underline">partner@kp-za-30.ru</a>
          </p>
        </div>
      </main>
    </div>
  );
}
