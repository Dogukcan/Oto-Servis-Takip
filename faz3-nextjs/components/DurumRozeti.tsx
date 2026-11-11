import type { BakimDurumu } from "@/lib/bakim-durumu";

const ETIKETLER: Record<BakimDurumu, string> = {
  gecmis: "Bakım geçti",
  yaklasiyor: "Yaklaşıyor",
  uygun: "Uygun",
};

const SINIFLAR: Record<BakimDurumu, string> = {
  gecmis: "durum durum-gecmis",
  yaklasiyor: "durum durum-yaklasiyor",
  uygun: "durum durum-uygun",
};

export function DurumRozeti({ durum }: { durum: BakimDurumu | null }) {
  if (durum === null) {
    return <span className="durum">Kayıt yok</span>;
  }
  return <span className={SINIFLAR[durum]}>{ETIKETLER[durum]}</span>;
}
