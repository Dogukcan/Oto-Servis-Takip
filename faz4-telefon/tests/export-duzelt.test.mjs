import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  segmentYolunuDuzelt,
  exportDuzelt,
} from "../scripts/export-duzelt.mjs";

test("segmentYolunuDuzelt: Windows ve POSIX ayırıcılarıyla iç içe __next. yollarını düzeltir", () => {
  assert.equal(
    segmentYolunuDuzelt("kayit/__next.kayit/__PAGE__.txt"),
    "kayit/__next.kayit.__PAGE__.txt"
  );
  assert.equal(
    segmentYolunuDuzelt("kayit\\__next.kayit\\__PAGE__.txt"),
    "kayit/__next.kayit.__PAGE__.txt"
  );
  assert.equal(
    segmentYolunuDuzelt("arac/detay/__next.arac/detay/__PAGE__.txt"),
    "arac/detay/__next.arac.detay.__PAGE__.txt"
  );
  assert.equal(
    segmentYolunuDuzelt("arac\\detay\\__next.arac\\detay\\__PAGE__.txt"),
    "arac/detay/__next.arac.detay.__PAGE__.txt"
  );
  assert.equal(
    segmentYolunuDuzelt("arac\\duzenle/__next.arac\\duzenle/__PAGE__.txt"),
    "arac/duzenle/__next.arac.duzenle.__PAGE__.txt"
  );
  assert.equal(
    segmentYolunuDuzelt("_not-found\\__next._not-found\\__PAGE__.txt"),
    "_not-found/__next._not-found.__PAGE__.txt"
  );
  assert.equal(
    segmentYolunuDuzelt("__next.kayit/__PAGE__.txt"),
    "__next.kayit.__PAGE__.txt"
  );
});

test("segmentYolunuDuzelt: zaten doğru olan veya ilgisiz dosyalarda null döner", () => {
  assert.equal(segmentYolunuDuzelt("__next.__PAGE__.txt"), null);
  assert.equal(segmentYolunuDuzelt("__next._tree.txt"), null);
  assert.equal(segmentYolunuDuzelt("__next._full.txt"), null);
  assert.equal(segmentYolunuDuzelt("kayit/__next.kayit.__PAGE__.txt"), null);
  assert.equal(segmentYolunuDuzelt("kayit\\__next.kayit.__PAGE__.txt"), null);
  assert.equal(
    segmentYolunuDuzelt("arac/detay/__next.arac.detay.__PAGE__.txt"),
    null
  );
  assert.equal(segmentYolunuDuzelt("kayit/__next._tree.txt"), null);
  assert.equal(segmentYolunuDuzelt("kayit/index.html"), null);
  assert.equal(segmentYolunuDuzelt("_next/static/chunks/app.js"), null);
});

test("segmentYolunuDuzelt: geçersiz veya güvenli olmayan yollarda null döner", () => {
  assert.equal(segmentYolunuDuzelt(""), null);
  assert.equal(segmentYolunuDuzelt(null), null);
  assert.equal(segmentYolunuDuzelt(undefined), null);
  assert.equal(segmentYolunuDuzelt("/kayit/__next.kayit/__PAGE__.txt"), null);
  assert.equal(segmentYolunuDuzelt("\\kayit\\__next.kayit\\__PAGE__.txt"), null);
  assert.equal(
    segmentYolunuDuzelt("C:\\out\\kayit\\__next.kayit\\__PAGE__.txt"),
    null
  );
  assert.equal(
    segmentYolunuDuzelt("../out/kayit/__next.kayit/__PAGE__.txt"),
    null
  );
  assert.equal(
    segmentYolunuDuzelt("kayit/../__next.kayit/__PAGE__.txt"),
    null
  );
  assert.equal(segmentYolunuDuzelt("kayit/__next.kayit/"), null);
  assert.equal(segmentYolunuDuzelt("kayit/__next./__PAGE__.txt"), null);
});

function geciciOutOlustur(calistir) {
  const kok = fs.mkdtempSync(path.join(os.tmpdir(), "export-duzelt-test-"));
  const outDizini = path.join(kok, "out");
  fs.mkdirSync(outDizini, { recursive: true });
  try {
    calistir(outDizini, kok);
  } finally {
    fs.rmSync(kok, { recursive: true, force: true });
  }
}

function dosyaYaz(kok, goreliYol, icerik) {
  const tamYol = path.join(kok, ...goreliYol.split("/"));
  fs.mkdirSync(path.dirname(tamYol), { recursive: true });
  fs.writeFileSync(tamYol, icerik, "utf8");
}

test("exportDuzelt: Windows çıktılarını düzeltir, boşalan klasörleri siler ve iki kez çalıştırılınca güvenlidir", () => {
  geciciOutOlustur((outDizini) => {
    dosyaYaz(outDizini, "__next.__PAGE__.txt", "kok-page");
    dosyaYaz(outDizini, "kayit/index.html", "<html></html>");
    dosyaYaz(outDizini, "kayit/__next._tree.txt", "tree");
    dosyaYaz(outDizini, "kayit/__next.kayit/__PAGE__.txt", "kayit-page");
    dosyaYaz(
      outDizini,
      "arac/detay/__next.arac/detay/__PAGE__.txt",
      "detay-page"
    );
    dosyaYaz(
      outDizini,
      "_not-found/__next._not-found/__PAGE__.txt",
      "404-page"
    );

    const ciktilar = [];
    const ilkSonuc = exportDuzelt(outDizini, (satir) => ciktilar.push(satir));

    assert.equal(ilkSonuc.length, 3);
    assert.equal(ciktilar.length, 3);
    assert.ok(
      ciktilar.includes(
        "Taşındı: kayit/__next.kayit/__PAGE__.txt -> kayit/__next.kayit.__PAGE__.txt"
      )
    );
    assert.ok(
      ciktilar.includes(
        "Taşındı: arac/detay/__next.arac/detay/__PAGE__.txt -> arac/detay/__next.arac.detay.__PAGE__.txt"
      )
    );
    assert.ok(
      ciktilar.includes(
        "Taşındı: _not-found/__next._not-found/__PAGE__.txt -> _not-found/__next._not-found.__PAGE__.txt"
      )
    );

    // Moved files exist with their original contents.
    assert.equal(
      fs.readFileSync(
        path.join(outDizini, "kayit", "__next.kayit.__PAGE__.txt"),
        "utf8"
      ),
      "kayit-page"
    );
    assert.equal(
      fs.readFileSync(
        path.join(outDizini, "arac", "detay", "__next.arac.detay.__PAGE__.txt"),
        "utf8"
      ),
      "detay-page"
    );
    assert.equal(
      fs.readFileSync(
        path.join(
          outDizini,
          "_not-found",
          "__next._not-found.__PAGE__.txt"
        ),
        "utf8"
      ),
      "404-page"
    );

    // Emptied __next.* directories are removed.
    assert.equal(
      fs.existsSync(path.join(outDizini, "kayit", "__next.kayit")),
      false
    );
    assert.equal(
      fs.existsSync(path.join(outDizini, "arac", "detay", "__next.arac")),
      false
    );
    assert.equal(
      fs.existsSync(path.join(outDizini, "_not-found", "__next._not-found")),
      false
    );

    // Second run is a no-op.
    const ikinciCiktilar = [];
    const ikinciSonuc = exportDuzelt(outDizini, (satir) =>
      ikinciCiktilar.push(satir)
    );
    assert.deepEqual(ikinciSonuc, []);
    assert.deepEqual(ikinciCiktilar, []);
  });
});

test("exportDuzelt: zaten doğru olan (Linux) çıktıda hiçbir şeye dokunmaz", () => {
  geciciOutOlustur((outDizini) => {
    dosyaYaz(outDizini, "__next.__PAGE__.txt", "kok");
    dosyaYaz(outDizini, "kayit/__next.kayit.__PAGE__.txt", "kayit");
    dosyaYaz(
      outDizini,
      "arac/detay/__next.arac.detay.__PAGE__.txt",
      "detay"
    );

    const ciktilar = [];
    const sonuc = exportDuzelt(outDizini, (satir) => ciktilar.push(satir));
    assert.deepEqual(sonuc, []);
    assert.deepEqual(ciktilar, []);
    assert.equal(
      fs.readFileSync(
        path.join(outDizini, "kayit", "__next.kayit.__PAGE__.txt"),
        "utf8"
      ),
      "kayit"
    );
  });
});

test("exportDuzelt: hedefte farklı içerikli bir dosya varsa üzerine yazmayı reddeder", () => {
  geciciOutOlustur((outDizini) => {
    dosyaYaz(outDizini, "kayit/__next.kayit.__PAGE__.txt", "mevcut-icerik");
    dosyaYaz(outDizini, "kayit/__next.kayit/__PAGE__.txt", "farkli-icerik");

    assert.throws(
      () => exportDuzelt(outDizini, () => {}),
      /zaten var ve içeriği farklı/
    );

    // Existing file is untouched and source file is still there.
    assert.equal(
      fs.readFileSync(
        path.join(outDizini, "kayit", "__next.kayit.__PAGE__.txt"),
        "utf8"
      ),
      "mevcut-icerik"
    );
    assert.equal(
      fs.readFileSync(
        path.join(outDizini, "kayit", "__next.kayit", "__PAGE__.txt"),
        "utf8"
      ),
      "farkli-icerik"
    );
  });
});

test("exportDuzelt: out dışındaki bir klasörde çalışmayı reddeder", () => {
  geciciOutOlustur((_outDizini, kok) => {
    assert.throws(() => exportDuzelt(kok, () => {}), /yalnızca "out"/);
  });
});
