import type { Metadata } from "next";

import { AuthProvider } from "@/lib/auth";

import "./globals.css";

export const metadata: Metadata = {
  title: "AUTO CORE แพลตฟอร์มงานบริการอัจฉริยะ",
  description: "ระบบผู้ช่วย AI สำหรับงานเคลม ซัพพอร์ต และปฏิบัติการศูนย์บริการ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
