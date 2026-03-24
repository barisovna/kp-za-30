import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Мои КП — КП за 30 секунд",
  description: "История ваших коммерческих предложений, статистика и управление тарифом.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
