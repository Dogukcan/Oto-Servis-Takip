export function formatTelefon(girdi: string): string {
  const sadeceRakam = girdi.replace(/\D/g, "");
  const rakamlar =
    sadeceRakam.length === 11 && sadeceRakam.startsWith("0")
      ? sadeceRakam.slice(1)
      : sadeceRakam;
  if (rakamlar.length !== 10 || rakamlar.startsWith("0")) {
    throw new Error(`Geçersiz telefon numarası: ${girdi}`);
  }
  return `0${rakamlar.slice(0, 3)} ${rakamlar.slice(3, 6)} ${rakamlar.slice(
    6,
    8
  )} ${rakamlar.slice(8, 10)}`;
}

export function telefonGecerliMi(girdi: string): boolean {
  try {
    formatTelefon(girdi);
    return true;
  } catch {
    return false;
  }
}

// Basitleştirilmiş TR plaka deseni: il kodu 01-81 (00 geçersiz), 1-3 harf (Q, W, X hariç), 2-4 rakam.
const PLAKA_PARCALARI =
  /^(0[1-9]|[1-7][0-9]|8[01])([ABCDEFGHIJKLMNOPRSTUVYZ]{1,3})([0-9]{2,4})$/;

// Plakayı tek biçime çevirir: "34abc123", "34 ABC123" ve "34 ABC 123" hepsi
// "34 ABC 123" olur. Aynı aracın boşluk farkıyla iki ayrı kayıt olmasını bu
// engeller. Geçerli bir plaka değilse null döner.
export function plakaBicimle(plaka: string): string | null {
  const esleme = PLAKA_PARCALARI.exec(plaka.toUpperCase().replace(/\s+/g, ""));
  if (!esleme) return null;
  return `${esleme[1]} ${esleme[2]} ${esleme[3]}`;
}

export function dogrulaPlaka(plaka: string): boolean {
  return plakaBicimle(plaka) !== null;
}

export function formatPlaka(plaka: string): string {
  const bicimli = plakaBicimle(plaka);
  if (bicimli === null) {
    throw new Error(`Geçersiz plaka: ${plaka}`);
  }
  return bicimli;
}

export function plakaAnahtari(plaka: string): string {
  return plaka.toUpperCase().replace(/\s+/g, "");
}

// "2026-10-01" -> "01.10.2026". Ekranda gösterim içindir; veritabanında tarih ISO kalır.
export function tarihTR(isoTarih: string): string {
  const [yil, ay, gun] = isoTarih.split("-");
  return `${gun}.${ay}.${yil}`;
}

// "YYYY-MM-DD" formatında, takvimde gerçekten var olan bir tarih mi diye bakar
// (ör. "2026-02-30" formatı doğru ama tarih geçersiz, bunu da reddeder).
export function tarihGecerliMi(tarih: string): boolean {
  const esleme = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tarih);
  if (!esleme) return false;
  const [, yilStr, ayStr, gunStr] = esleme;
  const yil = Number(yilStr);
  const ay = Number(ayStr);
  const gun = Number(gunStr);
  const d = new Date(Date.UTC(yil, ay - 1, gun));
  return (
    d.getUTCFullYear() === yil &&
    d.getUTCMonth() === ay - 1 &&
    d.getUTCDate() === gun
  );
}
