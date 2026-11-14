"use client";

import { useRef } from "react";
import Link from "next/link";
import { aracGetir } from "@/lib/depo";
import { usePlaka } from "@/lib/plaka-baglantisi";
import type { Arac } from "@/lib/types";
import { AracDuzenleFormu } from "@/components/AracDuzenleFormu";
import { useVeri } from "@/components/VeriSaglayici";

export default function AracDuzenleSayfasi() {
  const okunanPlaka = usePlaka();
  const { veri } = useVeri();

  // Keeps the last found vehicle for this fragment so that renaming the plate
  // does not flash "Araç bulunamadı." while router.push navigates to the new
  // plate's detail page.
  const sonBulunanRef = useRef<{ plaka: string; arac: Arac } | null>(null);

  if (okunanPlaka === null) {
    return <p className="bos-durum">Yükleniyor…</p>;
  }

  const plaka = okunanPlaka;
  const guncelArac = plaka === "" ? undefined : aracGetir(veri, plaka);

  if (guncelArac !== undefined) {
    sonBulunanRef.current = { plaka, arac: guncelArac };
  }
  const arac =
    guncelArac ??
    (sonBulunanRef.current?.plaka === plaka
      ? sonBulunanRef.current.arac
      : undefined);

  if (!arac) {
    return (
      <>
        <h1>Araç bulunamadı.</h1>
        <p className="bos-durum">
          {plaka
            ? `"${plaka}" plakalı araç kayıtlarda yok.`
            : "Araç bulunamadı."}
        </p>
        <div className="eylem-satiri eylem-ust-bosluk">
          <Link className="buyuk-buton ikincil-buton" href="/">
            Araç Listesine Dön
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Bilgileri Düzenle</h1>
      <p className="baslik-alti form-aciklamasi">
        Plakayı değiştirirseniz aracın işlem geçmişi yeni plakaya taşınır.
      </p>
      <AracDuzenleFormu
        key={arac.plaka}
        plaka={arac.plaka}
        musteri={arac.musteri}
        telefon={arac.telefon}
      />
    </>
  );
}
