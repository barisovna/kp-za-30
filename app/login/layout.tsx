import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Войти — КП за 30 секунд",
  description: "Войдите в аккаунт, чтобы сохранять историю КП и управлять подпиской.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
