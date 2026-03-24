import type { Metadata } from "next";
import { Montserrat, Nunito } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-heading",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  display: "swap",
});

const SITE_URL = "https://kp-za-30.vercel.app";

export const metadata: Metadata = {
  title: "КП за 30 секунд — генератор коммерческих предложений",
  description: "Заполни 6 полей и получи профессиональное коммерческое предложение через 30 секунд. Для фрилансеров, ИП и малого бизнеса.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "КП за 30 секунд — генератор коммерческих предложений",
    description: "Заполни 6 полей и получи профессиональное коммерческое предложение через 30 секунд. Без шаблонов, без копипаста.",
    url: SITE_URL,
    siteName: "КП за 30 секунд",
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "КП за 30 секунд — генератор коммерческих предложений",
    description: "Заполни 6 полей и получи профессиональное КП. Для фрилансеров, ИП и малых агентств.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${montserrat.variable} ${nunito.variable}`}>
      <body className="font-body">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
