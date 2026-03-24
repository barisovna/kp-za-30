import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Оплата прошла — КП за 30 секунд",
  robots: { index: false },
};

export default function PaymentSuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
