const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Tüm kaynaklara ve protokollere izin ver usta (TV Box ve Tarayıcı hata vermesin)
app.use(cors({ origin: '*' }));

// Railway veya yerel sistem için port dinamik olarak ayarlanıyor
const PORT = process.env.PORT || 8081;

// 🟢 USTA: Google Drive'a yüklediğin M3U dosyasının ID'sini buraya yapıştır!
// Örnek: Linkin buysa -> https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view
// Çift tırnağın içine sadece o ortadaki harf ve rakam yığınını (ID'yi) yazacaksın.
const GOOGLE_DRIVE_FILE_ID = '1wLUYl1JA4noxUG4pIGY1zOUu1kGVtqAc';

/**
 * Google Drive'ın büyük dosyalar için çıkardığı onay kodunu
 * arka planda otomatik olarak yakalayıp aşan akıllı fonksiyon usta.
 */
async function downloadFromDrive(fileId) {
  try {
    const url = `https://docs.google.com/uc?export=download&id=${fileId}`;

    // İlk isteği atıp Google'ın virüs/onay sayfası üretip üretmediğine bakıyoruz
    const response = await axios.get(url, { responseType: 'text' });

    // Büyük dosyalarda gelen "confirm=XXXX" token'ını regex ile avlıyoruz usta
    const match = response.data.match(/confirm=([a-zA-Z0-9_]+)/);

    if (match && match[1]) {
      const confirmToken = match[1];
      // Onay token'ını bulduk! Şimdi o token ile asıl indirme adresine gidiyoruz
      const downloadUrl = `https://docs.google.com/uc?export=download&confirm=${confirmToken}&id=${fileId}`;
      const finalResponse = await axios.get(downloadUrl, { responseType: 'text' });
      return finalResponse.data;
    }

    // Eğer dosya küçükse onay kodu çıkmaz, doğrudan ham veriyi döneriz
    return response.data;
  } catch (error) {
    throw new Error('Google Drive bağlantı hatası: ' + error.message);
  }
}

// Ana dizin rotası
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send('<h1>Cehri50 IPTV Proxy Sunucusu Aktif ve Google Drive Dinamik Bağlantısı Hazır!</h1>');
});

// TV Box ve AI Studio M3U Çekme Rotası (Tamamen Dinamik!)
app.get('/api/epg', async (req, res) => {
  try {
    // Her istek geldiğinde gidip Google Drive'dan en güncel listeyi şak diye çekiyor usta
    const m3uIcerik = await downloadFromDrive(GOOGLE_DRIVE_FILE_ID);

    // CRITICAL: Tarayıcı indirmesin, oynatma listesi olarak doğrudan okusun usta
    res.setHeader('Content-Type', 'application/x-mpegURL');
    res.send(m3uIcerik);
  } catch (error) {
    // Drive tarafında veya ID'de bir hata olursa uygulama çökmesin diye hata mesajını M3U içinde dönüyoruz
    res.status(500).send("#EXTM3U\n#EXTINF:-1,Sunucu Hatası: " + error.message);
  }
});

// Sunucuyu 0.0.0.0 IP'sinde dinlemeye alıyoruz ki yerel ağdaki (TV Box) herkes erişebilsin
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sunucu ${PORT} portunda Google Drive entegrasyonu ile aslanlar gibi dinlemede.`);
});
