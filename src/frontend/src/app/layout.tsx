import type { Metadata } from "next";
import { JetBrains_Mono, Nanum_Myeongjo, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const myeongjo = Nanum_Myeongjo({ 
  weight: ["400", "700", "800"],
  subsets: ["latin"],
  variable: "--font-myeongjo",
});

const gothic = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-gothic",
});

const mono = JetBrains_Mono({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "한국사 오답노트 RAG OS",
  description: "학생을 위한 AI 기반 한국사 학습 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${myeongjo.variable} ${gothic.variable} ${mono.variable}`}>
      <body className="font-gothic antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
