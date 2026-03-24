"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ParsedKp } from "@/lib/parseKpResponse";
import { getCredits, planLabel, type Credits } from "@/lib/credits";
import type { ServerCredits } from "@/lib/user-kv";

type KpStatus = "draft" | "sent" | "accepted" | "rejected";

interface HistoryItem {
  id: string;
  title: string;
  createdAt: string;
  kp: ParsedKp;
  logo?: string;
  status?: KpStatus;
}

const STATUS_CONFIG: Record<KpStatus, { label: string; color: string; bg: string }> = {
  draft:    { label: "Черновик",  color: "text-gray-500",   bg: "bg-gray-100" },
  sent:     { label: "Отправлено", color: "text-blue-600",  bg: "bg-blue-50" },
  accepted: { label: "Принято",   color: "text-green-600",  bg: "bg-green-50" },
  rejected: { label: "Отклонено", color: "text-red-500",    bg: "bg-red-50" },
};

const STATUS_ORDER: KpStatus[] = ["draft", "sent", "accepted", "rejected"];

interface UserInfo {
  email: string;
  userId: string;
  credits: ServerCredits | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<KpStatus | "all">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [credits, setCredits] = useState<Credits>({
    plan: "free", totalLeft: 3, vipLeft: 0, modernLeft: 0, expiresAt: null, isExpired: false,
  });
  const [user, setUser] = useState<UserInfo | null>(null);
  const [serverMode, setServerMode] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Сразу показываем локальные данные (быстрый старт)
    setCredits(getCredits());

    // Пробуем загрузить данные с сервера (если пользователь залогинен)
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setAuthChecked(true);
        if (!data.user) {
          // Не авторизован — редиректим на страницу входа
          router.replace("/login?from=dashboard");
          return;
        }
        setUser(data.user);

        // Загружаем историю с сервера
        fetch("/api/user/history")
          .then((r) => r.json())
          .then((h) => {
            if (h.items?.length >= 0) {
              setItems(h.items.map((item: HistoryItem) => ({ ...item, status: item.status ?? "draft" })));
              setServerMode(true);
            }
          })
          .catch(() => {});

        // Синхронизируем кредиты с сервером — сервер авторитетен на дашборде,
        // пользователь здесь не генерирует, поэтому race condition исключён.
        fetch("/api/user/credits")
          .then((r) => r.json())
          .then((d) => {
            if (!d.credits) return;
            const sc = d.credits as ServerCredits;
            const isExpired = sc.expiresAt ? Date.now() > sc.expiresAt : false;
            const effectivePlan = (isExpired ? "free" : sc.plan) as Credits["plan"];
            const totalLeft = sc.totalLeft === -1 ? 99999 : sc.totalLeft;
            setCredits({
              plan: effectivePlan,
              totalLeft: isExpired ? 0 : totalLeft,
              vipLeft: isExpired ? 0 : sc.vipLeft,
              modernLeft: isExpired ? 0 : sc.modernLeft,
              expiresAt: sc.expiresAt ?? null,
              isExpired,
            });
          })
          .catch(() => {});
      })
      .catch(() => {
        // При ошибке сети — тоже отмечаем проверку как выполненную и редиректим
        setAuthChecked(true);
        router.replace("/login?from=dashboard");
      })
      .finally(() => {
        // Fallback: localStorage история для гостей (если сервер не ответил)
        const raw = localStorage.getItem("kp_history");
        if (raw) {
          try {
            const parsed: HistoryItem[] = JSON.parse(raw);
            setItems((prev) =>
              prev.length === 0
                ? parsed.map((item) => ({ ...item, status: item.status ?? "draft" }))
                : prev
            );
          } catch {}
        }
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openKp = (item: HistoryItem) => {
    // Кладём в sessionStorage для мгновенной загрузки (без лишнего запроса)
    sessionStorage.setItem("kp_result", JSON.stringify(item.kp));
    if (item.logo) sessionStorage.setItem("kp_logo", item.logo);
    else sessionStorage.removeItem("kp_logo");
    // Передаём ID для возможности повторной загрузки после обновления страницы
    window.location.href = serverMode ? `/result?id=${item.id}` : "/result";
  };

  const setStatus = (id: string, status: KpStatus) => {
    const updated = items.map((item) => (item.id === id ? { ...item, status } : item));
    setItems(updated);
    if (serverMode) {
      fetch("/api/user/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      }).catch(() => {});
    } else {
      localStorage.setItem("kp_history", JSON.stringify(updated));
    }
  };

  const deleteItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    setDeleteConfirm(null);
    if (serverMode) {
      fetch("/api/user/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => {});
    } else {
      localStorage.setItem("kp_history", JSON.stringify(updated));
    }
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const counts = {
    all: items.length,
    draft: items.filter((i) => i.status === "draft").length,
    sent: items.filter((i) => i.status === "sent").length,
    accepted: items.filter((i) => i.status === "accepted").length,
    rejected: items.filter((i) => i.status === "rejected").length,
  };

  // Пока идёт проверка авторизации — показываем заглушку (предотвращает мигание данных)
  if (!authChecked) {
    return (
      <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <p className="text-gray-400 text-sm">Загрузка…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      {/* Шапка */}
      <header className="bg-[#1e3a5f] text-white py-4 px-6 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-2xl font-bold font-heading">⚡ КП за 30 сек</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-xs text-blue-300 hidden sm:block">{user.email}</span>
                <button
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.href = "/";
                  }}
                  className="text-xs text-blue-200 hover:text-white underline transition"
                >
                  Выйти
                </button>
              </>
            ) : (
              <Link href="/login" className="text-sm text-blue-200 hover:text-white transition">
                Войти
              </Link>
            )}
            <span className="text-sm text-blue-200">
              <span className="opacity-60 text-xs">[{planLabel(credits.plan)}]</span>{" "}
              Осталось: <strong className="text-[#f59e0b]">{(credits.plan === "unlimited" || credits.plan === "yearly") ? "∞" : credits.totalLeft} КП</strong>
            </span>
            <Link
              href="/"
              className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-sm px-4 py-2 rounded-xl transition"
            >
              + Новое КП
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* [F02] Баннер апгрейда на годовую для месячных подписчиков */}
        {(() => {
          const plan = credits.plan;
          const expires = credits.expiresAt;
          if (plan !== "unlimited") return null;
          // Показываем только если подписка действует > 14 дней (значит покупали месячную недавно)
          if (!expires) return null;
          const daysLeft = Math.ceil((expires - Date.now()) / (1000 * 60 * 60 * 24));
          // Показываем если осталось < 17 дней — т.е. купили > 14 дней назад
          if (daysLeft > 17) return null;
          return (
            <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d6a9f] text-white rounded-2xl p-5 mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-base mb-1">💡 Переходи на годовую — экономь 1 900 ₽</p>
                <p className="text-sm text-blue-200">
                  Вместо 9 480 ₽/год → всего 6 490 ₽. Подписка заканчивается через {daysLeft} дн.
                </p>
              </div>
              <a
                href="/"
                className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition"
              >
                Перейти на год →
              </a>
            </div>
          );
        })()}

        {/* Заголовок */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-heading text-[#1e293b]">Мои коммерческие предложения</h1>
          <p className="text-sm text-gray-500 mt-1">Все созданные КП — отслеживай статусы и открывай в любой момент</p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { key: "draft" as const,    icon: "📝", label: "Черновики" },
            { key: "sent" as const,     icon: "📤", label: "Отправлено" },
            { key: "accepted" as const, icon: "✅", label: "Принято" },
            { key: "rejected" as const, icon: "❌", label: "Отклонено" },
          ].map(({ key, icon, label }) => (
            <div key={key} className="bg-white rounded-xl p-4 shadow-sm text-center">
              <div className="text-xl mb-1">{icon}</div>
              <div className="text-2xl font-bold text-[#1e3a5f]">{counts[key]}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Фильтры */}
        <div className="flex flex-wrap gap-2 mb-4">
          {([["all", "Все"], ["draft", "Черновики"], ["sent", "Отправлено"], ["accepted", "Принято"], ["rejected", "Отклонено"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                filter === key
                  ? "bg-[#1e3a5f] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {label}
              <span className="ml-1.5 opacity-70">
                {key === "all" ? counts.all : counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Подсказка про статусы — показываем если есть КП */}
        {items.length > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-3 text-xs text-blue-600">
            <span className="text-base">💡</span>
            <span>
              <strong>Как отметить отправку:</strong> нажми на кнопку со статусом (например «Черновик») напротив нужного КП — выбери «Отправлено», «Принято» или «Отклонено»
            </span>
          </div>
        )}

        {/* Список КП */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-4xl mb-4">📄</div>
            {items.length === 0 ? (
              <>
                <p className="font-semibold text-[#1e293b] mb-2">Пока нет КП</p>
                <p className="text-sm text-gray-500 mb-6">Создай первое коммерческое предложение за 30 секунд</p>
                <Link
                  href="/"
                  className="inline-block bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold px-6 py-3 rounded-xl transition"
                >
                  ⚡ Создать КП
                </Link>
              </>
            ) : (
              <p className="text-gray-500 text-sm">Нет КП с таким статусом</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((item) => {
              const statusCfg = STATUS_CONFIG[item.status ?? "draft"];
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition group"
                >
                  {/* Иконка / логотип */}
                  <div className="w-12 h-12 bg-[#1e3a5f]/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                    {item.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.logo} alt="" className="w-full h-full object-contain p-1" />
                    ) : (
                      "📄"
                    )}
                  </div>

                  {/* Основная информация */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#1e293b] truncate group-hover:text-[#1e3a5f] transition">
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.createdAt}</div>
                  </div>

                  {/* Статус — выпадающий */}
                  <select
                    value={item.status ?? "draft"}
                    onChange={(e) => setStatus(item.id, e.target.value as KpStatus)}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 ${statusCfg.bg} ${statusCfg.color}`}
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>

                  {/* Действия */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openKp(item)}
                      className="text-sm text-[#1e3a5f] font-semibold hover:underline whitespace-nowrap"
                    >
                      Открыть →
                    </button>
                    {deleteConfirm === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg transition"
                        >
                          Удалить
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(item.id)}
                        className="text-gray-300 hover:text-red-400 transition text-lg leading-none"
                        title="Удалить"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Подсказка о регистрации (только для гостей) */}
        {!user && items.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 text-center mt-4">
            КП хранятся только в этом браузере.{" "}
            <Link href="/login" className="font-semibold underline">
              Войди
            </Link>{" "}
            чтобы не потерять их при смене устройства.
          </div>
        )}
      </div>
    </main>
  );
}
