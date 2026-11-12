// Tests for lib/db-sorgular.ts: islemEkle, aracGuncelle, tumAraclariGetir,
// aracGetir. Runs against a fresh database in an OS temp directory (see
// tests/kurulum.mjs); the guard below aborts before the database is opened if
// that is not the case.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { guvenliYollariDogrula, ornekIslem } from "./guvenlik.mjs";

await guvenliYollariDogrula();

const { db } = await import("../lib/db.ts");
const { islemEkle, aracGuncelle, tumAraclariGetir, aracGetir } = await import(
  "../lib/db-sorgular.ts"
);

after(() => db.close());

function aracSatiri(plaka) {
  return db
    .prepare("SELECT plaka, musteri, telefon FROM araclar WHERE plaka = ?")
    .get(plaka);
}

function islemSayisi(plaka) {
  return db
    .prepare("SELECT COUNT(*) AS sayi FROM islemler WHERE plaka = ?")
    .get(plaka).sayi;
}

// a) islemEkle

test("islemEkle: new vehicle creates the vehicle and its first job", () => {
  islemEkle("41 KCL 101", "Ali Veli", "0532 100 00 01", ornekIslem());
  assert.deepEqual(aracSatiri("41 KCL 101"), {
    plaka: "41 KCL 101",
    musteri: "Ali Veli",
    telefon: "0532 100 00 01",
  });
  assert.equal(islemSayisi("41 KCL 101"), 1);
});

test("islemEkle: existing vehicle gets new name/phone and an appended job", () => {
  islemEkle("41 KCL 102", "Eski Ad", "0532 100 00 02", ornekIslem());
  islemEkle(
    "41 KCL 102",
    "Yeni Ad",
    "0533 200 00 02",
    ornekIslem({ yapilanIs: "Far ayarı" })
  );
  assert.deepEqual(aracSatiri("41 KCL 102"), {
    plaka: "41 KCL 102",
    musteri: "Yeni Ad",
    telefon: "0533 200 00 02",
  });
  assert.equal(islemSayisi("41 KCL 102"), 2);
  const sayi = db
    .prepare("SELECT COUNT(*) AS sayi FROM araclar WHERE plaka = ?")
    .get("41 KCL 102").sayi;
  assert.equal(sayi, 1);
});

test("islemEkle: failed job insert does not create a new vehicle (piece 3 regression)", () => {
  // yapilanIs is NOT NULL, so binding null makes the job INSERT throw.
  assert.throws(() =>
    islemEkle("41 KCL 103", "Ali", "0532 100 00 03", ornekIslem({ yapilanIs: null }))
  );
  assert.equal(aracSatiri("41 KCL 103"), undefined);
  assert.equal(islemSayisi("41 KCL 103"), 0);
});

test("islemEkle: failed job insert does not change an existing vehicle (piece 3 regression)", () => {
  islemEkle("41 KCL 104", "Kalıcı Ad", "0532 100 00 04", ornekIslem());
  assert.throws(() =>
    islemEkle(
      "41 KCL 104",
      "Değişmemeli",
      "0533 999 99 99",
      ornekIslem({ ucret: null })
    )
  );
  assert.deepEqual(aracSatiri("41 KCL 104"), {
    plaka: "41 KCL 104",
    musteri: "Kalıcı Ad",
    telefon: "0532 100 00 04",
  });
  assert.equal(islemSayisi("41 KCL 104"), 1);
});

// b) aracGuncelle

test("aracGuncelle: renaming moves the whole job history to the new plate", () => {
  islemEkle("42 ESK 201", "Ayşe", "0532 200 00 01", ornekIslem({ yapilanIs: "İş 1" }));
  islemEkle("42 ESK 201", "Ayşe", "0532 200 00 01", ornekIslem({ yapilanIs: "İş 2" }));

  const sonuc = aracGuncelle("42 ESK 201", "42 YEN 201", "Ayşe K", "0532 200 00 09");
  assert.equal(sonuc, "tamam");

  assert.equal(aracSatiri("42 ESK 201"), undefined);
  assert.equal(islemSayisi("42 ESK 201"), 0);
  const arac = aracGetir("42 YEN 201");
  assert.ok(arac);
  assert.equal(arac.musteri, "Ayşe K");
  assert.equal(arac.telefon, "0532 200 00 09");
  assert.deepEqual(
    arac.islemler.map((i) => i.yapilanIs),
    ["İş 1", "İş 2"]
  );
});

test("aracGuncelle: unknown plate returns bulunamadi", () => {
  assert.equal(
    aracGuncelle("01 YOK 999", "01 YOK 998", "Kimse", "0532 000 00 00"),
    "bulunamadi"
  );
  assert.equal(aracSatiri("01 YOK 998"), undefined);
});

test("aracGuncelle: clashing plate returns plaka-kullanimda and changes nothing", () => {
  islemEkle("43 AAA 301", "Birinci", "0532 300 00 01", ornekIslem());
  islemEkle("43 BBB 302", "İkinci", "0532 300 00 02", ornekIslem());
  islemEkle("43 BBB 302", "İkinci", "0532 300 00 02", ornekIslem());

  const sonuc = aracGuncelle("43 AAA 301", "43 BBB 302", "Değişti", "0533 000 00 00");
  assert.equal(sonuc, "plaka-kullanimda");

  assert.deepEqual(aracSatiri("43 AAA 301"), {
    plaka: "43 AAA 301",
    musteri: "Birinci",
    telefon: "0532 300 00 01",
  });
  assert.deepEqual(aracSatiri("43 BBB 302"), {
    plaka: "43 BBB 302",
    musteri: "İkinci",
    telefon: "0532 300 00 02",
  });
  assert.equal(islemSayisi("43 AAA 301"), 1);
  assert.equal(islemSayisi("43 BBB 302"), 2);
});

// c) tumAraclariGetir / aracGetir

test("tumAraclariGetir: the list carries the latest job of each vehicle", () => {
  islemEkle("44 SON 401", "Can", "0532 400 00 01", ornekIslem({ yapilanIs: "Eski iş", tarih: "2026-01-01" }));
  islemEkle("44 SON 401", "Can", "0532 400 00 01", ornekIslem({ yapilanIs: "Yeni iş", tarih: "2026-02-01" }));

  const arac = tumAraclariGetir().find((a) => a.plaka === "44 SON 401");
  assert.ok(arac);
  assert.equal(arac.islemler.length, 1);
  assert.equal(arac.islemler[0].yapilanIs, "Yeni iş");
  assert.equal(arac.islemler[0].tarih, "2026-02-01");
});

test("vehicle without any job is returned with an empty history", () => {
  db.prepare("INSERT INTO araclar (plaka, musteri, telefon) VALUES (?, ?, ?)").run(
    "45 BOS 501",
    "İşsiz Araç",
    "0532 500 00 01"
  );

  const listede = tumAraclariGetir().find((a) => a.plaka === "45 BOS 501");
  assert.ok(listede);
  assert.deepEqual(listede.islemler, []);

  const tek = aracGetir("45 BOS 501");
  assert.deepEqual(tek, {
    plaka: "45 BOS 501",
    musteri: "İşsiz Araç",
    telefon: "0532 500 00 01",
    islemler: [],
  });
});

test("aracGetir: unknown plate returns undefined", () => {
  assert.equal(aracGetir("01 YOK 997"), undefined);
});
