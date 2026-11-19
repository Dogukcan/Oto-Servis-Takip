# Backlog

Bir iş yarım kalırsa buraya not düşülür: ne yapıldı, ne eksik kaldı, nereden devam edilecek.
İş tamamlanınca ilgili madde silinir. Hiçbir iş bu dosyaya not düşülmeden yarım bırakılmaz.

## Açık işler

- Telefon sürümü (`faz4-telefon`) gerçek kullanımda deneniyor. Denemenin sonucuna göre kayıtlar dükkan sürümüne (`faz3-nextjs`) taşınabilir; aktarım aracı hazır.
- Telefon sürümünde internetsiz kullanım ilk açılışta kendiliğinden hazır olmuyor ve uygulama hazır olup olmadığını göstermiyor. "İnternetsiz kullanıma hazır" göstergesi önerildi, karar bekleniyor.
- KVKK için kod dışında kalanlar: müşteriye aydınlatma metni ve WhatsApp hatırlatması için onay.

## Bilinen, dokunulmayan konular

- Faz 3'te yeni kayıt plakayı birebir eşleştiriyor; eski boşluksuz bir plaka varsa aynı araç ikinci kez açılabilir. Açılış temizliği eski kayıtları tek biçime çevirdiği için nadir.
- Faz 3'te foreign key denetimi açık değil; beklenmedik veritabanı hatası genel bir 500 dönüyor; ekran bileşenlerinin otomatik testi yok.
- Aktarım aracının komut satırı betiğinin otomatik testi yok (`faz3-nextjs/scripts/telefon-yedegi-al.mjs`); yalnızca kütüphane fonksiyonları test ediliyor.
- Aktarım aracı deneme çalışmasında da veritabanını uygulamanın kendi modülüyle açıyor; bu, uygulamanın her açılışta yaptığı eski plaka temizliğini çalıştırabilir.
- `faz3-nextjs/lib/db.ts` içindeki `dbCheckpointEt` engellenen checkpoint'i sessizce geçiyor; bunu kullanan yedek yolları (`lib/yedekle.ts`) uygulama meşgulken eksik kopya alabilir.
- Küsuratlı ücret Faz 3'te INTEGER sütununa ondalıklı girer; telefon ve Faz 3 aynı kuralı kullandığı için yeni bir uyumsuzluk değil.
- `faz4-telefon/scripts/export-duzelt.mjs`: proje bir kısayol klasörü (symlink/junction) üzerinden açılırsa betik hiçbir şey yapmadan çıkar; taşıma ortasında hata olursa yarıda kalır (yeniden çalıştırmak güvenli).
- Çevrimdışıyken Next.js bağlantıları yoklamak için HEAD isteği atar; bunlar konsolda hata olarak görünür, işlevi etkilemez.
