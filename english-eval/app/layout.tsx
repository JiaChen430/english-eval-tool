import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Eval - 英文表达训练",
  description: "提升英文口语和写作能力的智能练习工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
