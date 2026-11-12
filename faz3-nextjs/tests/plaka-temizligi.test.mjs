// Tests for the plate clean-up that lib/db.ts runs when it is first loaded.
// The legacy rows have to be in the database BEFORE lib/db.ts is imported, so
// this file builds the temp database by hand first and only then imports the
// app module. Uses a fresh database in an OS temp directory (see
// tests/kurulum.mjs); the guard aborts first if that is not the case.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Database from "better-sqlite3";
import { guvenliYollariDogrula } from "./guvenlik.mjs";

const { DB_YOLU } = await guvenliYollariDogrula();

// The file must not exist yet: this process created the temp directory.
assert.equal(fs.existsSync(DB_YOLU), false, "temp database already exists");

// Same schema as lib/db.ts.
const hazirlik = new Database(DB_YOLU);
hazirlik.exec(`
  CREATE TABLE araclar (
    plaka TEXT PRIMARY KEY,
    musteri TEXT NOT NULL,
    telefon TEXT NOT NULL
  );

  CREATE TABLE islemler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plaka TEXT NOT NULL REFERENCES araclar(plaka),
    tarih TEXT NOT NULL,
    yapilanIs TEXT NOT NULL,
    ucret INTEGER NOT NULL,
    garantiBitis TEXT NOT NULL,
    sonrakiBakim TEXT NOT NULL
  );
`);
const aracEkle = hazirlik.prepare(
  "INSERT INTO araclar (plaka, musteri, telefon) VALUES (?, ?, ?)"
);
const islemEkle = hazirlik.prepare(
  `INSERT INTO islemler (plaka, tarih, yapilanIs, ucret, garantiBitis, sonrakiBakim)
   VALUES (?, '2026-01-01', ?, 100, '', '2026-06-01')`
);

// 1) Legacy spelling with two jobs.
aracEkle.run("34 FGH523", "Eski Biçim", "0532 111 11 11");
islemEkle.run("34 FGH523", "FGH iş 1");
islemEkle.run("34 FGH523", "FGH iş 2");

// 2) Same car twice; the legacy row has the most recent job (higher id).
aracEkle.run("06 KLM 100", "Eski Müşteri", "0532 222 22 22");
aracEkle.run("06KLM100", "Güncel Müşteri", "0533 222 22 22");
islemEkle.run("06 KLM 100", "KLM eski iş");
islemEkle.run("06KLM100", "KLM yeni iş");

// 3) Same car twice; the canonical row has the most recent job.
aracEkle.run("07 NOP 200", "Doğru Kayıt", "0532 333 33 33");
aracEkle.run("07nop200", "Eski Kayıt", "0533 333 33 33");
islemEkle.run("07nop200", "NOP eski iş");
islemEkle.run("07 NOP 200", "NOP yeni iş");

// 4) A plate that breaks the rules (province code 00) must be left alone.
aracEkle.run("00ABC123", "Kuralsız", "0532 444 44 44");
islemEkle.run("00ABC123", "Kuralsız iş");

hazirlik.close();

// Loading lib/db.ts runs the clean-up.
const { db } = await import("../lib/db.ts");

after(() => db.close());

function aracSatiri(plaka) {
  return db
    .prepare("SELECT plaka, musteri, telefon FROM araclar WHERE plaka = ?")
    .get(plaka);
}

function isler(plaka) {
  return db
    .prepare("SELECT yapilanIs FROM islemler WHERE plaka = ? ORDER BY id")
    .all(plaka)
    .map((s) => s.yapilanIs);
}

test("non-empty database is not seeded", () => {
  const sayi = db.prepare("SELECT COUNT(*) AS sayi FROM araclar").get().sayi;
  // 4 cars after the merges: 34 FGH 523, 06 KLM 100, 07 NOP 200, 00ABC123.
  assert.equal(sayi, 4);
});

test('legacy "34 FGH523" becomes "34 FGH 523" together with its jobs', () => {
  assert.equal(aracSatiri("34 FGH523"), undefined);
  assert.deepEqual(aracSatiri("34 FGH 523"), {
    plaka: "34 FGH 523",
    musteri: "Eski Biçim",
    telefon: "0532 111 11 11",
  });
  assert.deepEqual(isler("34 FGH 523"), ["FGH iş 1", "FGH iş 2"]);
  assert.deepEqual(isler("34 FGH523"), []);
});

test("two rows of the same car merge; name/phone come from the row with the latest job (legacy row newer)", () => {
  assert.equal(aracSatiri("06KLM100"), undefined);
  assert.deepEqual(aracSatiri("06 KLM 100"), {
    plaka: "06 KLM 100",
    musteri: "Güncel Müşteri",
    telefon: "0533 222 22 22",
  });
  assert.deepEqual(isler("06 KLM 100"), ["KLM eski iş", "KLM yeni iş"]);
});

test("two rows of the same car merge; name/phone come from the row with the latest job (canonical row newer)", () => {
  assert.equal(aracSatiri("07nop200"), undefined);
  assert.deepEqual(aracSatiri("07 NOP 200"), {
    plaka: "07 NOP 200",
    musteri: "Doğru Kayıt",
    telefon: "0532 333 33 33",
  });
  assert.deepEqual(isler("07 NOP 200"), ["NOP eski iş", "NOP yeni iş"]);
});

test("a plate that breaks the rules is left alone", () => {
  assert.deepEqual(aracSatiri("00ABC123"), {
    plaka: "00ABC123",
    musteri: "Kuralsız",
    telefon: "0532 444 44 44",
  });
  assert.deepEqual(isler("00ABC123"), ["Kuralsız iş"]);
});
