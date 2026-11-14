// Command-line entry point to import a phone backup JSON file into the PC
// SQLite database.
// Usage:
//   npm run telefon-yedegi-al -- <dosya.json>        (dry run)
//   npm run telefon-yedegi-al -- <dosya.json> --yaz  (writes after backup)
import fs from "node:fs";
import path from "node:path";
import "./cozumleyici.mjs";

const ONCESI_YEDEK_ADI = "servis-telefon-aktarimi-oncesi.db";

const argumanlar = process.argv.slice(2);
let yaz = false;
const dosyaArgumanlari = [];

for (const arg of argumanlar) {
  if (arg === "--yaz") {
    yaz = true;
  } else if (arg.startsWith("-")) {
    console.error(`Bilinmeyen seçenek: ${arg}`);
    console.error(
      "Kullanım: npm run telefon-yedegi-al -- <yedek-dosyasi.json> [--yaz]"
    );
    process.exit(1);
  } else {
    dosyaArgumanlari.push(arg);
  }
}

if (dosyaArgumanlari.length !== 1) {
  console.error(
    "Kullanım: npm run telefon-yedegi-al -- <yedek-dosyasi.json> [--yaz]"
  );
  process.exit(1);
}

const yedekDosyaYolu = dosyaArgumanlari[0];
let metin;
try {
  metin = fs.readFileSync(yedekDosyaYolu, "utf8");
} catch {
  console.error(`Yedek dosyası okunamadı: ${yedekDosyaYolu}`);
  process.exit(1);
}

const { telefonYedeginiOku } = await import("../lib/telefon-yedegi.ts");
const okuma = telefonYedeginiOku(metin);
if (!okuma.tamam) {
  console.error(`Yedek dosyası geçersiz: ${okuma.hata}`);
  process.exit(1);
}

const { DB_YOLU } = await import("../lib/dosya-yollari.ts");
const oncesiYedekYolu = path.join(path.dirname(DB_YOLU), ONCESI_YEDEK_ADI);

if (yaz && fs.existsSync(oncesiYedekYolu)) {
  console.error(
    `Aktarım öncesi yedek dosyası zaten var: ${ONCESI_YEDEK_ADI}. Devam etmeden önce bu dosyayı başka bir yere taşıyın.`
  );
  process.exit(1);
}

const { db, dbCheckpointEt } = await import("../lib/db.ts");
const { telefonYedeginiIceAl } = await import("../lib/telefon-yedegi-al.ts");

try {
  const onRapor = telefonYedeginiIceAl(okuma.araclar, { yaz: false });

  if (onRapor.cakisanPlakalar.length > 0) {
    console.error(
      "Veritabanında zaten kayıtlı olan plakalar bulundu, hiçbir kayıt yazılmadı:"
    );
    for (const plaka of onRapor.cakisanPlakalar) {
      console.error(`  - ${plaka}`);
    }
    console.error(`Çakışan araç sayısı: ${onRapor.cakisanPlakalar.length}`);
    console.error(`Eklenecek araç sayısı: ${onRapor.eklenecekAracSayisi}`);
    console.error(`Eklenecek işlem sayısı: ${onRapor.eklenecekIslemSayisi}`);
    process.exitCode = 1;
  } else if (!yaz) {
    console.log("Deneme çalışması (veritabanına hiçbir kayıt yazılmadı):");
    console.log(`Eklenecek araç sayısı: ${onRapor.eklenecekAracSayisi}`);
    console.log(`Eklenecek işlem sayısı: ${onRapor.eklenecekIslemSayisi}`);
    console.log("Kaydetmek için komutu --yaz seçeneğiyle çalıştırın.");
  } else {
    dbCheckpointEt();
    fs.copyFileSync(DB_YOLU, oncesiYedekYolu, fs.constants.COPYFILE_EXCL);
    const rapor = telefonYedeginiIceAl(okuma.araclar, { yaz: true });
    console.log(`Aktarım öncesi veritabanı yedeği alındı: ${ONCESI_YEDEK_ADI}`);
    console.log("Telefon yedeği başarıyla aktarıldı:");
    console.log(`Eklenen araç sayısı: ${rapor.eklenecekAracSayisi}`);
    console.log(`Eklenen işlem sayısı: ${rapor.eklenecekIslemSayisi}`);
  }
} finally {
  db.close();
}
