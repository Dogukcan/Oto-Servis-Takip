// Route handler tests: POST /api/kayit and PUT /api/arac, called directly
// with Request objects (no server). Uses a fresh database in an OS temp
// directory (see tests/kurulum.mjs); the guard aborts before the database is
// opened if that is not the case.

// Pin the time zone before any Date is created so the local-day test for
// POST /api/kayit always runs in Europe/Istanbul (UTC+3).
process.env.TZ = "Europe/Istanbul";

import { test, after, mock } from "node:test";
import assert from "node:assert/strict";
import { guvenliYollariDogrula } from "./guvenlik.mjs";

await guvenliYollariDogrula();

const { db } = await import("../lib/db.ts");
const { POST } = await import("../app/api/kayit/route.ts");
const { PUT } = await import("../app/api/arac/route.ts");

after(() => db.close());

function istek(yontem, govde) {
  return new Request("http://localhost/api/test", {
    method: yontem,
    headers: { "content-type": "application/json" },
    body: typeof govde === "string" ? govde : JSON.stringify(govde),
  });
}

async function cevapOku(cevap) {
  return { durum: cevap.status, govde: await cevap.json() };
}

function aracSatiri(plaka) {
  return db
    .prepare("SELECT plaka, musteri, telefon FROM araclar WHERE plaka = ?")
    .get(plaka);
}

function islemleri(plaka) {
  return db
    .prepare("SELECT * FROM islemler WHERE plaka = ? ORDER BY id")
    .all(plaka);
}

function aracSayisi() {
  return db.prepare("SELECT COUNT(*) AS sayi FROM araclar").get().sayi;
}

function islemSayisi() {
  return db.prepare("SELECT COUNT(*) AS sayi FROM islemler").get().sayi;
}

function gecerliKayit(degisiklik = {}) {
  return {
    plaka: "16 kl 4567",
    musteri: "Zeynep Ak",
    telefon: "05321234567",
    yapilanIs: "Şarj dinamosu",
    ucret: "1200",
    garantiBitis: "2027-11-12",
    sonrakiBakim: "2027-05-12",
    ...degisiklik,
  };
}

// d) POST /api/kayit

test("POST /api/kayit: malformed JSON -> 400 İstek okunamadı.", async () => {
  const { durum, govde } = await cevapOku(await POST(istek("POST", "{plaka:")));
  assert.equal(durum, 400);
  assert.deepEqual(govde, { hata: "İstek okunamadı." });
});

for (const ham of ["42", '"metin"', "null", "true"]) {
  test(`POST /api/kayit: non-object JSON ${ham} -> 400 İstek okunamadı.`, async () => {
    const { durum, govde } = await cevapOku(await POST(istek("POST", ham)));
    assert.equal(durum, 400);
    assert.deepEqual(govde, { hata: "İstek okunamadı." });
  });
}

test("POST /api/kayit: JSON array -> 400 (rejected by validation)", async () => {
  const { durum } = await cevapOku(await POST(istek("POST", "[]")));
  assert.equal(durum, 400);
});

const uzunMetin = "a".repeat(201);
const dogrulamaDurumlari = [
  ["invalid plate", { plaka: "00 ABC 123" }, "Geçerli bir plaka girin."],
  ["missing plate", { plaka: undefined }, "Geçerli bir plaka girin."],
  ["empty customer", { musteri: "   " }, "Müşteri adı boş olamaz, en fazla 200 karakter olabilir."],
  ["too long customer", { musteri: uzunMetin }, "Müşteri adı boş olamaz, en fazla 200 karakter olabilir."],
  ["invalid phone", { telefon: "12345" }, "Geçerli bir telefon numarası girin."],
  ["empty job", { yapilanIs: "" }, "Yapılan iş boş olamaz, en fazla 200 karakter olabilir."],
  ["too long job", { yapilanIs: uzunMetin }, "Yapılan iş boş olamaz, en fazla 200 karakter olabilir."],
  ["non-numeric price", { ucret: "abc" }, "Geçerli bir ücret girin."],
  ["missing price", { ucret: undefined }, "Geçerli bir ücret girin."],
  ["negative price", { ucret: -5 }, "Geçerli bir ücret girin."],
  ["impossible warranty date", { garantiBitis: "2026-02-30" }, "Geçerli bir garanti bitiş tarihi girin."],
  ["badly formatted warranty date", { garantiBitis: "12.11.2027" }, "Geçerli bir garanti bitiş tarihi girin."],
  ["missing next service date", { sonrakiBakim: "" }, "Geçerli bir sonraki bakım tarihi girin."],
  ["invalid next service date", { sonrakiBakim: "2027-13-01" }, "Geçerli bir sonraki bakım tarihi girin."],
];

for (const [ad, degisiklik, mesaj] of dogrulamaDurumlari) {
  test(`POST /api/kayit: ${ad} -> 400 and nothing is saved`, async () => {
    const oncekiArac = aracSayisi();
    const oncekiIslem = islemSayisi();
    const { durum, govde } = await cevapOku(
      await POST(istek("POST", gecerliKayit(degisiklik)))
    );
    assert.equal(durum, 400);
    assert.deepEqual(govde, { hata: mesaj });
    assert.equal(aracSayisi(), oncekiArac);
    assert.equal(islemSayisi(), oncekiIslem);
  });
}

test("POST /api/kayit: valid body -> 200, row stored with the canonical plate", async () => {
  const { durum, govde } = await cevapOku(await POST(istek("POST", gecerliKayit())));
  assert.equal(durum, 200);
  assert.deepEqual(govde, { basarili: true });

  assert.deepEqual(aracSatiri("16 KL 4567"), {
    plaka: "16 KL 4567",
    musteri: "Zeynep Ak",
    telefon: "0532 123 45 67",
  });
  const satirlar = islemleri("16 KL 4567");
  assert.equal(satirlar.length, 1);
  assert.equal(satirlar[0].yapilanIs, "Şarj dinamosu");
  assert.equal(satirlar[0].ucret, 1200);
  assert.equal(satirlar[0].garantiBitis, "2027-11-12");
  assert.equal(satirlar[0].sonrakiBakim, "2027-05-12");
  assert.match(satirlar[0].tarih, /^\d{4}-\d{2}-\d{2}$/);
  // No second spelling of the same plate was created.
  assert.equal(aracSatiri("16 kl 4567"), undefined);
  assert.equal(aracSatiri("16KL4567"), undefined);
});

test('POST /api/kayit: "34abc123" is appended to the existing "34 ABC 123"', async () => {
  // "34 ABC 123" comes from the seed data of a fresh database.
  assert.ok(aracSatiri("34 ABC 123"));
  const oncekiIslem = islemleri("34 ABC 123").length;
  const oncekiArac = aracSayisi();

  const { durum } = await cevapOku(
    await POST(istek("POST", gecerliKayit({ plaka: "34abc123", musteri: "Ahmet Yılmaz" })))
  );
  assert.equal(durum, 200);
  assert.equal(aracSayisi(), oncekiArac);
  assert.equal(islemleri("34 ABC 123").length, oncekiIslem + 1);
  assert.equal(aracSatiri("34abc123"), undefined);
  assert.equal(aracSatiri("34ABC123"), undefined);
});

test("POST /api/kayit: empty warranty is accepted and stored as empty text", async () => {
  const { durum } = await cevapOku(
    await POST(istek("POST", gecerliKayit({ plaka: "17 GR 100", garantiBitis: "" })))
  );
  assert.equal(durum, 200);
  const satirlar = islemleri("17 GR 100");
  assert.equal(satirlar.length, 1);
  assert.equal(satirlar[0].garantiBitis, "");
});

test("POST /api/kayit: stores local Istanbul date, not UTC date, after midnight", async () => {
  // 2026-11-11T22:30:00Z is 01:30 on 2026-11-12 in Europe/Istanbul (UTC+3);
  // the old UTC code (toISOString().slice(0, 10)) would store "2026-11-11".
  mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-11T22:30:00Z") });
  try {
    const { durum } = await cevapOku(
      await POST(istek("POST", gecerliKayit({ plaka: "20 TR 300" })))
    );
    assert.equal(durum, 200);
    const satirlar = islemleri("20 TR 300");
    assert.equal(satirlar.length, 1);
    assert.equal(satirlar[0].tarih, "2026-11-12");
  } finally {
    mock.timers.reset();
  }
});

// e) PUT /api/arac

function yeniArac(plaka, musteri = "Test Müşteri", telefon = "0532 000 00 01") {
  db.prepare("INSERT INTO araclar (plaka, musteri, telefon) VALUES (?, ?, ?)").run(
    plaka,
    musteri,
    telefon
  );
}

test("PUT /api/arac: untouched invalid legacy plate still allows editing name/phone", async () => {
  // A plate the current rules reject, inserted after the startup clean-up.
  yeniArac("ESKI PLAKA 7", "Eski Ad", "0532 000 00 07");

  const { durum, govde } = await cevapOku(
    await PUT(
      istek("PUT", {
        eskiPlaka: "ESKI PLAKA 7",
        plaka: "ESKI PLAKA 7",
        musteri: "Yeni Ad",
        telefon: "05337654321",
      })
    )
  );
  assert.equal(durum, 200);
  assert.deepEqual(govde, { basarili: true, plaka: "ESKI PLAKA 7" });
  assert.deepEqual(aracSatiri("ESKI PLAKA 7"), {
    plaka: "ESKI PLAKA 7",
    musteri: "Yeni Ad",
    telefon: "0533 765 43 21",
  });
});

test('PUT /api/arac: renaming to "34ABC123" clashes with "34 ABC 123" -> 409', async () => {
  yeniArac("18 CAK 111", "Çakışan", "0532 000 01 11");
  const onceki = aracSatiri("34 ABC 123");

  const { durum, govde } = await cevapOku(
    await PUT(
      istek("PUT", {
        eskiPlaka: "18 CAK 111",
        plaka: "34ABC123",
        musteri: "Değişmemeli",
        telefon: "05339999999",
      })
    )
  );
  assert.equal(durum, 409);
  assert.deepEqual(govde, { hata: "Bu plaka başka bir araçta kayıtlı." });
  assert.deepEqual(aracSatiri("18 CAK 111"), {
    plaka: "18 CAK 111",
    musteri: "Çakışan",
    telefon: "0532 000 01 11",
  });
  assert.deepEqual(aracSatiri("34 ABC 123"), onceki);
});

test("PUT /api/arac: clash with a legacy space-free plate is caught -> 409", async () => {
  // Legacy row stored without spaces (inserted after the startup clean-up).
  // An exact text comparison would miss it; the route compares space-free keys.
  yeniArac("19ABC999", "Eski Kayıt", "0532 000 09 99");
  yeniArac("19 XYZ 111", "Diğer", "0532 000 01 12");

  const { durum } = await cevapOku(
    await PUT(
      istek("PUT", {
        eskiPlaka: "19 XYZ 111",
        plaka: "19 ABC 999",
        musteri: "Diğer",
        telefon: "05320000112",
      })
    )
  );
  assert.equal(durum, 409);
  assert.equal(aracSatiri("19 ABC 999"), undefined);
  assert.ok(aracSatiri("19 XYZ 111"));
  assert.ok(aracSatiri("19ABC999"));
});

test("PUT /api/arac: unknown vehicle -> 404", async () => {
  const oncekiArac = aracSayisi();
  const { durum, govde } = await cevapOku(
    await PUT(
      istek("PUT", {
        eskiPlaka: "01 ZZ 01",
        plaka: "01 ZZ 02",
        musteri: "Kimse",
        telefon: "05320000000",
      })
    )
  );
  assert.equal(durum, 404);
  assert.deepEqual(govde, { hata: "Araç bulunamadı." });
  assert.equal(aracSayisi(), oncekiArac);
});
