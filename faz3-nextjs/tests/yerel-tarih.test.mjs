// Pure unit test for yerelTarihISO. It imports only lib/format.ts, which has no
// imports of its own, so it never loads lib/db.ts and never resolves or opens
// any database file.
// Run: node --test tests/yerel-tarih.test.mjs
process.env.TZ = "Europe/Istanbul";

import { test } from "node:test";
import assert from "node:assert/strict";
import { yerelTarihISO } from "../lib/format.ts";

test("01:30 Istanbul (22:30 UTC previous day) gives the local day", () => {
  const an = new Date("2026-11-11T22:30:00Z");
  assert.equal(an.toISOString().slice(0, 10), "2026-11-11"); // the old, wrong value
  assert.equal(yerelTarihISO(an), "2026-11-12");
});

test("just before local midnight stays on the same day", () => {
  assert.equal(yerelTarihISO(new Date("2026-11-12T20:59:59Z")), "2026-11-12");
});

test("year boundary uses local year", () => {
  assert.equal(yerelTarihISO(new Date("2026-12-31T21:00:00Z")), "2027-01-01");
});

test("month and day are zero-padded", () => {
  assert.equal(yerelTarihISO(new Date(2026, 0, 5, 12, 0, 0)), "2026-01-05");
});

test("default argument is now", () => {
  const once = yerelTarihISO(new Date());
  const sonuc = yerelTarihISO();
  const sonra = yerelTarihISO(new Date());
  assert.ok(sonuc === once || sonuc === sonra);
  assert.match(sonuc, /^\d{4}-\d{2}-\d{2}$/);
});
