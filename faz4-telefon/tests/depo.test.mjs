import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bosVeri,
  tumAraclar,
  aracGetir,
  islemEkle,
  aracGuncelle,
  aracSil,
  kullanimSay,
  yedekAlindi,
  yedektenYukle,
  sonYedektenBuYanaGun,
  disaAktar,
  iceAktar,
} from "../lib/depo.ts";
import { yerelTarihISO } from "../lib/format.ts";

function islem(tarih, yapilanIs = "Akü değişimi", ucret = 1500) {
  return {
    tarih,
    yapilanIs,
    ucret,
    garantiBitis: "",
    sonrakiBakim: "2027-05-14",
  };
}

// Three vehicles, added out of plate order; "34 ABC 123" has two jobs and
// "06 ELY 99" has none (built by hand, as an older import could hold it).
function ornekVeri() {
  let veri = bosVeri();
  veri = islemEkle(veri, "34 ABC 123", "Ahmet Yılmaz", "0532 123 45 67", islem("2026-01-10", "Far ayarı", 300));
  veri = islemEkle(veri, "01 AB 01", "Ayşe Kaya", "0533 111 22 33", islem("2026-03-05"));
  veri = islemEkle(veri, "34 ABC 123", "Ahmet Yılmaz", "0532 123 45 67", islem("2026-06-20", "Marş motoru", 2500));
  return {
    ...veri,
    araclar: [
      ...veri.araclar,
      { plaka: "06 ELY 99", musteri: "Mehmet Demir", telefon: "0544 999 88 77", islemler: [] },
    ],
  };
}

// --- bosVeri ----------------------------------------------------------------

test("bosVeri: boş ve örnek araçsız", () => {
  assert.deepEqual(bosVeri(), {
    surum: 1,
    araclar: [],
    kullanim: {},
    sonYedek: null,
  });
  // Two calls never share objects.
  assert.notEqual(bosVeri().araclar, bosVeri().araclar);
});

// --- tumAraclar / aracGetir ---------------------------------------------------

test("tumAraclar: plakaya göre sıralı, sadece son işlem, işlemsiz araç boş", () => {
  const liste = tumAraclar(ornekVeri());
  assert.deepEqual(
    liste.map((a) => a.plaka),
    ["01 AB 01", "06 ELY 99", "34 ABC 123"]
  );
  assert.deepEqual(liste[0].islemler, [islem("2026-03-05")]);
  assert.deepEqual(liste[1].islemler, []);
  assert.deepEqual(liste[2].islemler, [islem("2026-06-20", "Marş motoru", 2500)]);
  assert.equal(liste[2].musteri, "Ahmet Yılmaz");
  assert.equal(liste[2].telefon, "0532 123 45 67");
});

test("tumAraclar: son işlem eklenme sırasına göredir, tarihe göre değil", () => {
  // faz3 picks the job with the highest id, i.e. the last one inserted.
  let veri = islemEkle(bosVeri(), "34 ABC 123", "A", "0532 123 45 67", islem("2026-09-01"));
  veri = islemEkle(veri, "34 ABC 123", "A", "0532 123 45 67", islem("2026-02-01"));
  assert.equal(tumAraclar(veri)[0].islemler[0].tarih, "2026-02-01");
});

test("tumAraclar: boş veride boş liste", () => {
  assert.deepEqual(tumAraclar(bosVeri()), []);
});

test("aracGetir: tüm geçmiş, en eski önce; olmayan plaka undefined", () => {
  const veri = ornekVeri();
  const arac = aracGetir(veri, "34 ABC 123");
  assert.deepEqual(arac, {
    plaka: "34 ABC 123",
    musteri: "Ahmet Yılmaz",
    telefon: "0532 123 45 67",
    islemler: [
      islem("2026-01-10", "Far ayarı", 300),
      islem("2026-06-20", "Marş motoru", 2500),
    ],
  });
  assert.equal(aracGetir(veri, "35 ZZ 999"), undefined);
  assert.deepEqual(aracGetir(veri, "06 ELY 99").islemler, []);
});

test("tumAraclar / aracGetir: dönen nesneyi değiştirmek veriyi değiştirmez", () => {
  const veri = ornekVeri();
  const kopya = structuredClone(veri);
  const arac = aracGetir(veri, "34 ABC 123");
  arac.musteri = "Değişti";
  arac.islemler[0].ucret = 1;
  arac.islemler.push(islem("2026-12-01"));
  const liste = tumAraclar(veri);
  liste[0].islemler[0].yapilanIs = "Değişti";
  liste.pop();
  assert.deepEqual(veri, kopya);
});

// --- islemEkle ----------------------------------------------------------------

test("islemEkle: yeni araç oluşturur", () => {
  const veri = islemEkle(bosVeri(), "34 ABC 123", "Ahmet", "0532 123 45 67", islem("2026-11-14"));
  assert.deepEqual(veri.araclar, [
    {
      plaka: "34 ABC 123",
      musteri: "Ahmet",
      telefon: "0532 123 45 67",
      islemler: [islem("2026-11-14")],
    },
  ]);
});

test("islemEkle: var olan araçta ad/telefonu günceller ve işlemi sona ekler", () => {
  let veri = islemEkle(bosVeri(), "34 ABC 123", "Ahmet", "0532 123 45 67", islem("2026-01-01"));
  veri = islemEkle(veri, "34 ABC 123", "Ahmet Yılmaz", "0533 000 00 00", islem("2026-02-01", "Sigorta", 50));
  assert.equal(veri.araclar.length, 1);
  const arac = aracGetir(veri, "34 ABC 123");
  assert.equal(arac.musteri, "Ahmet Yılmaz");
  assert.equal(arac.telefon, "0533 000 00 00");
  assert.deepEqual(
    arac.islemler.map((i) => i.tarih),
    ["2026-01-01", "2026-02-01"]
  );
});

test("islemEkle: girdiyi ve verilen işlem nesnesini değiştirmez", () => {
  const veri = ornekVeri();
  const kopya = structuredClone(veri);
  const yeniIslem = islem("2026-11-14");
  const sonuc = islemEkle(veri, "34 ABC 123", "Yeni Ad", "0555 555 55 55", yeniIslem);
  assert.deepEqual(veri, kopya);
  assert.notEqual(sonuc, veri);
  // Changing the passed job afterwards must not reach the stored data.
  yeniIslem.ucret = 999999;
  const arac = aracGetir(sonuc, "34 ABC 123");
  assert.equal(arac.islemler[arac.islemler.length - 1].ucret, 1500);
});

test("islemEkle: boşluk farkı olan plakayı mevcut araca ekler, kayıtlı plakayı korur ve dışa/içe aktarımda geçerli kalır", () => {
  let veri = islemEkle(
    bosVeri(),
    "34ABC123",
    "Eski Müşteri",
    "0532 111 11 11",
    islem("2025-05-10", "Far ayarı", 400)
  );
  veri = islemEkle(
    veri,
    "34 ABC 123",
    "Yeni Müşteri",
    "0532 222 22 22",
    islem("2026-11-14", "Akü değişimi", 1800)
  );

  assert.equal(veri.araclar.length, 1);
  assert.equal(veri.araclar[0].plaka, "34ABC123");
  assert.equal(veri.araclar[0].musteri, "Yeni Müşteri");
  assert.equal(veri.araclar[0].telefon, "0532 222 22 22");
  assert.deepEqual(
    veri.araclar[0].islemler.map((i) => i.tarih),
    ["2025-05-10", "2026-11-14"]
  );

  const aktarim = iceAktar(disaAktar(veri));
  assert.equal(aktarim.tamam, true, aktarim.hata);
  assert.deepEqual(aktarim.veri, veri);
});

// --- aracGuncelle -------------------------------------------------------------

test("aracGuncelle: plaka aynıysa ad ve telefon değişir", () => {
  const veri = ornekVeri();
  const { sonuc, veri: yeni } = aracGuncelle(veri, "01 AB 01", "01 AB 01", "Ayşe Kara", "0533 999 99 99");
  assert.equal(sonuc, "tamam");
  const arac = aracGetir(yeni, "01 AB 01");
  assert.equal(arac.musteri, "Ayşe Kara");
  assert.equal(arac.telefon, "0533 999 99 99");
  assert.equal(arac.islemler.length, 1);
});

test("aracGuncelle: plaka değişince tüm geçmiş yeni plakaya taşınır", () => {
  const veri = ornekVeri();
  const eskiGecmis = aracGetir(veri, "34 ABC 123").islemler;
  const { sonuc, veri: yeni } = aracGuncelle(veri, "34 ABC 123", "34 XY 7788", "Ahmet Yılmaz", "0532 123 45 67");
  assert.equal(sonuc, "tamam");
  assert.equal(aracGetir(yeni, "34 ABC 123"), undefined);
  assert.deepEqual(aracGetir(yeni, "34 XY 7788").islemler, eskiGecmis);
  assert.equal(yeni.araclar.length, veri.araclar.length);
});

test("aracGuncelle: olmayan araç 'bulunamadi', veri aynen döner", () => {
  const veri = ornekVeri();
  const kopya = structuredClone(veri);
  const sonuc = aracGuncelle(veri, "35 ZZ 999", "35 ZZ 998", "X", "0532 123 45 67");
  assert.equal(sonuc.sonuc, "bulunamadi");
  assert.equal(sonuc.veri, veri);
  assert.deepEqual(veri, kopya);
});

test("aracGuncelle: başka araçta olan plaka 'plaka-kullanimda'", () => {
  const veri = ornekVeri();
  const sonuc = aracGuncelle(veri, "01 AB 01", "34 ABC 123", "Ayşe", "0533 111 22 33");
  assert.equal(sonuc.sonuc, "plaka-kullanimda");
  assert.equal(sonuc.veri, veri);
});

test("aracGuncelle: boşluk farkı olan plaka da çakışma sayılır", () => {
  // An older record saved without spaces.
  const veri = islemEkle(ornekVeri(), "34ABC124", "Eski Kayıt", "0532 000 00 00", islem("2025-01-01"));
  const kopya = structuredClone(veri);
  const sonuc = aracGuncelle(veri, "01 AB 01", "34 ABC 124", "Ayşe", "0533 111 22 33");
  assert.equal(sonuc.sonuc, "plaka-kullanimda");
  assert.equal(sonuc.veri, veri);
  assert.deepEqual(veri, kopya);
});

test("aracGuncelle: aracın kendi plakasını boşluklu biçime çevirmek serbest", () => {
  const veri = islemEkle(bosVeri(), "34ABC124", "Eski Kayıt", "0532 000 00 00", islem("2025-01-01"));
  const sonuc = aracGuncelle(veri, "34ABC124", "34 ABC 124", "Eski Kayıt", "0532 000 00 00");
  assert.equal(sonuc.sonuc, "tamam");
  assert.deepEqual(tumAraclar(sonuc.veri).map((a) => a.plaka), ["34 ABC 124"]);
});

test("aracGuncelle: başarılı güncelleme girdiyi değiştirmez", () => {
  const veri = ornekVeri();
  const kopya = structuredClone(veri);
  const sonuc = aracGuncelle(veri, "34 ABC 123", "34 XY 7788", "Yeni", "0555 555 55 55");
  assert.equal(sonuc.sonuc, "tamam");
  assert.notEqual(sonuc.veri, veri);
  assert.deepEqual(veri, kopya);
});

// --- aracSil ------------------------------------------------------------------

test("aracSil: aracı ve işlemlerini siler, girdiyi değiştirmez", () => {
  const veri = ornekVeri();
  const kopya = structuredClone(veri);
  const { silindi, veri: yeni } = aracSil(veri, "34 ABC 123");
  assert.equal(silindi, true);
  assert.equal(aracGetir(yeni, "34 ABC 123"), undefined);
  assert.deepEqual(tumAraclar(yeni).map((a) => a.plaka), ["01 AB 01", "06 ELY 99"]);
  assert.ok(!disaAktar(yeni).includes("Marş motoru"));
  assert.deepEqual(veri, kopya);
});

test("aracSil: olmayan plaka silinmez", () => {
  const veri = ornekVeri();
  const { silindi, veri: yeni } = aracSil(veri, "35 ZZ 999");
  assert.equal(silindi, false);
  assert.deepEqual(yeni, veri);
});

// --- kullanimSay ----------------------------------------------------------------

test("kullanimSay: iki farklı günün sayaçları ayrı tutulur", () => {
  let veri = bosVeri();
  veri = kullanimSay(veri, "acilis", "2026-11-13");
  veri = kullanimSay(veri, "acilis", "2026-11-13");
  veri = kullanimSay(veri, "kayit", "2026-11-13");
  veri = kullanimSay(veri, "whatsapp", "2026-11-14");
  assert.deepEqual(veri.kullanim, {
    "2026-11-13": { acilis: 2, kayit: 1, whatsapp: 0 },
    "2026-11-14": { acilis: 0, kayit: 0, whatsapp: 1 },
  });
});

test("kullanimSay: gün verilmezse bugünün yerel günü", () => {
  const once = yerelTarihISO();
  const veri = kullanimSay(bosVeri(), "kayit");
  const sonra = yerelTarihISO();
  const gunler = Object.keys(veri.kullanim);
  assert.equal(gunler.length, 1);
  assert.ok(gunler[0] === once || gunler[0] === sonra);
  assert.equal(veri.kullanim[gunler[0]].kayit, 1);
});

test("kullanimSay: girdiyi değiştirmez, sayaçlar yalnızca sayıdır", () => {
  const veri = kullanimSay(ornekVeri(), "acilis", "2026-11-14");
  const kopya = structuredClone(veri);
  const yeni = kullanimSay(veri, "acilis", "2026-11-14");
  assert.deepEqual(veri, kopya);
  assert.equal(yeni.kullanim["2026-11-14"].acilis, 2);
  for (const sayac of Object.values(yeni.kullanim)) {
    assert.deepEqual(Object.keys(sayac).sort(), ["acilis", "kayit", "whatsapp"]);
    for (const deger of Object.values(sayac)) assert.equal(typeof deger, "number");
  }
});

test("kullanimSay: geçersiz gün hata fırlatır", () => {
  assert.throws(() => kullanimSay(bosVeri(), "acilis", "__proto__"));
  assert.throws(() => kullanimSay(bosVeri(), "acilis", "2026-02-30"));
});

// --- yedekAlindi / sonYedektenBuYanaGun ------------------------------------------

test("yedekAlindi: sonYedek ayarlanır, girdi değişmez", () => {
  const veri = bosVeri();
  const yeni = yedekAlindi(veri, "2026-11-14T09:00:00.000Z");
  assert.equal(yeni.sonYedek, "2026-11-14T09:00:00.000Z");
  assert.equal(veri.sonYedek, null);
});

test("yedekAlindi: zaman verilmezse şimdiki an", () => {
  const once = Date.now();
  const yeni = yedekAlindi(bosVeri());
  const sonra = Date.now();
  const an = Date.parse(yeni.sonYedek);
  assert.ok(an >= once && an <= sonra);
});

test("yedektenYukle: dosyadan yalnızca araçları alır, telefonun kullanımını korur ve sonYedek zamanını günceller", () => {
  let mevcut = bosVeri();
  mevcut = islemEkle(mevcut, "06 ELY 99", "Mehmet", "0544 999 88 77", islem("2026-01-01"));
  mevcut = kullanimSay(mevcut, "acilis", "2026-11-14");
  mevcut = kullanimSay(mevcut, "kayit", "2026-11-14");
  mevcut = yedekAlindi(mevcut, "2026-10-01T08:00:00.000Z");

  let dosyadan = ornekVeri();
  dosyadan = kullanimSay(dosyadan, "whatsapp", "2025-05-05");
  dosyadan = yedekAlindi(dosyadan, "2025-05-05T10:00:00.000Z");

  const mevcutKopya = structuredClone(mevcut);
  const dosyadanKopya = structuredClone(dosyadan);

  const sonuc = yedektenYukle(mevcut, dosyadan, "2026-11-14T15:30:00.000Z");
  assert.deepEqual(sonuc.araclar, dosyadan.araclar);
  assert.deepEqual(sonuc.kullanim, mevcut.kullanim);
  assert.equal(sonuc.sonYedek, "2026-11-14T15:30:00.000Z");

  // Mutating the result must not touch either input.
  sonuc.araclar[0].musteri = "Değişti";
  sonuc.kullanim["2026-11-14"].acilis = 999;
  assert.deepEqual(mevcut, mevcutKopya);
  assert.deepEqual(dosyadan, dosyadanKopya);
});

test("yedektenYukle: zaman verilmezse şimdiki zamanı yazar", () => {
  const once = Date.now();
  const sonuc = yedektenYukle(bosVeri(), ornekVeri());
  const sonra = Date.now();
  const an = Date.parse(sonuc.sonYedek);
  assert.ok(an >= once && an <= sonra);
});

test("sonYedektenBuYanaGun: hiç yedek yoksa null", () => {
  assert.equal(sonYedektenBuYanaGun(bosVeri()), null);
});

test("sonYedektenBuYanaGun: ay sonunu aşan takvim günleri", () => {
  // Built from local times so the test does not depend on the time zone.
  const yedek = new Date(2026, 9, 30, 23, 30).toISOString(); // 30 Oct, 23:30
  const veri = yedekAlindi(bosVeri(), yedek);
  assert.equal(sonYedektenBuYanaGun(veri, new Date(2026, 9, 30, 23, 59)), 0);
  assert.equal(sonYedektenBuYanaGun(veri, new Date(2026, 9, 31, 0, 5)), 1);
  assert.equal(sonYedektenBuYanaGun(veri, new Date(2026, 10, 2, 8, 0)), 3);
});

test("sonYedektenBuYanaGun: yıl sonunu da aşar", () => {
  const veri = yedekAlindi(bosVeri(), new Date(2026, 11, 31, 12, 0).toISOString());
  assert.equal(sonYedektenBuYanaGun(veri, new Date(2027, 0, 1, 12, 0)), 1);
  assert.equal(sonYedektenBuYanaGun(veri, new Date(2027, 1, 1, 12, 0)), 32);
});

// --- disaAktar / iceAktar ---------------------------------------------------------

function doluVeri() {
  let veri = ornekVeri();
  veri = islemEkle(veri, "01 AB 01", "Ayşe Kaya", "0533 111 22 33", {
    tarih: "2026-07-01",
    yapilanIs: "Şarj dinamosu",
    ucret: 1250.5,
    garantiBitis: "2027-07-01",
    sonrakiBakim: "2027-01-01",
  });
  veri = kullanimSay(veri, "acilis", "2026-11-13");
  veri = kullanimSay(veri, "whatsapp", "2026-11-14");
  veri = yedekAlindi(veri, "2026-11-14T09:00:00.000Z");
  return veri;
}

test("disaAktar: 2 boşlukla girintili JSON", () => {
  const veri = doluVeri();
  const metin = disaAktar(veri);
  assert.equal(metin, JSON.stringify(veri, null, 2));
  assert.ok(metin.startsWith('{\n  "surum": 1,'));
});

test("disaAktar / iceAktar: gidiş-dönüş aynı veriyi verir", () => {
  for (const veri of [bosVeri(), ornekVeri(), doluVeri()]) {
    const sonuc = iceAktar(disaAktar(veri));
    assert.equal(sonuc.tamam, true, sonuc.hata);
    assert.deepEqual(sonuc.veri, veri);
  }
});

test("iceAktar: bilinmeyen alanlar atılır", () => {
  const ham = JSON.parse(disaAktar(doluVeri()));
  ham.fazla = "x";
  ham.araclar[0].renk = "kırmızı";
  ham.araclar[0].islemler[0].not = "y";
  ham.kullanim["2026-11-13"].baska = 5;
  const sonuc = iceAktar(JSON.stringify(ham));
  assert.equal(sonuc.tamam, true, sonuc.hata);
  assert.deepEqual(sonuc.veri, doluVeri());
});

test("iceAktar: garantiBitis boş olabilir, ücret 0 olabilir, sonYedek null olabilir", () => {
  const veri = islemEkle(bosVeri(), "34 ABC 123", "A", "0532 123 45 67", {
    tarih: "2026-01-01",
    yapilanIs: "",
    ucret: 0,
    garantiBitis: "",
    sonrakiBakim: "2026-07-01",
  });
  const sonuc = iceAktar(disaAktar(veri));
  assert.equal(sonuc.tamam, true, sonuc.hata);
  assert.deepEqual(sonuc.veri, veri);
});

// Each case starts from a valid export and breaks exactly one thing.
function bozuk(degistir) {
  const ham = JSON.parse(disaAktar(doluVeri()));
  degistir(ham);
  return JSON.stringify(ham);
}

const BOZUK_GIRDILER = [
  ["JSON değil", "bu bir yedek değil {"],
  ["boş metin", ""],
  ["dizi", "[]"],
  ["null", "null"],
  ["sayı", "42"],
  ["yanlış sürüm", bozuk((h) => { h.surum = 2; })],
  ["sürüm metin", bozuk((h) => { h.surum = "1"; })],
  ["sürüm yok", bozuk((h) => { delete h.surum; })],
  ["araclar dizi değil", bozuk((h) => { h.araclar = {}; })],
  ["araç nesne değil", bozuk((h) => { h.araclar[0] = "34 ABC 123"; })],
  ["plaka yok", bozuk((h) => { delete h.araclar[0].plaka; })],
  ["plaka boş", bozuk((h) => { h.araclar[0].plaka = "  "; })],
  ["plaka sayı", bozuk((h) => { h.araclar[0].plaka = 34; })],
  ["müşteri boş", bozuk((h) => { h.araclar[0].musteri = ""; })],
  ["müşteri çok uzun", bozuk((h) => { h.araclar[0].musteri = "a".repeat(201); })],
  ["telefon yok", bozuk((h) => { delete h.araclar[0].telefon; })],
  ["islemler yok", bozuk((h) => { delete h.araclar[0].islemler; })],
  ["boşluk farkıyla aynı plaka", bozuk((h) => {
    h.araclar.push({ ...h.araclar[0], plaka: h.araclar[0].plaka.replace(/ /g, "") });
  })],
  ["aynı plaka iki kez", bozuk((h) => { h.araclar.push(h.araclar[0]); })],
  ["geçersiz işlem tarihi", bozuk((h) => { h.araclar[0].islemler[0].tarih = "2026-02-30"; })],
  ["işlem tarihi biçimsiz", bozuk((h) => { h.araclar[0].islemler[0].tarih = "14.11.2026"; })],
  ["geçersiz garanti tarihi", bozuk((h) => { h.araclar[0].islemler[0].garantiBitis = "yok"; })],
  ["geçersiz sonraki bakım", bozuk((h) => { h.araclar[0].islemler[0].sonrakiBakim = ""; })],
  ["yapılan iş sayı", bozuk((h) => { h.araclar[0].islemler[0].yapilanIs = 5; })],
  ["negatif ücret", bozuk((h) => { h.araclar[0].islemler[0].ucret = -1; })],
  ["ücret metin", bozuk((h) => { h.araclar[0].islemler[0].ucret = "100"; })],
  ["ücret null", bozuk((h) => { h.araclar[0].islemler[0].ucret = null; })],
  ["işlem nesne değil", bozuk((h) => { h.araclar[0].islemler[0] = null; })],
  ["negatif sayaç", bozuk((h) => { h.kullanim["2026-11-13"].acilis = -1; })],
  ["kesirli sayaç", bozuk((h) => { h.kullanim["2026-11-13"].acilis = 1.5; })],
  ["sayaç eksik", bozuk((h) => { delete h.kullanim["2026-11-13"].kayit; })],
  ["kullanım yok", bozuk((h) => { delete h.kullanim; })],
  ["kullanım dizi", bozuk((h) => { h.kullanim = []; })],
  ["kullanım günü geçersiz", bozuk((h) => { h.kullanim["dün"] = { acilis: 1, kayit: 0, whatsapp: 0 }; })],
  ["sonYedek yok", bozuk((h) => { delete h.sonYedek; })],
  ["sonYedek sayı", bozuk((h) => { h.sonYedek = 5; })],
  ["sonYedek bozuk zaman", bozuk((h) => { h.sonYedek = "dün akşam"; })],
];

for (const [ad, metin] of BOZUK_GIRDILER) {
  test(`iceAktar reddeder: ${ad}`, () => {
    let sonuc;
    assert.doesNotThrow(() => {
      sonuc = iceAktar(metin);
    });
    assert.equal(sonuc.tamam, false);
    assert.equal(typeof sonuc.hata, "string");
    assert.ok(sonuc.hata.length > 0);
    assert.equal("veri" in sonuc, false);
  });
}

test("iceAktar: metin olmayan girdide de hata fırlatmaz", () => {
  for (const girdi of [undefined, null, 5, {}]) {
    const sonuc = iceAktar(girdi);
    assert.equal(sonuc.tamam, false);
    assert.equal(typeof sonuc.hata, "string");
  }
});

test("iceAktar: hata mesajı Türkçe ve yeri gösterir", () => {
  const sonuc = iceAktar(bozuk((h) => { h.araclar[1].islemler[0].ucret = -5; }));
  assert.equal(sonuc.tamam, false);
  assert.match(sonuc.hata, /2\. araçtaki 1\. işlem/);
  assert.match(sonuc.hata, /ücret/);
});
