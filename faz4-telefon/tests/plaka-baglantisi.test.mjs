import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detayYolu,
  duzenleYolu,
  plakaCoz,
} from "../lib/plaka-baglantisi.ts";

test("detayYolu ve duzenleYolu: plakayı sorgu dizgesi yerine diyez (#) içinde taşır", () => {
  const detay = detayYolu("34 ABC 123");
  const duzenle = duzenleYolu("34 ABC 123");

  assert.equal(detay, "/arac/detay/#34%20ABC%20123");
  assert.equal(duzenle, "/arac/duzenle/#34%20ABC%20123");
  assert.equal(detay.includes("?"), false);
  assert.equal(duzenle.includes("?"), false);
});

test("plakaCoz: boşluklu ve Türkçe harfli plakalarda gidiş-dönüş aynı plakayı verir", () => {
  const ornekler = [
    "34 ABC 123",
    "06 ELY 99",
    "34ABC123",
    "35 ŞĞÜÖÇİ 01",
    "01 çğıöşü 23",
    "ESKİ-PLAKA #1",
  ];

  for (const plaka of ornekler) {
    assert.equal(plakaCoz(detayYolu(plaka)), plaka);
    assert.equal(plakaCoz(duzenleYolu(plaka)), plaka);
    const diyez = `#${encodeURIComponent(plaka)}`;
    assert.equal(plakaCoz(diyez), plaka);
  }
});

test("plakaCoz: boş veya yalnızca boşluk içeren diyezde boş metin döner", () => {
  for (const girdi of ["", "#", "#   ", "#%20%20", "/arac/detay/#"]) {
    assert.equal(plakaCoz(girdi), "");
  }
});

test("plakaCoz: bozuk yüzde kodlamasında çökmez ve boş metin döner", () => {
  const bozuklar = [
    "#%E0%A4%A",
    "#34%ZZ",
    "#%",
    "#%c3%28",
    "/arac/detay/#%E0%A4%A",
    "/arac/duzenle/#%FF",
  ];

  for (const girdi of bozuklar) {
    let sonuc;
    assert.doesNotThrow(() => {
      sonuc = plakaCoz(girdi);
    });
    assert.equal(sonuc, "");
  }
});
