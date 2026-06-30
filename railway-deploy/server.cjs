const express = require('express');
const path = require('path');

// SSL hatası almamak için gerekli ayar
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
const PORT = process.env.PORT || 3000;

// Basit bir test rotası (sunucu çalışıyor mu diye)
app.get('/', (req, res) => {
  res.send('Proxy Sunucusu Aktif ve Çalışıyor!');
});

// EPG rotası (Uygulamanın aradığı rota)
app.get('/api/epg', (req, res) => {
  // Buraya asıl veri çekme mantığını ekleyeceksin
  res.json({ status: "ok", message: "EPG verisi bekleniyor..." });
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
