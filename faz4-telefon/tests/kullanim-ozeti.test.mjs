import { test } from "node:test";
import assert from "node:assert/strict";
import { bosVeri, islemEkle, kullanimSay } from "../lib/depo.ts";
import { kullanimOzeti } from "../lib/kullanim-ozeti.ts";

function islem(tarih, yapilanIs = "Akü değişimi", ucret = 1500) {
  return {
    tarih,
    yapilanIs,
    ucret,
    garantiBitis: "",
    sonrakiBakim: "2027-05-14",
  };
}

test("kullanimOzeti: boş veride tüm sayaçlar sıfır ve gün listesi boş", () => {
  const ozet = kullanimOzeti(bosVeri(), new Date(2026, 10, 14, 12, 0));
  assert.deepEqual(ozet, {
    aracSayisi: 0,
    islemSayisi: 0,
    son7Gun: { acilis: 0, kayit: 0, whatsapp: 0 },
    tumZamanlar: { acilis: 0, kayit: 0, whatsapp: 0 },
    gunler: [],
  });
});

test("kullanimOzeti: araç ve işlem sayılarını doğru toplar", () => {
  let veri = bosVeri();
  veri = islemEkle(
    veri,
    "34 ABC 123",
    "Ahmet Yılmaz",
    "0532 123 45 67",
    islem("2026-01-10", "Far ayarı", 300)
  );
  veri = islemEkle(
    veri,
    "34 ABC 123",
    "Ahmet Yılmaz",
    "0532 123 45 67",
    islem("2026-06-20", "Marş motoru", 2500)
  );
  veri = islemEkle(
    veri,
    "01 AB 01",
    "Ayşe Kaya",
    "0533 111 22 33",
    islem("2026-03-05")
  );
  // Include a vehicle with zero jobs (e.g. from an older backup).
  veri = {
    ...veri,
    araclar: [
      ...veri.araclar,
      {
        plaka: "06 ELY 99",
        musteri: "Mehmet Demir",
        telefon: "0544 999 88 77",
        islemler: [],
      },
    ],
  };

  const ozet = kullanimOzeti(veri, new Date(2026, 10, 14, 12, 0));
  assert.equal(ozet.aracSayisi, 3);
  assert.equal(ozet.islemSayisi, 3);
});

test("kullanimOzeti: tüm zamanlar ve son 7 gün toplamlarını doğru hesaplar", () => {
  let veri = bosVeri();
  // Inside 7-day window relative to 2026-11-14:
  veri = kullanimSay(veri, "acilis", "2026-11-14");
  veri = kullanimSay(veri, "acilis", "2026-11-14");
  veri = kullanimSay(veri, "kayit", "2026-11-14");
  veri = kullanimSay(veri, "whatsapp", "2026-11-10");
  veri = kullanimSay(veri, "whatsapp", "2026-11-10");
  veri = kullanimSay(veri, "whatsapp", "2026-11-10");
  // Older than 7 days:
  veri = kullanimSay(veri, "acilis", "2026-09-01");
  veri = kullanimSay(veri, "kayit", "2026-09-01");
  veri = kullanimSay(veri, "kayit", "2026-09-01");
  veri = kullanimSay(veri, "whatsapp", "2026-09-01");

  const ozet = kullanimOzeti(veri, new Date(2026, 10, 14, 18, 45));
  assert.deepEqual(ozet.son7Gun, { acilis: 2, kayit: 1, whatsapp: 3 });
  assert.deepEqual(ozet.tumZamanlar, { acilis: 3, kayit: 3, whatsapp: 4 });
});

test("kullanimOzeti: ay sonunu aşan 7 günlük pencere sınırları (bugün ve önceki 6 gün dahil, 7. gün hariç)", () => {
  // Reference local date: 3 November 2026 (month index 10).
  // The 7-day window covers:
  //   day 0 (today):      2026-11-03 (in)
  //   day 1 back:         2026-11-02 (in)
  //   day 2 back:         2026-11-01 (in)
  //   day 3 back:         2026-10-31 (in, crosses October month-end)
  //   day 4 back:         2026-10-30 (in)
  //   day 5 back:         2026-10-29 (in)
  //   day 6 back:         2026-10-28 (in, 6th day before today)
  //   day 7 back:         2026-10-27 (out, 7th day before today)
  const buAn = new Date(2026, 10, 3, 23, 15);

  let veri = bosVeri();
  const pencereIciGunler = [
    "2026-11-03",
    "2026-11-02",
    "2026-11-01",
    "2026-10-31",
    "2026-10-30",
    "2026-10-29",
    "2026-10-28",
  ];
  for (const gun of pencereIciGunler) {
    veri = kullanimSay(veri, "acilis", gun);
  }
  // 6th day back gets an extra kayit so we can distinguish its boundary from the 7th day back.
  veri = kullanimSay(veri, "kayit", "2026-10-28");

  // 7th day back (must be excluded from son7Gun, but included in tumZamanlar):
  veri = kullanimSay(veri, "acilis", "2026-10-27");
  for (let i = 0; i < 5; i++) {
    veri = kullanimSay(veri, "whatsapp", "2026-10-27");
  }

  const ozet = kullanimOzeti(veri, buAn);
  assert.deepEqual(ozet.son7Gun, { acilis: 7, kayit: 1, whatsapp: 0 });
  assert.deepEqual(ozet.tumZamanlar, { acilis: 8, kayit: 1, whatsapp: 5 });
});

test("kullanimOzeti: günler en yeniden en eskiye sıralanır ve girdi verisi değişmez", () => {
  let veri = bosVeri();
  veri = kullanimSay(veri, "acilis", "2026-10-29");
  veri = kullanimSay(veri, "kayit", "2026-11-03");
  veri = kullanimSay(veri, "whatsapp", "2026-10-27");
  veri = kullanimSay(veri, "acilis", "2026-11-01");

  const kopya = structuredClone(veri);
  const ozet = kullanimOzeti(veri, new Date(2026, 10, 3, 9, 0));

  assert.deepEqual(
    ozet.gunler.map((satir) => satir.gun),
    ["2026-11-03", "2026-11-01", "2026-10-29", "2026-10-27"]
  );
  assert.deepEqual(ozet.gunler[0], {
    gun: "2026-11-03",
    acilis: 0,
    kayit: 1,
    whatsapp: 0,
  });

  // Mutating the returned summary must not mutate `veri`.
  ozet.gunler[0].kayit = 999;
  ozet.son7Gun.acilis = 999;
  ozet.tumZamanlar.whatsapp = 999;
  assert.deepEqual(veri, kopya);
});
