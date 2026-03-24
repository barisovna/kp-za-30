import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Партнёрская программа — КП за 30 секунд",
  description: "Зарабатывайте 20% с каждой оплаты реферала. Получите реферальную ссылку и отслеживайте статистику.",
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
