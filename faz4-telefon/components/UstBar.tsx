"use client";

import { useState } from "react";
import Link from "next/link";
import {
  disaAktar,
  sonYedektenBuYanaGun,
  yedekAlindi,
  type Veri,
} from "@/lib/depo";
import { yedegiPaylasVeyaIndir, yedekDosyaAdi } from "@/lib/yedek-dosyasi";
import { Menu } from "./Menu";
import { TemaDugmesi } from "./TemaDugmesi";
import { useVeri } from "./VeriSaglayici";

function yedekUyariMetni(veri: Veri): string | null {
  if (veri.araclar.length === 0) return null;
  const gecenGun = sonYedektenBuYanaGun(veri);
  if (gecenGun === null) return "Hiç yedek alınmadı";
  if (gecenGun >= 7) return `Son yedek ${gecenGun} gün önce`;
  return null;
}

export function UstBar() {
  const { veri, yukleniyor, hata, guncelle } = useVeri();
  const [yedekleniyor, setYedekleniyor] = useState(false);

  const yedekEngelli = yedekleniyor || yukleniyor || hata !== null;
  const yedekUyarisi =
    yukleniyor || hata !== null ? null : yedekUyariMetni(veri);

  async function yedekAl() {
    if (yedekEngelli) return;
    setYedekleniyor(true);
    try {
      const metin = disaAktar(veri);
      const dosyaAdi = yedekDosyaAdi();
      const sonuc = await yedegiPaylasVeyaIndir(metin, dosyaAdi);
      if (sonuc !== "iptal") {
        await guncelle((v) => yedekAlindi(v));
      }
    } catch {
      // Share or download failed: leave sonYedek untouched.
    } finally {
      setYedekleniyor(false);
    }
  }

  return (
    <header className="ust-bar">
      <Link className="marka" href="/">
        <svg className="marka-isaret" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13.5 2 4 13.5h6.5L9.5 22 20 10h-6.5L13.5 2Z" />
        </svg>
        Servis Takip
      </Link>
      <nav className="menu" aria-label="Ana menü">
        <Menu />
        <button
          type="button"
          className="yedek-dugmesi"
          onClick={yedekAl}
          disabled={yedekEngelli}
        >
          Yedek Al
          {yedekUyarisi !== null && (
            <span className="yedek-uyari">{yedekUyarisi}</span>
          )}
        </button>
        <TemaDugmesi />
      </nav>
    </header>
  );
}
