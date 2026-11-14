"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { aracGuncelle } from "@/lib/depo";
import { dogrulaPlaka, telefonGecerliMi } from "@/lib/format";
import { aracGuncellemeDogrula } from "@/lib/kayit-dogrula";
import { detayYolu } from "@/lib/plaka-baglantisi";
import { useVeri } from "./VeriSaglayici";

interface FormHatalari {
  plaka?: string;
  musteri?: string;
  telefon?: string;
}

interface Props {
  plaka: string;
  musteri: string;
  telefon: string;
}

export function AracDuzenleFormu({ plaka, musteri, telefon }: Props) {
  const router = useRouter();
  const { guncelle } = useVeri();
  const [hatalar, setHatalar] = useState<FormHatalari>({});
  const [sunucuHatasi, setSunucuHatasi] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const detayAdresi = detayYolu(plaka);

  async function gonder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (kaydediliyor) return;
    const form = new FormData(e.currentTarget);
    const yeniPlaka = String(form.get("plaka") ?? "").trim();
    const yeniMusteri = String(form.get("musteri") ?? "").trim();
    const yeniTelefon = String(form.get("telefon") ?? "").trim();

    const yeniHatalar: FormHatalari = {};
    // An untouched plate is accepted as it is, even if today's rules would reject it.
    if (yeniPlaka !== plaka && !dogrulaPlaka(yeniPlaka)) {
      yeniHatalar.plaka = "Geçerli bir plaka girin (örn. 34 ABC 123).";
    }
    if (yeniMusteri === "") {
      yeniHatalar.musteri = "Müşteri adı boş olamaz.";
    }
    if (!telefonGecerliMi(yeniTelefon)) {
      yeniHatalar.telefon = "Geçerli bir telefon numarası girin (10 hane).";
    }

    setHatalar(yeniHatalar);
    setSunucuHatasi(null);
    if (Object.keys(yeniHatalar).length > 0) return;

    const dogrulama = aracGuncellemeDogrula({
      eskiPlaka: plaka,
      plaka: yeniPlaka,
      musteri: yeniMusteri,
      telefon: yeniTelefon,
    });

    if (!dogrulama.tamam) {
      setSunucuHatasi(dogrulama.hata);
      return;
    }

    setKaydediliyor(true);
    try {
      await guncelle((v) => {
        const guncelleme = aracGuncelle(
          v,
          dogrulama.eskiPlaka,
          dogrulama.yeniPlaka,
          dogrulama.musteri,
          dogrulama.telefon
        );
        if (guncelleme.sonuc === "plaka-kullanimda") {
          throw new Error("Bu plaka başka bir araçta kayıtlı.");
        }
        if (guncelleme.sonuc === "bulunamadi") {
          throw new Error("Araç bulunamadı.");
        }
        return guncelleme.veri;
      });

      router.push(detayYolu(dogrulama.yeniPlaka));
    } catch (hata) {
      setSunucuHatasi(
        hata instanceof Error && hata.message
          ? hata.message
          : "Kayıt sırasında bir hata oluştu."
      );
      setKaydediliyor(false);
    }
  }

  return (
    <form className="kayit-formu" onSubmit={gonder}>
      <label>
        Plaka
        <input type="text" name="plaka" defaultValue={plaka} />
        {hatalar.plaka && <span className="hata-metni">{hatalar.plaka}</span>}
      </label>
      <label>
        Müşteri Adı
        <input type="text" name="musteri" defaultValue={musteri} />
        {hatalar.musteri && <span className="hata-metni">{hatalar.musteri}</span>}
      </label>
      <label>
        Telefon
        <input type="tel" name="telefon" defaultValue={telefon} />
        {hatalar.telefon && <span className="hata-metni">{hatalar.telefon}</span>}
      </label>
      {sunucuHatasi && <span className="hata-metni">{sunucuHatasi}</span>}
      <div className="eylem-satiri">
        <button className="buyuk-buton" type="submit" disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </button>
        <Link className="buyuk-buton ikincil-buton" href={detayAdresi}>
          Vazgeç
        </Link>
      </div>
    </form>
  );
}
