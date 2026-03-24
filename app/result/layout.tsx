import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ваше КП готово — КП за 30 секунд",
  description: "Просмотрите, отредактируйте и скачайте готовое коммерческое предложение в PDF.",
  robots: { index: false },
};

export default function ResultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
