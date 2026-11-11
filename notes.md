# Notlar

## Proje hedefi
Oto elektrikçi ustası için yerel bakım takip uygulaması. Araç/işlem kaydı, bakım hatırlatma (geçen kırmızı, yaklaşan sarı), WhatsApp'tan tek tuşla müşteriye haber, sanayi stili arayüz (büyük yazı/buton, yüksek kontrast).

## Dağıtım ve veri kaybı riski
- Tek cihaz, ağ paylaşımı veya bulut sunucu yok (maliyetsiz kalsın).
- Risk: tek cihaz + sadece orada duran SQLite dosyası veri kaybına açık (cihaz bozulur/çalınırsa).
- Çözüm: her kayıt değişikliğinde `servis.db` dosyası otomatik olarak ücretsiz Google Drive/OneDrive senkron klasörüne kopyalanır (ek maliyet yok, zaten arka planda buluta yüklenir). Ek olarak elle "Yedek Al" butonu da olacak.

## Geliştirme sırası
Aşamalı ilerleniyor: Faz 1 statik HTML/CSS → Faz 2 TypeScript mantık (tipler, bakım durumu, format, arama) → Faz 3 React/Next.js canlı arayüz → Faz 4 SQLite + yedekleme entegrasyonu. Her faz bitince durulup kullanıcıdan onay bekleniyor, onaysız sonraki faza geçilmiyor.

## Proje yönetim dosyaları
`backlog.md` (yarım kalan işler) ve `backlog-log.md` (anlık ilerleme günlüğü) her projede varsayılan olarak tutulacak kural olarak `CLAUDE.md`/`AGENT.md`'ye eklendi.

## Güvenlik/API izolasyonu
Şu an projede dış API yok. İleride eklenirse hazır olacak genel bir iskelet kuruldu: `.gitignore`, `.claude/settings.json` deny listesi, `.env.example` şablonu, `.devcontainer/devcontainer.json`, `SECURITY.md`. Kural: gerçek anahtar asla istenmez/okunmaz/yazılmaz/gösterilmez; sadece `.env.example`; backend her zaman proxy üzerinden anahtarı okur, anahtar yoksa mock yanıt döner; silme/push/paket kurma öncesi kullanıcıya sorulur.
