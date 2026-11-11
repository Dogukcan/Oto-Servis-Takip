import { NextResponse } from "next/server";
import {
  formatPlaka,
  dogrulaPlaka,
  formatTelefon,
  telefonGecerliMi,
  plakaAnahtari,
} from "@/lib/format";
import { aracGuncelle, tumAraclariGetir } from "@/lib/db-sorgular";

const MAKS_METIN_UZUNLUGU = 200;

interface GuncellemeGovdesi {
  eskiPlaka?: string;
  plaka?: string;
  musteri?: string;
  telefon?: string;
}

export async function PUT(istek: Request) {
  let govde: GuncellemeGovdesi;
  try {
    const ham: unknown = await istek.json();
    if (typeof ham !== "object" || ham === null) throw new Error("not an object");
    govde = ham as GuncellemeGovdesi;
  } catch {
    return NextResponse.json({ hata: "İstek okunamadı." }, { status: 400 });
  }

  const eskiPlaka = String(govde.eskiPlaka ?? "").trim();
  const plaka = String(govde.plaka ?? "").trim();
  const musteri = String(govde.musteri ?? "").trim();
  const telefon = String(govde.telefon ?? "").trim();

  // An untouched plate is not re-validated or re-checked for clashes. Older
  // records may hold a plate the current rules reject, and their name and
  // phone must still be editable.
  const plakaDegisti = plaka !== eskiPlaka;

  if (eskiPlaka === "") {
    return NextResponse.json({ hata: "Düzenlenecek araç belirtilmedi." }, { status: 400 });
  }
  if (plakaDegisti && !dogrulaPlaka(plaka)) {
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

  const yeniPlaka = plakaDegisti ? formatPlaka(plaka) : eskiPlaka;

  // "34 ABC 123" and "34ABC123" are the same car. The database compares text
  // exactly, so the clash is checked here on the space-free form as well.
  const ayniPlakaliBaskaArac =
    yeniPlaka !== eskiPlaka &&
    tumAraclariGetir().some(
      (arac) =>
        arac.plaka !== eskiPlaka &&
        plakaAnahtari(arac.plaka) === plakaAnahtari(yeniPlaka)
    );
  if (ayniPlakaliBaskaArac) {
    return NextResponse.json(
      { hata: "Bu plaka başka bir araçta kayıtlı." },
      { status: 409 }
    );
  }

  const sonuc = aracGuncelle(eskiPlaka, yeniPlaka, musteri, formatTelefon(telefon));

  if (sonuc === "bulunamadi") {
    return NextResponse.json({ hata: "Araç bulunamadı." }, { status: 404 });
  }
  if (sonuc === "plaka-kullanimda") {
    return NextResponse.json(
      { hata: "Bu plaka başka bir araçta kayıtlı." },
      { status: 409 }
    );
  }

  return NextResponse.json({ basarili: true, plaka: yeniPlaka });
}
