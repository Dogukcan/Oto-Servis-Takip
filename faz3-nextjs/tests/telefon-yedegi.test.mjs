// Tests for lib/telefon-yedegi.ts (telefonYedeginiOku) and
// lib/telefon-yedegi-al.ts (telefonYedeginiIceAl). Runs against a fresh
// database in an OS temp directory (see tests/kurulum.mjs); the guard below
// aborts before the database is opened if that is not the case.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { guvenliYollariDogrula, ornekIslem } from "./guvenlik.mjs";

const { geciciKlasor } = await guvenliYollariDogrula();

const { db } = await import("../lib/db.ts");
const { tumAraclariGetir, aracGetir } = await import("../lib/db-sorgular.ts");
const { telefonYedeginiOku } = await import("../lib/telefon-yedegi.ts");
const { telefonYedeginiIceAl } = await import("../lib/telefon-yedegi-al.ts");

after(() => {
  delete process.env.YEDEK_KLASORU;
  db.close();
});

function yedekMetni(araclar, ekAlanlar = {}) {
  return JSON.stringify({
    surum: 1,
    araclar,
    kullanim: { "2026-11-10": { acilis: 3, kayit: 2, whatsapp: 1 } },
    sonYedek: "2026-11-10T18:00:00.000Z",
    ...ekAlanlar,
  });
}

function aracSayisi() {
  return db.prepare("SELECT COUNT(*) AS sayi FROM araclar").get().sayi;
}

function toplamIslemSayisi() {
  return db.prepare("SELECT COUNT(*) AS sayi FROM islemler").get().sayi;
}

// 1. Validation failures (at least six malformed inputs from iceAktar rules)

test("telefonYedeginiOku: rejects malformed inputs", () => {
  const gecerliArac = {
    plaka: "41 KCL 101",
    musteri: "Ali Veli",
    telefon: "0532 100 00 01",
    islemler: [ornekIslem()],
  };

  const bozukGirdiler = [
    // 1. Corrupt JSON string
    "{bozuk json",
    // 2. Root value is an array instead of a plain object
    "[]",
    // 3. Unsupported backup schema version
    yedekMetni([gecerliArac], { surum: 2 }),
    // 4. Missing araclar array
    yedekMetni(null),
    // 5. Vehicle with blank plate
    yedekMetni([{ ...gecerliArac, plaka: "   " }]),
    // 6. Vehicle with empty or overly long customer name
    yedekMetni([{ ...gecerliArac, musteri: "" }]),
    yedekMetni([{ ...gecerliArac, musteri: "A".repeat(201) }]),
    // 7. Job with invalid calendar date (Feb 30)
    yedekMetni([
      {
        ...gecerliArac,
        islemler: [ornekIslem({ tarih: "2026-02-30" })],
      },
    ]),
    // 8. Job with negative fee
    yedekMetni([
      {
        ...gecerliArac,
        islemler: [ornekIslem({ ucret: -50 })],
      },
    ]),
    // 9. Job with non-empty invalid warranty date
    yedekMetni([
      {
        ...gecerliArac,
        islemler: [ornekIslem({ garantiBitis: "2026-13-01" })],
      },
    ]),
    // 10. Duplicate plates in the same backup (differing only by spacing)
    yedekMetni([
      gecerliArac,
      { ...gecerliArac, plaka: "41KCL101", musteri: "Başka İsim" },
    ]),
  ];

  for (const girdi of bozukGirdiler) {
    const sonuc = telefonYedeginiOku(girdi);
    assert.equal(sonuc.tamam, false, `Expected failure for input: ${girdi}`);
    assert.equal(typeof sonuc.hata, "string");
    assert.ok(sonuc.hata.length > 0);
  }
});

// 2. Canonical plate form and ignoring usage counters / sonYedek

test("telefonYedeginiOku: formats valid plates canonically, keeps non-standard plates, ignores kullanim and sonYedek", () => {
  const metin = JSON.stringify({
    surum: 1,
    araclar: [
      {
        plaka: "41kcl101",
        musteri: "Standart Plaka",
        telefon: "0532 100 00 01",
        islemler: [
          ornekIslem({ tarih: "2026-11-01", yapilanIs: "İlk iş" }),
          ornekIslem({ tarih: "2026-11-05", yapilanIs: "İkinci iş" }),
        ],
      },
      {
        plaka: "34 İBC 23",
        musteri: "Türkçe İ Harfli",
        telefon: "0532 100 00 02",
        islemler: [],
      },
      {
        plaka: "OZEL-PLAKA-99",
        musteri: "Eski Kayıt",
        telefon: "0532 100 00 03",
        islemler: [],
      },
    ],
    // Usage counters and sonYedek are ignored even when omitted or arbitrary.
  });

  const sonuc = telefonYedeginiOku(metin);
  assert.equal(sonuc.tamam, true);
  assert.equal(sonuc.araclar.length, 3);
  assert.equal(sonuc.araclar[0].plaka, "41 KCL 101");
  assert.deepEqual(
    sonuc.araclar[0].islemler.map((i) => i.yapilanIs),
    ["İlk iş", "İkinci iş"]
  );
  assert.equal(sonuc.araclar[1].plaka, "34 IBC 23");
  assert.equal(sonuc.araclar[2].plaka, "OZEL-PLAKA-99");
});

// 3. Dry run writes nothing

test("telefonYedeginiIceAl: dry run (yaz: false) reports counts and writes nothing", () => {
  const baslangicArac = aracSayisi();
  const baslangicIslem = toplamIslemSayisi();

  const okuma = telefonYedeginiOku(
    yedekMetni([
      {
        plaka: "41 DRY 101",
        musteri: "Deneme Müşteri",
        telefon: "0532 111 00 01",
        islemler: [
          ornekIslem({ yapilanIs: "İş 1" }),
          ornekIslem({ yapilanIs: "İş 2" }),
        ],
      },
    ])
  );
  assert.equal(okuma.tamam, true);

  const rapor = telefonYedeginiIceAl(okuma.araclar, { yaz: false });
  assert.deepEqual(rapor, {
    eklenecekAracSayisi: 1,
    eklenecekIslemSayisi: 2,
    cakisanPlakalar: [],
    yazildi: false,
  });

  assert.equal(aracSayisi(), baslangicArac);
  assert.equal(toplamIslemSayisi(), baslangicIslem);
  assert.equal(aracGetir("41 DRY 101"), undefined);
});

// 4. Clash (including spacing difference against seeded vehicles) writes nothing

test("telefonYedeginiIceAl: a clash, including one differing only by spacing, writes nothing at all", () => {
  // Fresh DB is seeded with "34 ABC 123", "06 XYZ 456", "35 DEF 789".
  const baslangicArac = aracSayisi();
  const baslangicIslem = toplamIslemSayisi();
  const mevcutArac = aracGetir("06 XYZ 456");
  assert.ok(mevcutArac);

  const adayAraclar = [
    {
      plaka: "41 YEN 901",
      musteri: "Yeni Araç",
      telefon: "0532 900 00 01",
      islemler: [ornekIslem({ yapilanIs: "Yazılmamalı" })],
    },
    {
      // Clashes with seeded "06 XYZ 456" when compared via plakaAnahtari
      plaka: "06XYZ456",
      musteri: "Farklı İsim",
      telefon: "0599 999 99 99",
      islemler: [ornekIslem({ yapilanIs: "Çakışan iş" })],
    },
  ];

  const rapor = telefonYedeginiIceAl(adayAraclar, { yaz: true });
  assert.deepEqual(rapor, {
    eklenecekAracSayisi: 1,
    eklenecekIslemSayisi: 1,
    cakisanPlakalar: ["06XYZ456"],
    yazildi: false,
  });

  // Neither the non-clashing vehicle nor the clashing one was written or altered.
  assert.equal(aracSayisi(), baslangicArac);
  assert.equal(toplamIslemSayisi(), baslangicIslem);
  assert.equal(aracGetir("41 YEN 901"), undefined);
  assert.deepEqual(aracGetir("06 XYZ 456"), mevcutArac);
});

// 5. Failure in the middle of the write rolls everything back

test("telefonYedeginiIceAl: a failure in the middle of the write rolls everything back", () => {
  const baslangicArac = aracSayisi();
  const baslangicIslem = toplamIslemSayisi();

  const bozukListe = [
    {
      plaka: "48 RLB 101",
      musteri: "İlk Araç",
      telefon: "0532 800 00 01",
      islemler: [ornekIslem({ yapilanIs: "Geçerli iş" })],
    },
    {
      plaka: "48 RLB 102",
      musteri: "İkinci Araç",
      telefon: "0532 800 00 02",
      islemler: [
        ornekIslem({ yapilanIs: "İlk geçerli iş" }),
        // yapilanIs is NOT NULL in SQLite; null forces a constraint failure mid-transaction
        ornekIslem({ yapilanIs: null }),
      ],
    },
  ];

  assert.throws(() => telefonYedeginiIceAl(bozukListe, { yaz: true }));

  assert.equal(aracSayisi(), baslangicArac);
  assert.equal(toplamIslemSayisi(), baslangicIslem);
  assert.equal(aracGetir("48 RLB 101"), undefined);
  assert.equal(aracGetir("48 RLB 102"), undefined);
});

// 6. Successful import (vehicles, jobs, job order, empty warranty) + 7. Importing twice

test("telefonYedeginiIceAl: imports vehicles, preserves job order and empty warranty, and reports clashes on second run", () => {
  const yedekKlasoru = path.join(geciciKlasor, "telefon-aktarim-yedek");
  const okuma = telefonYedeginiOku(
    yedekMetni([
      {
        plaka: "16 AKT 101",
        musteri: "Zeynep Yılmaz",
        telefon: "0535 101 01 01",
        islemler: [
          {
            tarih: "2026-11-08",
            yapilanIs: "Sigorta kutusu onarımı",
            ucret: 800,
            garantiBitis: "",
            sonrakiBakim: "2027-05-08",
          },
          {
            tarih: "2026-11-12",
            yapilanIs: "Yeni akü takıldı",
            ucret: 3200,
            garantiBitis: "2028-11-12",
            sonrakiBakim: "2027-11-12",
          },
        ],
      },
      {
        plaka: "16akt102",
        musteri: "Kemal Demir",
        telefon: "0536 202 02 02",
        islemler: [
          {
            tarih: "2026-11-11",
            yapilanIs: "Marş dinamosu kömür değişimi",
            ucret: 1400,
            garantiBitis: "2027-05-11",
            sonrakiBakim: "2027-05-11",
          },
        ],
      },
    ])
  );
  assert.equal(okuma.tamam, true);

  process.env.YEDEK_KLASORU = yedekKlasoru;
  let ilkRapor;
  try {
    ilkRapor = telefonYedeginiIceAl(okuma.araclar, { yaz: true });
  } finally {
    delete process.env.YEDEK_KLASORU;
  }

  assert.deepEqual(ilkRapor, {
    eklenecekAracSayisi: 2,
    eklenecekIslemSayisi: 3,
    cakisanPlakalar: [],
    yazildi: true,
  });

  // Automatic backup was triggered once after the transaction committed.
  assert.equal(fs.existsSync(path.join(yedekKlasoru, "servis.db")), true);

  // Full job history in original order, including empty warranty string.
  const arac1 = aracGetir("16 AKT 101");
  assert.deepEqual(arac1, {
    plaka: "16 AKT 101",
    musteri: "Zeynep Yılmaz",
    telefon: "0535 101 01 01",
    islemler: [
      {
        tarih: "2026-11-08",
        yapilanIs: "Sigorta kutusu onarımı",
        ucret: 800,
        garantiBitis: "",
        sonrakiBakim: "2027-05-08",
      },
      {
        tarih: "2026-11-12",
        yapilanIs: "Yeni akü takıldı",
        ucret: 3200,
        garantiBitis: "2028-11-12",
        sonrakiBakim: "2027-11-12",
      },
    ],
  });

  // tumAraclariGetir returns the latest job (inserted last).
  const listedeArac1 = tumAraclariGetir().find((a) => a.plaka === "16 AKT 101");
  assert.ok(listedeArac1);
  assert.equal(listedeArac1.islemler.length, 1);
  assert.equal(listedeArac1.islemler[0].yapilanIs, "Yeni akü takıldı");

  const arac2 = aracGetir("16 AKT 102");
  assert.ok(arac2);
  assert.equal(arac2.musteri, "Kemal Demir");
  assert.equal(arac2.islemler.length, 1);

  // Importing the same file a second time reports clashes and writes nothing.
  const ilkIslemToplami = toplamIslemSayisi();
  const ikinciRapor = telefonYedeginiIceAl(okuma.araclar, { yaz: true });
  assert.deepEqual(ikinciRapor, {
    eklenecekAracSayisi: 0,
    eklenecekIslemSayisi: 0,
    cakisanPlakalar: ["16 AKT 101", "16 AKT 102"],
    yazildi: false,
  });
  assert.equal(toplamIslemSayisi(), ilkIslemToplami);
});
