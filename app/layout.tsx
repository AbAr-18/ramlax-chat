import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geSSTwo = localFont({
  src: "./fonts/GE-SS-Two-Light.otf",
  weight: "300",
  variable: "--font-ge-ss-two",
  display: "swap",
});

export const metadata: Metadata = {
  title: "رمال Rimal X — Prototype",
  description: "Chat Widget Prototype للأسبوع الأول من مشروع رملة",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={geSSTwo.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
