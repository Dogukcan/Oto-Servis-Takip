"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { aracGetir, aracSil, kullanimSay } from "@/lib/depo";
import type { Arac } from "@/lib/types";
import {
  bakimaKalanGun,
  hesaplaBakimDurumu,
  kalanGunMetni,
  sonSonrakiBakimTarihi,
} from "@/lib/bakim-durumu";
import { tarihTR } from "@/lib/format";
import { duzenleYolu, usePlaka } from "@/lib/plaka-baglantisi";
import { whatsappLinkOlustur } from "@/lib/whatsapp";
import { DurumRozeti } from "@/components/DurumRozeti";
import { Plaka } from "@/components/Plaka";
import { useVeri } from "@/components/VeriSaglayici";

export default function AracDetaySayfasi() {
  const router = useRouter();
  const okunanPlaka = usePlaka();
  const { veri, guncelle } = useVeri();
  const [silmeOnayiAcik, setSilmeOnayiAcik] = useState(false);
  const [siliniyor, setSiliniyor] = useState(false);
  const [silmeHatasi, setSilmeHatasi] = useState<string | null>(null);

  // Keeps the last found vehicle while deletion navigates back to "/", so the
  // page does not flash "Araç bulunamadı." during the redirect.
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
    (siliniyor && sonBulunanRef.current?.plaka === plaka
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

  const buAn = new Date();
  const sonrakiBakim = sonSonrakiBakimTarihi(arac);
  // Newest job first: that is the one the mechanic is asked about.
  const islemler = [...arac.islemler].reverse();
  const aktifPlaka = arac.plaka;

  async function kaydiSil() {
    if (siliniyor) return;
    setSiliniyor(true);
    setSilmeHatasi(null);
    try {
      await guncelle((v) => aracSil(v, aktifPlaka).veri);
      router.push("/");
    } catch (hata) {
      setSilmeHatasi(
        hata instanceof Error && hata.message
          ? hata.message
          : "Kayıt silinirken bir hata oluştu."
      );
      setSiliniyor(false);
    }
  }

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
          href={duzenleYolu(arac.plaka)}
        >
          Bilgileri Düzenle
        </Link>
        <button
          type="button"
          className="buyuk-buton ikincil-buton tehlikeli-buton"
          onClick={() => {
            setSilmeHatasi(null);
            setSilmeOnayiAcik(true);
          }}
          disabled={siliniyor}
        >
          Kaydı Sil
        </button>
      </div>

      {silmeOnayiAcik && (
        <div
          className="onay-kutusu"
          role="region"
          aria-label="Kayıt silme onayı"
        >
          <p className="onay-metni">
            Bu aracın ve {arac.islemler.length} işleminin kaydı kalıcı olarak
            silinecek. Bu işlem geri alınamaz.
          </p>
          {silmeHatasi && <p className="hata-metni">{silmeHatasi}</p>}
          <div className="eylem-satiri">
            <button
              type="button"
              className="buyuk-buton tehlikeli-onay-butonu"
              onClick={kaydiSil}
              disabled={siliniyor}
            >
              {siliniyor ? "Siliniyor..." : "Evet, Sil"}
            </button>
            <button
              type="button"
              className="buyuk-buton ikincil-buton"
              onClick={() => {
                setSilmeOnayiAcik(false);
                setSilmeHatasi(null);
              }}
              disabled={siliniyor}
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

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
