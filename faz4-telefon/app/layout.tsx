import type { Metadata, Viewport } from "next";
import { Barlow } from "next/font/google";
import { KurulumUyarisi } from "@/components/KurulumUyarisi";
import { UstBar } from "@/components/UstBar";
import { VeriIcerigi, VeriSaglayici } from "@/components/VeriSaglayici";
import { TEMA_BASLANGIC_BETIGI } from "@/lib/tema";
import "./globals.css";

const barlow = Barlow({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
  variable: "--yazi-tipi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Servis Takip",
  description: "Oto elektrikçi ustası için bakım takip uygulaması",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The theme script sets data-tema before React loads, so the attribute on
    // <html> differs from the server markup on purpose.
    <html lang="tr" className={barlow.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_BASLANGIC_BETIGI }} />
      </head>
      <body>
        <VeriSaglayici>
          <UstBar />
          <main>
            <KurulumUyarisi />
            <VeriIcerigi>{children}</VeriIcerigi>
          </main>
        </VeriSaglayici>
      </body>
    </html>
  );
}
