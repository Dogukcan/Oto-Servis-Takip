import { tumAraclariGetir } from "@/lib/db-sorgular";
import { AramaSonuclari } from "@/components/AramaSonuclari";

export const dynamic = "force-dynamic";

export default function AracAraSayfasi() {
  const araclar = tumAraclariGetir();

  return (
    <>
      <h1>Araç Ara</h1>
      <AramaSonuclari araclar={araclar} />
    </>
  );
}
