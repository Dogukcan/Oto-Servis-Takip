import type { Metadata } from "next";
import { UstBar } from "@/components/UstBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Servis Takip",
  description: "Oto elektrikçi ustası için bakım takip uygulaması",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <UstBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
