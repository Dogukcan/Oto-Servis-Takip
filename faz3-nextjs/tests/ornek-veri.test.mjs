import { test, after } from "node:test";
import assert from "node:assert/strict";
import { guvenliYollariDogrula } from "./guvenlik.mjs";

await guvenliYollariDogrula();

delete process.env.SERVIS_ORNEK_VERI;

const { db } = await import("../lib/db.ts");

after(() => db.close());

test("SERVIS_ORNEK_VERI tanımsızken yeni veritabanında tablolar oluşturulur ve boş kalır", () => {
  const tablolar = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('araclar', 'islemler') ORDER BY name"
    )
    .all()
    .map((satir) => satir.name);

  assert.deepEqual(tablolar, ["araclar", "islemler"]);

  const aracSayisi = db.prepare("SELECT COUNT(*) AS sayi FROM araclar").get().sayi;
  const islemSayisi = db.prepare("SELECT COUNT(*) AS sayi FROM islemler").get().sayi;

  assert.equal(aracSayisi, 0);
  assert.equal(islemSayisi, 0);
});
