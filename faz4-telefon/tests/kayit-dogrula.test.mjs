import { test } from "node:test";
import assert from "node:assert/strict";
import {
  yeniKayitDogrula,
  aracGuncellemeDogrula,
} from "../lib/kayit-dogrula.ts";
import { yerelTarihISO } from "../lib/format.ts";

const MUSTERI_HATASI =
  "Müşteri adı boş olamaz, en fazla 200 karakter olabilir.";
const YAPILAN_IS_HATASI =
  "Yapılan iş boş olamaz, en fazla 200 karakter olabilir.";

function gecerliKayit(degisiklik = {}) {
  return {
    plaka: "34abc123",
    musteri: "  Ahmet Yılmaz ",
    telefon: "5321234567",
    yapilanIs: " Akü değişimi ",
    ucret: "1500",
    garantiBitis: "2027-11-14",
    sonrakiBakim: "2027-05-14",
    ...degisiklik,
  };
}

function gecerliGuncelleme(degisiklik = {}) {
  return {
    eskiPlaka: "34 ABC 123",
    plaka: "34 ABC 123",
    musteri: "Ahmet Yılmaz",
    telefon: "0532 123 45 67",
    ...degisiklik,
  };
}

// --- yeniKayitDogrula -------------------------------------------------------

test("yeniKayitDogrula: geçerli kayıt biçimlenmiş değerlerle döner", () => {
  const sonuc = yeniKayitDogrula(gecerliKayit(), "2026-11-14");
  assert.deepEqual(sonuc, {
    tamam: true,
    plaka: "34 ABC 123",
    musteri: "Ahmet Yılmaz",
    telefon: "0532 123 45 67",
    islem: {
      tarih: "2026-11-14",
      yapilanIs: "Akü değişimi",
      ucret: 1500,
      garantiBitis: "2027-11-14",
      sonrakiBakim: "2027-05-14",
    },
  });
});

test("yeniKayitDogrula: tarih verilmezse bugünün yerel tarihi kullanılır", () => {
  const once = yerelTarihISO();
  const sonuc = yeniKayitDogrula(gecerliKayit());
  const sonra = yerelTarihISO();
  assert.equal(sonuc.tamam, true);
  // Accept either value in case the test runs exactly at midnight.
  assert.ok(sonuc.islem.tarih === once || sonuc.islem.tarih === sonra);
});

test("yeniKayitDogrula: garanti boş bırakılabilir, ücret sayı olarak da gelebilir", () => {
  const sonuc = yeniKayitDogrula(
    gecerliKayit({ garantiBitis: "", ucret: 0 }),
    "2026-11-14"
  );
  assert.equal(sonuc.tamam, true);
  assert.equal(sonuc.islem.garantiBitis, "");
  assert.equal(sonuc.islem.ucret, 0);
});

test("yeniKayitDogrula: nesne olmayan girdi okunamaz", () => {
  for (const girdi of [null, undefined, "metin", 42, true]) {
    assert.deepEqual(yeniKayitDogrula(girdi), {
      tamam: false,
      hata: "İstek okunamadı.",
    });
  }
});

test("yeniKayitDogrula: her kural kendi mesajını verir", () => {
  const durumlar = [
    [{ plaka: "" }, "Geçerli bir plaka girin."],
    [{ plaka: "00 ABC 123" }, "Geçerli bir plaka girin."],
    [{ plaka: undefined }, "Geçerli bir plaka girin."],
    [{ musteri: "   " }, MUSTERI_HATASI],
    [{ musteri: "a".repeat(201) }, MUSTERI_HATASI],
    [{ telefon: "123" }, "Geçerli bir telefon numarası girin."],
    [{ telefon: "" }, "Geçerli bir telefon numarası girin."],
    [{ yapilanIs: "" }, YAPILAN_IS_HATASI],
    [{ yapilanIs: "a".repeat(201) }, YAPILAN_IS_HATASI],
    [{ ucret: "abc" }, "Geçerli bir ücret girin."],
    [{ ucret: -1 }, "Geçerli bir ücret girin."],
    [{ ucret: undefined }, "Geçerli bir ücret girin."],
    [{ ucret: "Infinity" }, "Geçerli bir ücret girin."],
    [{ garantiBitis: "2027-02-30" }, "Geçerli bir garanti bitiş tarihi girin."],
    [{ garantiBitis: "14.11.2027" }, "Geçerli bir garanti bitiş tarihi girin."],
    [{ sonrakiBakim: "" }, "Geçerli bir sonraki bakım tarihi girin."],
    [{ sonrakiBakim: "2027-13-01" }, "Geçerli bir sonraki bakım tarihi girin."],
  ];
  for (const [degisiklik, hata] of durumlar) {
    assert.deepEqual(
      yeniKayitDogrula(gecerliKayit(degisiklik), "2026-11-14"),
      { tamam: false, hata },
      JSON.stringify(degisiklik)
    );
  }
});

test("yeniKayitDogrula: 200 karakterlik ad ve iş kabul edilir", () => {
  const sonuc = yeniKayitDogrula(
    gecerliKayit({ musteri: "a".repeat(200), yapilanIs: "b".repeat(200) }),
    "2026-11-14"
  );
  assert.equal(sonuc.tamam, true);
});

test("yeniKayitDogrula: kurallar route ile aynı sırada denetlenir", () => {
  // Both plate and phone are wrong: the plate message comes first.
  const sonuc = yeniKayitDogrula(
    gecerliKayit({ plaka: "x", telefon: "x" }),
    "2026-11-14"
  );
  assert.deepEqual(sonuc, { tamam: false, hata: "Geçerli bir plaka girin." });
});

test("yeniKayitDogrula: girdiyi değiştirmez", () => {
  const girdi = gecerliKayit();
  const kopya = structuredClone(girdi);
  yeniKayitDogrula(girdi, "2026-11-14");
  assert.deepEqual(girdi, kopya);
});

// --- aracGuncellemeDogrula --------------------------------------------------

test("aracGuncellemeDogrula: plaka değişmeden geçerli güncelleme", () => {
  assert.deepEqual(aracGuncellemeDogrula(gecerliGuncelleme()), {
    tamam: true,
    eskiPlaka: "34 ABC 123",
    yeniPlaka: "34 ABC 123",
    musteri: "Ahmet Yılmaz",
    telefon: "0532 123 45 67",
  });
});

test("aracGuncellemeDogrula: değişen plaka biçimlenir, telefon biçimlenir", () => {
  const sonuc = aracGuncellemeDogrula(
    gecerliGuncelleme({ plaka: " 06ely99 ", telefon: "05321234567", musteri: " Ali " })
  );
  assert.deepEqual(sonuc, {
    tamam: true,
    eskiPlaka: "34 ABC 123",
    yeniPlaka: "06 ELY 99",
    musteri: "Ali",
    telefon: "0532 123 45 67",
  });
});

test("aracGuncellemeDogrula: dokunulmamış eski plaka yeniden denetlenmez", () => {
  // "ESKİ-1" fails today's plate rules, but name/phone must stay editable.
  const sonuc = aracGuncellemeDogrula(
    gecerliGuncelleme({ eskiPlaka: "ESKİ-1", plaka: "ESKİ-1" })
  );
  assert.equal(sonuc.tamam, true);
  assert.equal(sonuc.yeniPlaka, "ESKİ-1");
});

test("aracGuncellemeDogrula: nesne olmayan girdi okunamaz", () => {
  for (const girdi of [null, undefined, "metin", 7]) {
    assert.deepEqual(aracGuncellemeDogrula(girdi), {
      tamam: false,
      hata: "İstek okunamadı.",
    });
  }
});

test("aracGuncellemeDogrula: her kural kendi mesajını verir", () => {
  const durumlar = [
    [{ eskiPlaka: "" }, "Düzenlenecek araç belirtilmedi."],
    [{ eskiPlaka: undefined }, "Düzenlenecek araç belirtilmedi."],
    [{ plaka: "geçersiz" }, "Geçerli bir plaka girin."],
    [{ plaka: "" }, "Geçerli bir plaka girin."],
    [{ musteri: "" }, MUSTERI_HATASI],
    [{ musteri: "a".repeat(201) }, MUSTERI_HATASI],
    [{ telefon: "12345" }, "Geçerli bir telefon numarası girin."],
  ];
  for (const [degisiklik, hata] of durumlar) {
    assert.deepEqual(
      aracGuncellemeDogrula(gecerliGuncelleme(degisiklik)),
      { tamam: false, hata },
      JSON.stringify(degisiklik)
    );
  }
});
