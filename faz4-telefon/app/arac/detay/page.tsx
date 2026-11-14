"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { aracGetir, kullanimSay } from "@/lib/depo";
import {
  bakimaKalanGun,
  hesaplaBakimDurumu,
  kalanGunMetni,
  sonSonrakiBakimTarihi,
} from "@/lib/bakim-durumu";
import { tarihTR } from "@/lib/format";
import { whatsappLinkOlustur } from "@/lib/whatsapp";
import { DurumRozeti } from "@/components/DurumRozeti";
import { Plaka } from "@/components/Plaka";
import { useVeri } from "@/components/VeriSaglayici";

function AracDetayIcerigi() {
  const searchParams = useSearchParams();
  const { veri, guncelle } = useVeri();

  const plaka = (searchParams.get("plaka") ?? "").trim();
  const arac = plaka === "" ? undefined : aracGetir(veri, plaka);

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

  const buAn = new Date();
  const sonrakiBakim = sonSonrakiBakimTarihi(arac);
  // Newest job first: that is the one the mechanic is asked about.
  const islemler = [...arac.islemler].reverse();

  return (
    <>
      <div className="arac-basligi">
        <Plaka plaka={arac.plaka} />
        <div>
          <h1>{arac.musteri}</h1>
          <p className="baslik-alti">{arac.telefon}</p>
        </div>
      </div>

      <div className="bakim-ozeti">
        <div className="bakim-ozeti-metin">
          <span className="ozet-etiketi">Sonraki bakım</span>
          {sonrakiBakim === null ? (
            <span className="ozet-degeri">Kayıt yok</span>
          ) : (
            <>
              <span className="ozet-degeri">{tarihTR(sonrakiBakim)}</span>
              <span className="bakim-kalan">
                {kalanGunMetni(bakimaKalanGun(sonrakiBakim, buAn))}
              </span>
            </>
          )}
        </div>
        <DurumRozeti
          durum={
            sonrakiBakim === null
              ? null
              : hesaplaBakimDurumu(sonrakiBakim, buAn)
          }
        />
      </div>

      <div className="eylem-satiri">
        <a
          className="buyuk-buton buton-whatsapp"
          href={whatsappLinkOlustur(arac)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            void guncelle((v) => kullanimSay(v, "whatsapp")).catch(() => {});
          }}
        >
          WhatsApp&apos;tan Bilgi Ver
        </a>
        <Link
          className="buyuk-buton ikincil-buton"
          href={`/arac/duzenle/?plaka=${encodeURIComponent(arac.plaka)}`}
        >
          Bilgileri Düzenle
        </Link>
      </div>

      <h2>İşlem Geçmişi</h2>
      {islemler.length === 0 ? (
        <p className="bos-durum">Bu araca henüz iş kaydedilmedi.</p>
      ) : (
        <div className="islem-listesi">
          <div className="islem-listesi-basligi" aria-hidden="true">
            <span>Tarih</span>
            <span>Yapılan iş</span>
            <span>Ücret</span>
            <span>Garanti bitişi</span>
            <span>Sonraki bakım</span>
          </div>
          <ul>
            {islemler.map((islem, i) => (
              <li key={i} className="islem-satiri">
                <span className="islem-tarih">{tarihTR(islem.tarih)}</span>
                <span className="islem-is">{islem.yapilanIs}</span>
                <span className="islem-ucret">
                  {islem.ucret.toLocaleString("tr-TR")} TL
                </span>
                <span className="islem-garanti">
                  <span className="islem-alan-adi">Garanti: </span>
                  {islem.garantiBitis === ""
                    ? "Yok"
                    : tarihTR(islem.garantiBitis)}
                </span>
                <span className="islem-bakim">
                  <span className="islem-alan-adi">Sonraki bakım: </span>
                  {tarihTR(islem.sonrakiBakim)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export default function AracDetaySayfasi() {
  return (
    <Suspense fallback={<p className="bos-durum">Yükleniyor…</p>}>
      <AracDetayIcerigi />
    </Suspense>
  );
}
