import type { Metadata, Viewport } from "next";
import { Barlow } from "next/font/google";
import { KurulumUyarisi } from "@/components/KurulumUyarisi";
import { ServisCalisaniKaydi } from "@/components/ServisCalisaniKaydi";
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

// Next's metadata/icons string URLs are not prefixed with basePath on static
// export unless built from the configured basePath prefix here.
const tabanYol = process.env.TELEFON_BASE_PATH || "";

export const metadata: Metadata = {
  title: "Servis Takip",
  description: "Oto elektrikçi ustası için bakım takip uygulaması",
  // Private tool for one workshop and must not appear in search engines.
  robots: { index: false, follow: false },
  manifest: `${tabanYol}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    title: "Servis Takip",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      {
        url: `${tabanYol}/icons/icon.svg`,
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: `${tabanYol}/icons/apple-touch-icon.png`,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0c" },
  ],
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
        <ServisCalisaniKaydi />
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
