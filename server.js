const express = require('express');
const cors = require('cors');

const app = express();

// Tüm kaynaklara ve protokollere izin ver usta (TV Box ve Tarayıcı için)
app.use(cors({ origin: '*' }));

// Railway projenin ayağa kalktığını anlamak için bu PORT değerini dinamik okumak zorunda
const PORT = process.env.PORT || 8080;

// Ana dizin rotası
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send('<h1>Cehri50 IPTV Proxy Sunucusu Aktif ve Kanallar Hazır!</h1>');
});

// TV Box M3U Rotası
app.get('/api/epg', (req, res) => {
  try {
    const m3uIcerik = `#EXTM3U x-tvg-url="https://www.open-epg.com/files/turkey3.xml" url-tvg="https://streams.uzunmuhalefet.com/epg/tr.xml" | SON GÜNCELLENME 30.06.2026
#EXTINF:3702,TRT1
https://tv-trt1.medya.trt.com.tr/master.m3u8
#EXTINF:-1 tvg-id="STAR TV.tr" tvg-logo="https://raw.githubusercontent.com/tv-logo/tv-logos/refs/heads/main/countries/turkey/star-tv-tr.png" group-title="Ulusal", STAR TV HD
https://dogus.daioncdn.net/startv/startv.m3u8?ce=3&app=1740db13-3ee9-4858-8d2c-b1a9cfaa3718
#EXTINF:-1 tvg-id="SHOW TV.tr" tvg-logo="https://dsmart-static-v2.ercdn.net//resize-width/400/content/E/aM/11889/Thumbnail.png" group-title="Ulusal", SHOW TV HD
https://ciner.daioncdn.net/showtv/showtv.m3u8?ce=3&app=4bc856ef-4c68-4a94-bc87-37dfaaa66558
#EXTINF:-1,KANAL D
https://demiroren.daioncdn.net/kanald/kanald.m3u8?app=kanald_web&ce=3`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(m3uIcerik);
  } catch (error) {
    res.status(500).send("#EXTM3U\n#EXTINF:-1,Sunucu Hatası: " + error.message);
  }
});

// Railway için 0.0.0.0 IP'sinde dinleme yapmak kritik önem taşır usta
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sunucu ${PORT} portunda dinlemede.`);
});
