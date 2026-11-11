import fs from "node:fs";
import path from "node:path";
import { dbCheckpointEt } from "./db";

const DB_YOLU = path.join(process.cwd(), "servis.db");
const YEDEK_DURUM_YOLU = path.join(process.cwd(), "yedek-durum.json");

export function dbDosyaYolu(): string {
  return DB_YOLU;
}

export interface YedekDurumu {
  basarili: boolean;
  zaman: string;
  hata?: string;
}

function yedekDurumunuYaz(durum: YedekDurumu): void {
  try {
    fs.writeFileSync(YEDEK_DURUM_YOLU, JSON.stringify(durum));
  } catch {
    // Durum dosyası yazılamazsa bile uygulamanın geri kalanı çalışmaya devam etmeli.
  }
}

// UstBar gibi arayüz bileşenleri son otomatik yedekleme denemesinin sonucunu
// göstermek için bunu okur. Hiç deneme yapılmadıysa null döner.
export function yedekDurumunuOku(): YedekDurumu | null {
  try {
    const icerik = fs.readFileSync(YEDEK_DURUM_YOLU, "utf8");
    return JSON.parse(icerik) as YedekDurumu;
  } catch {
    return null;
  }
}

// Her kayıt değişikliğinde çağrılır. YEDEK_KLASORU ortam değişkeni henüz
// ayarlanmadıysa sessizce hiçbir şey yapmaz (kullanıcı Drive/OneDrive
// senkron klasörünün yolunu bildirince .env.local'e eklenecek).
export function otomatikYedekAl(): void {
  const hedefKlasor = process.env.YEDEK_KLASORU;
  if (!hedefKlasor) return;

  try {
    dbCheckpointEt();
    fs.mkdirSync(hedefKlasor, { recursive: true });
    fs.copyFileSync(DB_YOLU, path.join(hedefKlasor, "servis.db"));
    yedekDurumunuYaz({ basarili: true, zaman: new Date().toISOString() });
  } catch (hata) {
    console.error("Otomatik yedek alınamadı:", hata);
    yedekDurumunuYaz({
      basarili: false,
      zaman: new Date().toISOString(),
      hata: hata instanceof Error ? hata.message : String(hata),
    });
  }
}
