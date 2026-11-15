import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  onbellekListesiCikar,
  surumHesapla,
  swIcerigiUret,
  swYaz,
} from "../scripts/sw-uret.mjs";

function geciciOutOlustur(calistir) {
  const kok = fs.mkdtempSync(path.join(os.tmpdir(), "sw-uret-test-"));
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

test("onbellekListesiCikar: kök index, alt index, düz dosyalar, boşluklu adlar, sw.js ve nokta dosyaları kurallarını uygular", () => {
  geciciOutOlustur((outDizini) => {
    dosyaYaz(outDizini, "index.html", "<h1>Ana sayfa</h1>");
    dosyaYaz(outDizini, "kayit/index.html", "<h1>Kayıt</h1>");
    dosyaYaz(outDizini, "arac/detay/index.html", "<h1>Detay</h1>");
    dosyaYaz(outDizini, "_next/static/app.js", "console.log(1);");
    dosyaYaz(outDizini, "belgeler/servis raporu 1.pdf", "pdf");
    dosyaYaz(outDizini, "sw.js", "// service worker");
    dosyaYaz(outDizini, ".DS_Store", "gizli");
    dosyaYaz(outDizini, ".gizli-klasor/ic.txt", "gizli-klasor-ici");
    dosyaYaz(outDizini, "kayit/.gizli.txt", "alt-gizli");

    const liste = onbellekListesiCikar(outDizini);

    assert.deepEqual(liste, [
      "./",
      "./_next/static/app.js",
      "./arac/detay/",
      "./belgeler/servis%20raporu%201.pdf",
      "./kayit/",
    ]);
    for (const url of liste) {
      assert.equal(url.includes("\\"), false);
    }
  });
});

test("onbellekListesiCikar: kök 404.html, 404 ve _not-found klasörlerini atlar, alt ağaçtaki aynı adlı klasörleri korur", () => {
  geciciOutOlustur((outDizini) => {
    dosyaYaz(outDizini, "index.html", "<h1>Ana sayfa</h1>");
    dosyaYaz(outDizini, "404.html", "<h1>Bulunamadı</h1>");
    dosyaYaz(outDizini, "404/index.html", "<h1>Kök 404</h1>");
    dosyaYaz(outDizini, "_not-found/index.html", "<h1>Kök not-found</h1>");
    dosyaYaz(outDizini, "_not-found/page.js", "console.log('404');");
    dosyaYaz(outDizini, "yardim/404/index.html", "<h1>Alt 404</h1>");
    dosyaYaz(outDizini, "yardim/_not-found/index.html", "<h1>Alt not-found</h1>");
    dosyaYaz(outDizini, "yardim/404.html", "<h1>Alt 404 dosya</h1>");

    const liste = onbellekListesiCikar(outDizini);

    assert.deepEqual(liste, [
      "./",
      "./yardim/404.html",
      "./yardim/404/",
      "./yardim/_not-found/",
    ]);
  });
});

test("onbellekListesiCikar: '@' ve '+' karakterlerini olduğu gibi bırakır, boşluğu %20 ve '#' karakterini %23 yapar", () => {
  geciciOutOlustur((outDizini) => {
    dosyaYaz(outDizini, "index.html", "<h1>Ana</h1>");
    dosyaYaz(outDizini, "varliklar/ikon@2x+v1.png", "png");
    dosyaYaz(outDizini, "belgeler/rapor #1 özet.pdf", "pdf");

    const liste = onbellekListesiCikar(outDizini);

    assert.deepEqual(liste, [
      "./",
      "./belgeler/rapor%20%231%20%C3%B6zet.pdf",
      "./varliklar/ikon@2x+v1.png",
    ]);
  });
});

test("surumHesapla: iki çağrıda kararlıdır, içerik veya dosya eklenince değişir, diskteki sw.js veya kök 404 dosyaları değişince değişmez", () => {
  geciciOutOlustur((outDizini) => {
    dosyaYaz(outDizini, "index.html", "<html>1</html>");
    dosyaYaz(outDizini, "kayit/index.html", "<html>kayit</html>");
    dosyaYaz(outDizini, "sw.js", "const v = 1;");

    const sablon = 'const S = "__SW_SURUM__"; const L = ["__SW_LISTE__"];';
    const ilkSurum = surumHesapla(outDizini, sablon);
    const ikinciSurum = surumHesapla(outDizini, sablon);

    assert.equal(ilkSurum.length, 16);
    assert.match(ilkSurum, /^[0-9a-f]{16}$/);
    assert.equal(ilkSurum, ikinciSurum);

    // Changing only sw.js on disk must not change the version.
    dosyaYaz(outDizini, "sw.js", "const v = 2; // changed on disk");
    const swDegistiSurum = surumHesapla(outDizini, sablon);
    assert.equal(swDegistiSurum, ilkSurum);

    // Adding or modifying root 404 / _not-found entries must not change the version.
    dosyaYaz(outDizini, "404.html", "not found");
    dosyaYaz(outDizini, "404/index.html", "not found dir");
    dosyaYaz(outDizini, "_not-found/index.html", "not found app");
    assert.equal(surumHesapla(outDizini, sablon), ilkSurum);

    // Changing a tracked file's content must change the version.
    dosyaYaz(outDizini, "index.html", "<html>2</html>");
    const icerikDegistiSurum = surumHesapla(outDizini, sablon);
    assert.notEqual(icerikDegistiSurum, ilkSurum);

    // Adding a new file must change the version.
    dosyaYaz(outDizini, "yeni.txt", "merhaba");
    const dosyaEklendiSurum = surumHesapla(outDizini, sablon);
    assert.notEqual(dosyaEklendiSurum, icerikDegistiSurum);
  });
});

test("surumHesapla: şablon metni argümanı değiştiğinde sürüm değişir, aynı şablon için kararlıdır", () => {
  geciciOutOlustur((outDizini) => {
    dosyaYaz(outDizini, "index.html", "<html>1</html>");

    const sablonA = 'const S = "__SW_SURUM__"; const L = ["__SW_LISTE__"]; // v1';
    const sablonB = 'const S = "__SW_SURUM__"; const L = ["__SW_LISTE__"]; // v2';

    const surumA1 = surumHesapla(outDizini, sablonA);
    const surumA2 = surumHesapla(outDizini, sablonA);
    const surumB = surumHesapla(outDizini, sablonB);
    const surumVarsayilan = surumHesapla(outDizini);

    assert.equal(surumA1, surumA2);
    assert.notEqual(surumA1, surumB);
    assert.notEqual(surumA1, surumVarsayilan);
    assert.equal(surumVarsayilan, surumHesapla(outDizini, ""));
  });
});

test("swIcerigiUret: her iki yer tutucuyu değiştirir ve çıktı verilen değerlere ayrıştırılır", () => {
  const sablon = [
    'const SURUM = "__SW_SURUM__";',
    'const LISTE = ["__SW_LISTE__"];',
    "export default { SURUM, LISTE };",
  ].join("\n");

  const surum = "0123456789abcdef";
  const liste = ["./", "./kayit/", "./_next/app.js"];
  const sonuc = swIcerigiUret(sablon, surum, liste);

  assert.equal(sonuc.includes('"__SW_SURUM__"'), false);
  assert.equal(sonuc.includes('["__SW_LISTE__"]'), false);

  const surumEslesme = sonuc.match(/const SURUM = (.+);/);
  const listeEslesme = sonuc.match(/const LISTE = (.+);/);
  assert.ok(surumEslesme);
  assert.ok(listeEslesme);
  assert.equal(JSON.parse(surumEslesme[1]), surum);
  assert.deepEqual(JSON.parse(listeEslesme[1]), liste);
});

test("swIcerigiUret: yer tutucu eksik olduğunda veya iki kez geçtiğinde hata fırlatır", () => {
  const gecerliSurum = "abcdef0123456789";
  const gecerliListe = ["./"];

  // Missing version placeholder
  assert.throws(
    () => swIcerigiUret('const L = ["__SW_LISTE__"];', gecerliSurum, gecerliListe),
    /__SW_SURUM__/
  );

  // Missing list placeholder
  assert.throws(
    () => swIcerigiUret('const V = "__SW_SURUM__";', gecerliSurum, gecerliListe),
    /__SW_LISTE__/
  );

  // Duplicate version placeholder
  assert.throws(
    () =>
      swIcerigiUret(
        'const V1 = "__SW_SURUM__"; const V2 = "__SW_SURUM__"; const L = ["__SW_LISTE__"];',
        gecerliSurum,
        gecerliListe
      ),
    /__SW_SURUM__/
  );

  // Duplicate list placeholder
  assert.throws(
    () =>
      swIcerigiUret(
        'const V = "__SW_SURUM__"; const L1 = ["__SW_LISTE__"]; const L2 = ["__SW_LISTE__"];',
        gecerliSurum,
        gecerliListe
      ),
    /__SW_LISTE__/
  );
});

test("swYaz: dosyayı yazar, sayıyı döner ve ikinci çalıştırmada dosyayı değiştirmeden hata fırlatır", () => {
  geciciOutOlustur((outDizini) => {
    const sablonMetni =
      'const SURUM = "__SW_SURUM__";\nconst LISTE = ["__SW_LISTE__"];\n';
    dosyaYaz(outDizini, "index.html", "<html>ana</html>");
    dosyaYaz(outDizini, "kayit/index.html", "<html>kayit</html>");
    dosyaYaz(outDizini, "app.js", "console.log('merhaba');");
    dosyaYaz(outDizini, "sw.js", sablonMetni);

    const beklenenSurum = surumHesapla(outDizini, sablonMetni);
    const sonuc = swYaz(outDizini);

    assert.deepEqual(sonuc, {
      surum: beklenenSurum,
      dosyaSayisi: 3,
    });

    const swYolu = path.join(outDizini, "sw.js");
    const ilkYazilan = fs.readFileSync(swYolu, "utf8");
    assert.ok(ilkYazilan.includes(JSON.stringify(beklenenSurum)));
    assert.ok(ilkYazilan.includes(JSON.stringify(["./", "./app.js", "./kayit/"])));

    // Second run must throw because placeholders were already replaced, and leave sw.js untouched.
    assert.throws(() => swYaz(outDizini), /Placeholder/);
    assert.equal(fs.readFileSync(swYolu, "utf8"), ilkYazilan);
  });
});

test("swYaz: aynı dosyalara sahip ancak sw.js şablonu farklı iki klasör için farklı sürüm üretir", () => {
  geciciOutOlustur((outDizini1) => {
    geciciOutOlustur((outDizini2) => {
      dosyaYaz(outDizini1, "index.html", "<html>ayni</html>");
      dosyaYaz(outDizini1, "app.js", "console.log(1);");
      dosyaYaz(
        outDizini1,
        "sw.js",
        'const SURUM = "__SW_SURUM__";\nconst LISTE = ["__SW_LISTE__"];\n// sablon 1\n'
      );

      dosyaYaz(outDizini2, "index.html", "<html>ayni</html>");
      dosyaYaz(outDizini2, "app.js", "console.log(1);");
      dosyaYaz(
        outDizini2,
        "sw.js",
        'const SURUM = "__SW_SURUM__";\nconst LISTE = ["__SW_LISTE__"];\n// sablon 2\n'
      );

      const sonuc1 = swYaz(outDizini1);
      const sonuc2 = swYaz(outDizini2);

      assert.equal(sonuc1.dosyaSayisi, sonuc2.dosyaSayisi);
      assert.notEqual(sonuc1.surum, sonuc2.surum);
    });
  });
});
