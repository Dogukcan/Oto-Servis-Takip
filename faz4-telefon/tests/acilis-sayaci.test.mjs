import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ARKA_PLAN_ACILIS_ESIGI_MS,
  arkaPlanAcilisiSayilmaliMi,
  acilisIzleyiciOlustur,
} from "../lib/acilis-sayaci.ts";

test("ARKA_PLAN_ACILIS_ESIGI_MS: 30 dakikadır", () => {
  assert.equal(ARKA_PLAN_ACILIS_ESIGI_MS, 30 * 60 * 1000);
});

test("arkaPlanAcilisiSayilmaliMi: gizlenme zamanı yoksa veya 30 dakikadan azsa false, 30 dakika ve üzerinde true", () => {
  const baslangic = 1_000_000;
  assert.equal(arkaPlanAcilisiSayilmaliMi(null, baslangic + ARKA_PLAN_ACILIS_ESIGI_MS), false);
  assert.equal(
    arkaPlanAcilisiSayilmaliMi(baslangic, baslangic + ARKA_PLAN_ACILIS_ESIGI_MS - 1),
    false
  );
  assert.equal(
    arkaPlanAcilisiSayilmaliMi(baslangic, baslangic + ARKA_PLAN_ACILIS_ESIGI_MS),
    true
  );
  assert.equal(
    arkaPlanAcilisiSayilmaliMi(baslangic, baslangic + ARKA_PLAN_ACILIS_ESIGI_MS + 60_000),
    true
  );
});

test("acilisIzleyiciOlustur: kısa arka plan dönüşünü saymaz, 30 dakika sonraki dönüşü bir kez sayar", () => {
  const izleyici = acilisIzleyiciOlustur();
  const t0 = 10_000;

  // Visible without having been hidden first.
  assert.equal(izleyici.gorunurlukDegisti("visible", t0), false);

  // Hidden for 10 minutes (< 30 minutes): not counted.
  assert.equal(izleyici.gorunurlukDegisti("hidden", t0), false);
  assert.equal(izleyici.gorunurlukDegisti("visible", t0 + 10 * 60 * 1000), false);

  // Hidden for 30 minutes: counted once.
  const t1 = 100_000;
  assert.equal(izleyici.gorunurlukDegisti("hidden", t1), false);
  // A duplicate hidden event must not push the hidden timestamp forward.
  assert.equal(izleyici.gorunurlukDegisti("hidden", t1 + 20 * 60 * 1000), false);
  assert.equal(
    izleyici.gorunurlukDegisti("visible", t1 + ARKA_PLAN_ACILIS_ESIGI_MS),
    true
  );
  // A repeated visible event without hiding again must not count twice.
  assert.equal(
    izleyici.gorunurlukDegisti("visible", t1 + ARKA_PLAN_ACILIS_ESIGI_MS + 60 * 60 * 1000),
    false
  );
});
