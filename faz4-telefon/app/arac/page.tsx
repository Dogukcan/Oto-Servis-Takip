"use client";

import { tumAraclar } from "@/lib/depo";
import { AramaSonuclari } from "@/components/AramaSonuclari";
import { useVeri } from "@/components/VeriSaglayici";

export default function AracAraSayfasi() {
  const { veri } = useVeri();
  const araclar = tumAraclar(veri);

  return (
    <>
      <h1>Araç Ara</h1>
      <AramaSonuclari araclar={araclar} />
    </>
  );
}
