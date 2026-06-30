const express = require('express');
const cors = require('cors');

// IPTV panellerindeki SSL hatalarını bypass etmek için kritik ayar
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
app.use(cors()); // APK bağlantılarında CORS engeline takılmamak için

const PORT = process.env.PORT || 3000;

// Railway kök dizin sapmalarını önlemek için çift rotalı ana sayfa testi
app.get(['/', '/railway-deploy'], (req, res) => {
  res.send('Cehri50 IPTV Proxy Sunucusu Aktif ve Kanallar Hazır!');
});

// TV Box'ın bağlandığı M3U / EPG Proxy Rotası (İki ihtimali de dinliyoruz usta)
app.get(['/api/epg', '/railway-deploy/api/epg'], async (req, res) => {
  try {
    // BURAYA: Paylaştığın güncel M3U listesini doğrudan proxy çıktısı olarak basıyoruz.
    // Tinyurl bağlantısındaki kopmalardan etkilenmemek için en garanti yöntem budur.
    const m3uIcerik = `#EXTM3U x-tvg-url="https://www.open-epg.com/files/turkey3.xml" url-tvg="https://streams.uzunmuhalefet.com/epg/tr.xml" | SON GÜNCELLENME 25.06.2026 | Donate A Cup Cafee Please: https://ko-fi.com/digiseytan
    #EXTINF:3702,TRT1
    https://tv-trt1.medya.trt.com.tr/master.m3u8
    #EXTINF:-1 tvg-id="STAR TV.tr" tvg-logo="https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/turkey/star-tv-tr.png" group-title="Ulusal", STAR TV HD
    https://dogus.daioncdn.net/startv/startv.m3u8?ce=3&app=1740db13-3ee9-4858-8d2c-b1a9cfaa3718
    #EXTINF:-1 tvg-id="SHOW TV.tr" tvg-logo="https://dsmart-static-v2.ercdn.net//resize-width/400/content/E/aM/11889/Thumbnail.png" group-title="Ulusal", SHOW TV HD
    https://ciner.daioncdn.net/showtv/showtv.m3u8?ce=3&app=4bc856ef-4c68-4a94-bc87-37dfaaa66558
    #EXTINF:-1,KANAL D
    https://demiroren.daioncdn.net/kanald/kanald.m3u8?app=kanald_web&ce=3`;

    // Uygulamaya veriyi saf M3U formatında gönderiyoruz
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(m3uIcerik);

  } catch (error) {
    console.error("Proxy Hatası:", error.message);
    res.status(500).send("#EXTM3U\n#EXTINF:-1,Sunucu Hatası: " + error.message);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sunucu ${PORT} portunda başarıyla başlatıldı.`);
});
