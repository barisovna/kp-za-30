"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const errorMessages: Record<string, string> = {
    invalid: "Ссылка недействительна.",
    expired: "Ссылка устарела или уже была использована. Запроси новую.",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setFormError(data.error || "Не удалось отправить письмо. Попробуй ещё раз.");
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-xl font-bold text-[#1e293b] mb-2">
            Проверь почту
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Мы отправили ссылку для входа на{" "}
            <strong className="text-[#1e293b]">{email}</strong>.<br />
            Ссылка действует <strong>15 минут</strong>.
          </p>
          <p className="text-gray-400 text-xs mt-4">
            Не пришло? Проверь папку «Спам».
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-4 text-sm text-[#1e3a5f] underline"
          >
            Отправить ещё раз
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">⚡</div>
          <h1 className="text-xl font-bold text-[#1e293b]">
            Войти в КП за 30 сек
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Без пароля — пришлём ссылку на email
          </p>
        </div>

        {error && errorMessages[error] && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-red-600 text-sm">
            {errorMessages[error]}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoFocus
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e3a5f] transition"
          />
          {formError && (
            <p className="text-red-500 text-sm">{formError}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e3a5f] text-white font-bold py-3 rounded-xl hover:bg-[#162d4a] transition disabled:opacity-60"
          >
            {loading ? "Отправляем…" : "Получить ссылку для входа"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5">
          Продолжая, ты соглашаешься с{" "}
          <Link href="/terms" className="underline">
            условиями использования
          </Link>
        </p>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-[#1e3a5f] underline">
            ← На главную
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
