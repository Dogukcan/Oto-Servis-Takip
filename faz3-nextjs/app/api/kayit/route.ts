import { NextResponse } from "next/server";
import {
  formatPlaka,
  dogrulaPlaka,
  formatTelefon,
  telefonGecerliMi,
  tarihGecerliMi,
} from "@/lib/format";
import { islemEkle } from "@/lib/db-sorgular";

const MAKS_METIN_UZUNLUGU = 200;

interface KayitGovdesi {
  plaka?: string;
  musteri?: string;
  telefon?: string;
  yapilanIs?: string;
  ucret?: string | number;
  garantiBitis?: string;
  sonrakiBakim?: string;
}

export async function POST(istek: Request) {
  const govde = (await istek.json()) as KayitGovdesi;

  const plaka = String(govde.plaka ?? "").trim();
  const musteri = String(govde.musteri ?? "").trim();
  const telefon = String(govde.telefon ?? "").trim();
  const yapilanIs = String(govde.yapilanIs ?? "").trim();
  const ucret = Number(govde.ucret);
  const garantiBitis = String(govde.garantiBitis ?? "").trim();
  const sonrakiBakim = String(govde.sonrakiBakim ?? "").trim();

  if (!dogrulaPlaka(plaka)) {
    return NextResponse.json({ hata: "Geçerli bir plaka girin." }, { status: 400 });
  }
  if (musteri === "" || musteri.length > MAKS_METIN_UZUNLUGU) {
    return NextResponse.json(
      { hata: `Müşteri adı boş olamaz, en fazla ${MAKS_METIN_UZUNLUGU} karakter olabilir.` },
      { status: 400 }
    );
  }
  if (!telefonGecerliMi(telefon)) {
    return NextResponse.json({ hata: "Geçerli bir telefon numarası girin." }, { status: 400 });
  }
  if (yapilanIs === "" || yapilanIs.length > MAKS_METIN_UZUNLUGU) {
    return NextResponse.json(
      { hata: `Yapılan iş boş olamaz, en fazla ${MAKS_METIN_UZUNLUGU} karakter olabilir.` },
      { status: 400 }
    );
  }
  if (!Number.isFinite(ucret) || ucret < 0) {
    return NextResponse.json({ hata: "Geçerli bir ücret girin." }, { status: 400 });
  }
  if (!tarihGecerliMi(garantiBitis)) {
    return NextResponse.json({ hata: "Geçerli bir garanti bitiş tarihi girin." }, { status: 400 });
  }
  if (!tarihGecerliMi(sonrakiBakim)) {
    return NextResponse.json({ hata: "Geçerli bir sonraki bakım tarihi girin." }, { status: 400 });
  }

  islemEkle(formatPlaka(plaka), musteri, formatTelefon(telefon), {
    tarih: new Date().toISOString().slice(0, 10),
    yapilanIs,
    ucret,
    garantiBitis,
    sonrakiBakim,
  });

  return NextResponse.json({ basarili: true });
}
