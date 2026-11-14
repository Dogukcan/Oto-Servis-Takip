"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BAGLANTILAR = [
  { href: "/", etiket: "Araç Listesi" },
  { href: "/kayit/", etiket: "Yeni Kayıt" },
  { href: "/arac/", etiket: "Araç Ara" },
  { href: "/hatirlatma/", etiket: "Hatırlatmalar" },
  { href: "/yedek/", etiket: "Yedek" },
  { href: "/kullanim/", etiket: "Kullanım" },
];

// Normalises paths so active-link matching works both with and without
// trailingSlash enabled.
function temizYol(yol: string): string {
  return yol.length > 1 && yol.endsWith("/") ? yol.slice(0, -1) : yol;
}

function aktifMi(yol: string, href: string): boolean {
  const temiz = temizYol(yol);
  const hedef = temizYol(href);
  if (hedef === "/") return temiz === "/";
  return temiz === hedef || temiz.startsWith(`${hedef}/`);
}

export function Menu() {
  const yol = usePathname();

  return (
    <>
      {BAGLANTILAR.map((baglanti) => (
        <Link
          key={baglanti.href}
          href={baglanti.href}
          aria-current={aktifMi(yol, baglanti.href) ? "page" : undefined}
        >
          {baglanti.etiket}
        </Link>
      ))}
    </>
  );
}
