"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BAGLANTILAR = [
  { href: "/", etiket: "Araç Listesi" },
  { href: "/kayit", etiket: "Yeni Kayıt" },
  { href: "/arac", etiket: "Araç Ara" },
  { href: "/hatirlatma", etiket: "Hatırlatmalar" },
];

function aktifMi(yol: string, href: string): boolean {
  if (href === "/") return yol === "/";
  return yol === href || yol.startsWith(`${href}/`);
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
