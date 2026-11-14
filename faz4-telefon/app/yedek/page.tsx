"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  disaAktar,
  iceAktar,
  yedekAlindi,
  yedektenYukle,
  type Veri,
} from "@/lib/depo";
import { tarihTR, yerelTarihISO } from "@/lib/format";
import { yedegiPaylasVeyaIndir, yedekDosyaAdi } from "@/lib/yedek-dosyasi";
import { useVeri } from "@/components/VeriSaglayici";

interface BekleyenYedek {
  dosyaAdi: string;
  veri: Veri;
}

function sonYedekMetni(sonYedek: string | null): string {
  if (sonYedek === null) return "Hiç yedek alınmadı";
  const tarih = new Date(sonYedek);
  if (Number.isNaN(tarih.getTime())) return "Hiç yedek alınmadı";
  return tarihTR(yerelTarihISO(tarih));
}

function toplamIslemSayisi(veri: Veri): number {
  let toplam = 0;
  for (const arac of veri.araclar) {
    toplam += arac.islemler.length;
  }
  return toplam;
}

export default function YedekSayfasi() {
  const { veri, yukleniyor, hata, guncelle } = useVeri();
  const dosyaInputRef = useRef<HTMLInputElement>(null);

  const [yedekleniyor, setYedekleniyor] = useState(false);
  const [bekleyenYedek, setBekleyenYedek] = useState<BekleyenYedek | null>(null);
  const [yuklemeHatasi, setYuklemeHatasi] = useState<string | null>(null);
  const [yuklemeBasarisi, setYuklemeBasarisi] = useState<string | null>(null);
  const [geriYukleniyor, setGeriYukleniyor] = useState(false);

  const yedekEngelli = yedekleniyor || yukleniyor || hata !== null;

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

  async function dosyaSecildi(e: ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    setYuklemeHatasi(null);
    setYuklemeBasarisi(null);
    setBekleyenYedek(null);

    if (!dosya) return;

    let metin: string;
    try {
      metin = await dosya.text();
    } catch {
      setYuklemeHatasi("Yedek dosyası okunamadı.");
      return;
    }

    const sonuc = iceAktar(metin);
    if (!sonuc.tamam) {
      setYuklemeHatasi(sonuc.hata);
      return;
    }

    setBekleyenYedek({ dosyaAdi: dosya.name, veri: sonuc.veri });
  }

  async function geriYuklemeyiOnayla() {
    if (!bekleyenYedek || geriYukleniyor) return;
    const dosyadanGelenVeri = bekleyenYedek.veri;
    const yuklenenAracSayisi = dosyadanGelenVeri.araclar.length;
    const yuklenenIslemSayisi = toplamIslemSayisi(dosyadanGelenVeri);

    setGeriYukleniyor(true);
    setYuklemeHatasi(null);
    try {
      await guncelle((v) => yedektenYukle(v, dosyadanGelenVeri));
      setBekleyenYedek(null);
      if (dosyaInputRef.current) {
        dosyaInputRef.current.value = "";
      }
      setYuklemeBasarisi(
        `Yedek geri yüklendi (${yuklenenAracSayisi} araç, ${yuklenenIslemSayisi} işlem).`
      );
    } catch (hata) {
      setYuklemeHatasi(
        hata instanceof Error && hata.message
          ? hata.message
          : "Yedek geri yüklenirken bir hata oluştu."
      );
    } finally {
      setGeriYukleniyor(false);
    }
  }

  function geriYuklemeyiIptalEt() {
    setBekleyenYedek(null);
    setYuklemeHatasi(null);
    if (dosyaInputRef.current) {
      dosyaInputRef.current.value = "";
    }
  }

  const mevcutAracSayisi = veri.araclar.length;
  const mevcutIslemSayisi = toplamIslemSayisi(veri);
  const dosyaAracSayisi = bekleyenYedek?.veri.araclar.length ?? 0;
  const dosyaIslemSayisi = bekleyenYedek
    ? toplamIslemSayisi(bekleyenYedek.veri)
    : 0;
  const kayipUyarisiVar =
    mevcutAracSayisi > dosyaAracSayisi || mevcutIslemSayisi > dosyaIslemSayisi;

  return (
    <>
      <h1>Yedek</h1>

      <div className="form-izgara">
        <section className="form-paneli">
          <h2>Yedek Al</h2>
          <p className="alan-notu">
            Kayıtlarınızı telefonunuza veya bulut klasörünüze JSON dosyası
            olarak kaydedin.
          </p>
          {hata === null && (
            <div className="bakim-ozeti yedek-durum-kutusu">
              <div className="bakim-ozeti-metin">
                <span className="ozet-etiketi">Son yedek</span>
                <span className="ozet-degeri">
                  {sonYedekMetni(veri.sonYedek)}
                </span>
              </div>
            </div>
          )}
          <div className="eylem-satiri">
            <button
              type="button"
              className="buyuk-buton"
              onClick={yedekAl}
              disabled={yedekEngelli}
            >
              {yedekleniyor ? "Yedek Hazırlanıyor..." : "Yedek Al"}
            </button>
          </div>
        </section>

        <section className="form-paneli">
          <h2>Yedekten Geri Yükle</h2>
          <p className="alan-notu">
            Daha önce aldığınız <code>.json</code> yedek dosyasını seçin.
          </p>
          <div className="kayit-formu">
            <label className="dosya-secici-etiketi">
              Yedek Dosyası (.json)
              <input
                ref={dosyaInputRef}
                type="file"
                accept=".json,application/json"
                onChange={dosyaSecildi}
                disabled={geriYukleniyor}
              />
            </label>
          </div>

          {yuklemeHatasi && (
            <p className="hata-metni" role="alert">
              {yuklemeHatasi}
            </p>
          )}

          {yuklemeBasarisi && (
            <p className="basari-metni" role="status">
              {yuklemeBasarisi}
            </p>
          )}

          {bekleyenYedek && (
            <div
              className="onay-kutusu"
              role="region"
              aria-label="Yedekten geri yükleme onayı"
            >
              <dl className="yedek-ozet-listesi">
                <div>
                  <dt>Seçilen dosya</dt>
                  <dd>{bekleyenYedek.dosyaAdi}</dd>
                </div>
                <div>
                  <dt>Telefondaki mevcut kayıt</dt>
                  <dd>
                    {mevcutAracSayisi} araç, {mevcutIslemSayisi} işlem
                  </dd>
                </div>
                <div>
                  <dt>Dosyadaki kayıt</dt>
                  <dd>
                    {dosyaAracSayisi} araç, {dosyaIslemSayisi} işlem
                  </dd>
                </div>
              </dl>
              <p className="onay-metni">
                Telefonda: {mevcutAracSayisi} araç, {mevcutIslemSayisi} işlem.{" "}
                Dosyada: {dosyaAracSayisi} araç, {dosyaIslemSayisi} işlem.{" "}
                Telefondaki kayıtların yerine dosyadaki kayıtlar yüklenecek. Bu
                işlem geri alınamaz.
              </p>
              {kayipUyarisiVar && (
                <p className="onay-metni" role="alert">
                  Uyarı: Telefonda dosyadakinden daha fazla kayıt var. Geri
                  yüklerseniz telefondaki yeni kayıtlar kaybolacaktır.
                </p>
              )}
              <div className="eylem-satiri">
                <button
                  type="button"
                  className="buyuk-buton tehlikeli-onay-butonu"
                  onClick={geriYuklemeyiOnayla}
                  disabled={geriYukleniyor}
                >
                  {geriYukleniyor
                    ? "Yükleniyor..."
                    : "Onayla ve Yedekten Geri Yükle"}
                </button>
                <button
                  type="button"
                  className="buyuk-buton ikincil-buton"
                  onClick={geriYuklemeyiIptalEt}
                  disabled={geriYukleniyor}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
