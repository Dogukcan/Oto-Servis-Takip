import Link from "next/link";
import { yedekDurumunuOku } from "@/lib/yedekle";

export function UstBar() {
  const yedekDurumu = yedekDurumunuOku();
  const sonYedekBasarisiz = yedekDurumu !== null && !yedekDurumu.basarili;

  return (
    <header className="ust-bar">
      <h1>Servis Takip</h1>
      <nav className="menu">
        <Link href="/">Araç Listesi</Link>
        <Link href="/kayit">Yeni Kayıt</Link>
        <Link href="/arac">Araç Ara</Link>
        <Link href="/hatirlatma">Hatırlatmalar</Link>
        <a
          href="/api/yedek"
          download
          className="yedek-al-linki"
          title={
            sonYedekBasarisiz
              ? `Son otomatik yedek başarısız oldu: ${yedekDurumu.hata ?? "bilinmeyen hata"}`
              : undefined
          }
        >
          Yedek Al{sonYedekBasarisiz ? " ⚠" : ""}
        </a>
      </nav>
    </header>
  );
}
