import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Отписка от уведомлений — КП за 30 секунд",
  robots: { index: false },
};

export default function UnsubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
