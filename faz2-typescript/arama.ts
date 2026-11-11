import type { Arac } from "./types.ts";

function normalizeEt(metin: string): string {
  return metin.toUpperCase().replace(/\s+/g, "");
}

export function aracAra(araclar: Arac[], sorgu: string): Arac[] {
  const anahtar = normalizeEt(sorgu);
  if (anahtar === "") return araclar;
  return araclar.filter((arac) => normalizeEt(arac.plaka).includes(anahtar));
}
