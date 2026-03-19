"use client";

// Страница отписки от email-уведомлений
// URL: /unsubscribe?email=...

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function UnsubscribeForm() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  // Если email передан в URL — отписываем сразу при загрузке
  useEffect(() => {
    if (!email) return;
    setStatus("loading");
    fetch(`/api/notifications/subscribe?email=${encodeURIComponent(email)}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (res.ok) {
          setStatus("done");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [email]);

  if (!email) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-gray-500">Ссылка отписки недействительна.</p>
        <Link href="/" className="mt-4 inline-block text-[#1e3a5f] underline text-sm">
          На главную
        </Link>
      </div>
    );
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
          <b>{email}</b> отписан от напоминаний.
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

  return null;
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm">
        <div className="text-center mb-4">
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
