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

// Basitleştirilmiş TR plaka deseni: il kodu 01-81, 1-3 harf (Q, W, X hariç), 2-4 rakam.
const PLAKA_DESENI = /^([0-7][0-9]|8[01])\s?[ABCDEFGHIJKLMNOPRSTUVYZ]{1,3}\s?[0-9]{2,4}$/i;

export function dogrulaPlaka(plaka: string): boolean {
  return PLAKA_DESENI.test(plaka.trim());
}

export function formatPlaka(plaka: string): string {
  const temiz = plaka.trim().toUpperCase().replace(/\s+/g, " ");
  if (!dogrulaPlaka(temiz)) {
    throw new Error(`Geçersiz plaka: ${plaka}`);
  }
  return temiz;
}
