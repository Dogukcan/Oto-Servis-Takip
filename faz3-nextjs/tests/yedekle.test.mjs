// Tests for the automatic backup in lib/yedekle.ts. YEDEK_KLASORU is removed
// by tests/kurulum.mjs and is only set here, inside a test, to a folder in
// the OS temp directory. The status file path is also in the temp directory.
// The guard aborts before the database is opened if that is not the case.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { guvenliYollariDogrula, ornekIslem } from "./guvenlik.mjs";

const { YEDEK_DURUM_YOLU, geciciKlasor } = await guvenliYollariDogrula();

const { db } = await import("../lib/db.ts");
const { islemEkle } = await import("../lib/db-sorgular.ts");
const { yedekDurumunuOku } = await import("../lib/yedekle.ts");

const yedekKlasoru = path.join(geciciKlasor, "yedek");

after(() => {
  delete process.env.YEDEK_KLASORU;
  db.close();
});

test("with YEDEK_KLASORU unset nothing is written", () => {
  assert.equal(process.env.YEDEK_KLASORU, undefined);
  islemEkle("20 YDK 100", "Yedeksiz", "0532 600 00 01", ornekIslem());

  assert.equal(fs.existsSync(yedekKlasoru), false);
  assert.equal(fs.existsSync(YEDEK_DURUM_YOLU), false);
  assert.equal(yedekDurumunuOku(), null);
});

test("with YEDEK_KLASORU set to a temp folder the copy holds the row just saved", () => {
  process.env.YEDEK_KLASORU = yedekKlasoru;
  try {
    islemEkle("20 YDK 200", "Yedekli", "0532 600 00 02", ornekIslem({ yapilanIs: "Yedek testi" }));
  } finally {
    delete process.env.YEDEK_KLASORU;
  }

  const kopyaYolu = path.join(yedekKlasoru, "servis.db");
  assert.equal(fs.existsSync(kopyaYolu), true);

  const kopya = new Database(kopyaYolu);
  try {
    const arac = kopya
      .prepare("SELECT plaka, musteri, telefon FROM araclar WHERE plaka = ?")
      .get("20 YDK 200");
    assert.deepEqual(arac, {
      plaka: "20 YDK 200",
      musteri: "Yedekli",
      telefon: "0532 600 00 02",
    });
    const islem = kopya
      .prepare("SELECT yapilanIs FROM islemler WHERE plaka = ?")
      .get("20 YDK 200");
    assert.deepEqual(islem, { yapilanIs: "Yedek testi" });
  } finally {
    kopya.close();
  }

  const durum = yedekDurumunuOku();
  assert.ok(durum, "status file was not written");
  assert.equal(durum.basarili, true);
  assert.equal(durum.hata, undefined);
  assert.ok(!Number.isNaN(Date.parse(durum.zaman)));
  // The status file is the temp one, not yedek-durum.json in the project.
  assert.equal(path.dirname(YEDEK_DURUM_YOLU), geciciKlasor);
  assert.equal(fs.existsSync(YEDEK_DURUM_YOLU), true);
});
