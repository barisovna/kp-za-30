"use client";

// Страница отписки от email-уведомлений
// URL: /unsubscribe?email=...  — отписывает сразу
// URL: /unsubscribe           — показывает форму для ввода email

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function UnsubscribeForm() {
  const params = useSearchParams();
  const emailParam = params.get("email") ?? "";

  const [email, setEmail] = useState(emailParam);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  // Если email передан в URL — отписываем сразу при загрузке
  useEffect(() => {
    if (!emailParam) return;
    setStatus("loading");
    fetch(`/api/notifications/subscribe?email=${encodeURIComponent(emailParam)}`, {
      method: "DELETE",
    })
      .then((res) => {
        setStatus(res.ok ? "done" : "error");
      })
      .catch(() => setStatus("error"));
  }, [emailParam]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    fetch(`/api/notifications/subscribe?email=${encodeURIComponent(email.trim())}`, {
      method: "DELETE",
    })
      .then((res) => {
        setStatus(res.ok ? "done" : "error");
      })
      .catch(() => setStatus("error"));
  }

  if (status === "loading") {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3 animate-pulse">⏳</div>
        <p className="text-gray-500">Отписываем...</p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-[#1e293b] mb-2">Готово!</h2>
        <p className="text-gray-500 mb-4">
          <b>{emailParam || email}</b> отписан от напоминаний.
        </p>
        <Link href="/" className="inline-block text-[#1e3a5f] underline text-sm">
          Вернуться на сайт
        </Link>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">❌</div>
        <p className="text-gray-500 mb-4">Не удалось отписать. Попробуй позже.</p>
        <Link href="/" className="inline-block text-[#1e3a5f] underline text-sm">
          На главную
        </Link>
      </div>
    );
  }

  // Нет email в URL — показываем форму
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-2">
        <div className="text-3xl mb-2">✉️</div>
        <p className="text-gray-600 text-sm">
          Введи email, с которого хочешь отписаться от напоминаний
        </p>
      </div>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
      />
      <button
        type="submit"
        className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-bold py-3 rounded-xl transition text-sm"
      >
        Отписаться
      </button>
      <div className="text-center">
        <Link href="/" className="text-gray-400 text-xs underline">
          На главную
        </Link>
      </div>
    </form>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="text-2xl font-bold font-heading text-[#1e3a5f]">КП за 30 сек</span>
        </div>
        <Suspense fallback={
          <div className="text-center py-8">
            <div className="text-4xl mb-3 animate-pulse">⏳</div>
            <p className="text-gray-500">Загружаем...</p>
          </div>
        }>
          <UnsubscribeForm />
        </Suspense>
      </div>
    </div>
  );
}
