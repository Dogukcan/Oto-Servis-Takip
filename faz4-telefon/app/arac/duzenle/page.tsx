"use client";

import { Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { aracGetir } from "@/lib/depo";
import type { Arac } from "@/lib/types";
import { AracDuzenleFormu } from "@/components/AracDuzenleFormu";
import { useVeri } from "@/components/VeriSaglayici";

function AracDuzenleIcerigi() {
  const searchParams = useSearchParams();
  const { veri } = useVeri();

  const plaka = (searchParams.get("plaka") ?? "").trim();
  const guncelArac = plaka === "" ? undefined : aracGetir(veri, plaka);

  // Keeps the last found vehicle for this query parameter so that renaming the
  // plate does not flash "Araç bulunamadı." while router.push navigates to the
  // new plate's detail page.
  const sonBulunanRef = useRef<{ plaka: string; arac: Arac } | null>(null);
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
        plaka={arac.plaka}
        musteri={arac.musteri}
        telefon={arac.telefon}
      />
    </>
  );
}

export default function AracDuzenleSayfasi() {
  return (
    <Suspense fallback={<p className="bos-durum">Yükleniyor…</p>}>
      <AracDuzenleIcerigi />
    </Suspense>
  );
}
