import type { Arac } from "./types";
import { plakaAnahtari } from "./format";

export function aracAra(araclar: Arac[], sorgu: string): Arac[] {
  const anahtar = plakaAnahtari(sorgu);
  if (anahtar === "") return araclar;
  return araclar.filter((arac) => plakaAnahtari(arac.plaka).includes(anahtar));
}
