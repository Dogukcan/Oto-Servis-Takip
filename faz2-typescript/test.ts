import { sahteAraclar } from "./sahte-veri.ts";
import { aracBakimDurumu, hesaplaBakimDurumu } from "./bakim-durumu.ts";
import { formatTelefon, dogrulaPlaka, formatPlaka } from "./format.ts";
import { aracAra } from "./arama.ts";

const BU_AN = new Date("2026-11-03");
let basarisizSayisi = 0;

function esitMi(baslik: string, gercek: unknown, beklenen: unknown) {
  const gerceklesti = JSON.stringify(gercek) === JSON.stringify(beklenen);
  console.log(`${gerceklesti ? "OK  " : "FAIL"} ${baslik} -> ${JSON.stringify(gercek)}`);
  if (!gerceklesti) {
    console.log(`     beklenen: ${JSON.stringify(beklenen)}`);
    basarisizSayisi++;
  }
}

// Bakım durumu: sahte-veri.ts'teki 3 araç sırasıyla gecmis/yaklasiyor/uygun üretmeli.
esitMi("34 ABC 123 bakım durumu", aracBakimDurumu(sahteAraclar[0], BU_AN), "gecmis");
esitMi("06 XYZ 456 bakım durumu", aracBakimDurumu(sahteAraclar[1], BU_AN), "yaklasiyor");
esitMi("35 DEF 789 bakım durumu", aracBakimDurumu(sahteAraclar[2], BU_AN), "uygun");

// Saat dilimi regresyon testi: bakım tam "bugün" ise, günün hangi saatinde
// olursa olsun "gecmis" değil "yaklasiyor" dönmeli (UTC/yerel saat farkından etkilenmemeli).
{
  // Yerel saatle doğrudan kuruluyor (UTC çevrimi karıştırmamak için):
  // ay 0-indeksli, bu yüzden 10 = Kasım.
  const buGunSabah = new Date(2026, 10, 3, 4, 0, 0); // 3 Kasım yerel saat 04:00
  const buGunGeceYarisiOncesi = new Date(2026, 10, 3, 23, 59, 0); // 3 Kasım yerel saat 23:59
  esitMi(
    "bakım tam bugünse (sabah) gecmis değil",
    hesaplaBakimDurumu("2026-11-03", buGunSabah),
    "yaklasiyor"
  );
  esitMi(
    "bakım tam bugünse (gece yarısından hemen önce) gecmis değil",
    hesaplaBakimDurumu("2026-11-03", buGunGeceYarisiOncesi),
    "yaklasiyor"
  );
}

// Telefon formatı
esitMi("formatTelefon 11 hane (0 ile)", formatTelefon("05321112233"), "0532 111 22 33");
esitMi("formatTelefon boşluklu girdi", formatTelefon("0 532 111 22 33"), "0532 111 22 33");
esitMi("formatTelefon 10 hane (0'sız)", formatTelefon("5321112233"), "0532 111 22 33");

// Eksik haneli, hâlâ 0 ile başlayan numara reddedilmeli (önceki hata: başa fazladan 0 ekliyordu).
{
  let hataFirladiMi = false;
  try {
    formatTelefon("0535444536"); // 10 hane ama hâlâ 0 ile başlıyor, bir hane eksik
  } catch {
    hataFirladiMi = true;
  }
  esitMi("formatTelefon eksik haneli 0'lı numarayı reddeder", hataFirladiMi, true);
}

// Plaka doğrulama ve format
esitMi("dogrulaPlaka geçerli", dogrulaPlaka("34 ABC 123"), true);
esitMi("dogrulaPlaka geçersiz harf (Q)", dogrulaPlaka("34 QBC 123"), false);
esitMi("formatPlaka normalize eder", formatPlaka("34abc123"), "34ABC123");
esitMi("formatPlaka boşlukları sadeleştirir", formatPlaka("34   abc   123"), "34 ABC 123");

// Arama
esitMi(
  "aracAra plakanın parçasıyla bulur",
  aracAra(sahteAraclar, "abc").map((a) => a.plaka),
  ["34 ABC 123"]
);
esitMi(
  "aracAra boşluk/küçük harf farkını yok sayar",
  aracAra(sahteAraclar, "06xyz").map((a) => a.plaka),
  ["06 XYZ 456"]
);
esitMi("aracAra eşleşme yoksa boş döner", aracAra(sahteAraclar, "99 ZZZ 999"), []);
esitMi("aracAra boş sorguda tüm araçları döner", aracAra(sahteAraclar, "").length, 3);

console.log("");
if (basarisizSayisi > 0) {
  console.log(`${basarisizSayisi} test başarısız.`);
  process.exit(1);
} else {
  console.log("Tüm testler geçti.");
}
