import { yerelTarihISO } from "./format";

export type YedekPaylasimSonucu = "paylasildi" | "indirildi" | "iptal";

// Builds the backup file name for the local calendar day of `buAn`.
export function yedekDosyaAdi(buAn: Date = new Date()): string {
  return `servis-yedek-${yerelTarihISO(buAn)}.json`;
}

// Uses the iOS/Web Share sheet when file sharing is supported, falling back to
// a temporary <a download> with an object URL otherwise.
export async function yedegiPaylasVeyaIndir(
  metin: string,
  dosyaAdi: string
): Promise<YedekPaylasimSonucu> {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof File === "function"
  ) {
    const dosya = new File([metin], dosyaAdi, {
      type: "application/json",
    });
    let paylasilabilir = false;
    try {
      paylasilabilir = navigator.canShare?.({ files: [dosya] }) === true;
    } catch {
      paylasilabilir = false;
    }

    if (paylasilabilir) {
      try {
        await navigator.share({ files: [dosya], title: dosyaAdi });
        return "paylasildi";
      } catch (hata) {
        if (
          typeof hata === "object" &&
          hata !== null &&
          "name" in hata &&
          (hata as { name?: unknown }).name === "AbortError"
        ) {
          return "iptal";
        }
        throw hata;
      }
    }
  }

  const blob = new Blob([metin], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const baglanti = document.createElement("a");
    baglanti.href = url;
    baglanti.download = dosyaAdi;
    baglanti.style.display = "none";
    document.body.appendChild(baglanti);
    baglanti.click();
    document.body.removeChild(baglanti);
  } finally {
    URL.revokeObjectURL(url);
  }
  return "indirildi";
}
