import type { Arac, Islem } from "./types";
import { plakaAnahtari, plakaBicimle, tarihGecerliMi } from "./format";

// Strict reader and validator for backup JSON files exported from the phone
// app (faz4-telefon). Ports the vehicle/job validation from iceAktar in
// faz4-telefon/lib/depo.ts while ignoring usage counters and sonYedek.

const MAKS_METIN_UZUNLUGU = 200;

export type TelefonYedegiOkumaSonucu =
  | { tamam: true; araclar: Arac[] }
  | { tamam: false; hata: string };

function duzNesneMi(deger: unknown): deger is Record<string, unknown> {
  return typeof deger === "object" && deger !== null && !Array.isArray(deger);
}

class IceAktarmaHatasi extends Error {}

function reddet(mesaj: string): never {
  throw new IceAktarmaHatasi(mesaj);
}

function islemOku(ham: unknown, aracNo: number, islemNo: number): Islem {
  const yer = `${aracNo}. araçtaki ${islemNo}. işlem`;
  if (!duzNesneMi(ham)) reddet(`${yer} okunamadı.`);
  const { tarih, yapilanIs, ucret, garantiBitis, sonrakiBakim } = ham;
  if (typeof tarih !== "string" || !tarihGecerliMi(tarih)) {
    reddet(`${yer}: tarih geçersiz.`);
  }
  if (typeof yapilanIs !== "string") {
    reddet(`${yer}: yapılan iş geçersiz.`);
  }
  if (typeof ucret !== "number" || !Number.isFinite(ucret) || ucret < 0) {
    reddet(`${yer}: ücret geçersiz.`);
  }
  if (
    typeof garantiBitis !== "string" ||
    (garantiBitis !== "" && !tarihGecerliMi(garantiBitis))
  ) {
    reddet(`${yer}: garanti bitiş tarihi geçersiz.`);
  }
  if (typeof sonrakiBakim !== "string" || !tarihGecerliMi(sonrakiBakim)) {
    reddet(`${yer}: sonraki bakım tarihi geçersiz.`);
  }
  return {
    tarih,
    yapilanIs,
    ucret: ucret + 0,
    garantiBitis,
    sonrakiBakim,
  };
}

function aracOku(ham: unknown, aracNo: number): Arac {
  const yer = `${aracNo}. araç`;
  if (!duzNesneMi(ham)) reddet(`${yer} okunamadı.`);
  const { plaka, musteri, telefon, islemler } = ham;
  if (typeof plaka !== "string" || plaka.trim() === "") {
    reddet(`${yer}: plaka eksik.`);
  }
  if (
    typeof musteri !== "string" ||
    musteri.trim() === "" ||
    musteri.length > MAKS_METIN_UZUNLUGU
  ) {
    reddet(
      `${yer}: müşteri adı boş olamaz, en fazla ${MAKS_METIN_UZUNLUGU} karakter olabilir.`
    );
  }
  if (typeof telefon !== "string") {
    reddet(`${yer}: telefon eksik.`);
  }
  if (!Array.isArray(islemler)) {
    reddet(`${yer}: işlem listesi okunamadı.`);
  }
  // Plates that satisfy today's rule are formatted canonically ("34 ABC 123");
  // legacy/custom plates are kept as they are.
  const bicimliPlaka = plakaBicimle(plaka) ?? plaka;
  return {
    plaka: bicimliPlaka,
    musteri,
    telefon,
    islemler: islemler.map((islem: unknown, i: number) =>
      islemOku(islem, aracNo, i + 1)
    ),
  };
}

export function telefonYedeginiOku(metin: string): TelefonYedegiOkumaSonucu {
  try {
    if (typeof metin !== "string") reddet("Yedek dosyası okunamadı.");

    let ham: unknown;
    try {
      ham = JSON.parse(metin);
    } catch {
      reddet("Yedek dosyası okunamadı: dosya bozuk ya da yedek dosyası değil.");
    }

    if (!duzNesneMi(ham)) {
      reddet("Yedek dosyası okunamadı: beklenen biçimde değil.");
    }
    if (ham.surum !== 1) {
      reddet("Bu yedek dosyasının sürümü desteklenmiyor.");
    }
    if (!Array.isArray(ham.araclar)) {
      reddet("Yedek dosyasında araç listesi yok.");
    }

    const araclar = ham.araclar.map((arac: unknown, i: number) =>
      aracOku(arac, i + 1)
    );

    const gorulen = new Set<string>();
    for (const arac of araclar) {
      const anahtar = plakaAnahtari(arac.plaka);
      if (gorulen.has(anahtar)) {
        reddet(`${arac.plaka} plakası yedekte birden fazla araçta var.`);
      }
      gorulen.add(anahtar);
    }

    return {
      tamam: true,
      araclar,
    };
  } catch (e) {
    if (e instanceof IceAktarmaHatasi) return { tamam: false, hata: e.message };
    return { tamam: false, hata: "Yedek dosyası okunamadı." };
  }
}
