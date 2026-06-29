/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IPTVPlaylistItem, IPTVPlaylist, EPGProgram } from './types';

export const DEMO_PLAYLIST_ID = 'demo-playlist';

export const DEMO_PLAYLIST: IPTVPlaylist = {
  id: DEMO_PLAYLIST_ID,
  name: 'TR & Global Demo TV',
  type: 'm3u',
  itemsCount: 10,
  addedAt: Date.now()
};

export const DEMO_CHANNELS: IPTVPlaylistItem[] = [
  {
    id: 'trt-haber',
    name: 'TRT Haber',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/TRT_Haber_logo.svg/512px-TRT_Haber_logo.svg.png',
    url: 'https://tv-trt.medya.trt.com.tr/trt/trthaber/index.m3u8',
    group: 'Haber (News)',
    epgId: 'trt.haber',
    playlistId: DEMO_PLAYLIST_ID
  },
  {
    id: 'trt-belgesel',
    name: 'TRT Belgesel',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/TRT_Belgesel_logo.svg/512px-TRT_Belgesel_logo.svg.png',
    url: 'https://tv-trt.medya.trt.com.tr/trt/trtbelgesel/index.m3u8',
    group: 'Belgesel (Documentary)',
    epgId: 'trt.belgesel',
    playlistId: DEMO_PLAYLIST_ID
  },
  {
    id: 'trt-spor',
    name: 'TRT Spor',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/TRT_Spor_logo_2021.svg/512px-TRT_Spor_logo_2021.svg.png',
    url: 'https://tv-trt.medya.trt.com.tr/trt/trtspor/index.m3u8',
    group: 'Spor (Sports)',
    epgId: 'trt.spor',
    playlistId: DEMO_PLAYLIST_ID
  },
  {
    id: 'trt-cocuk',
    name: 'TRT Çocuk',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/TRT_%C3%87ocuk_logo.svg/512px-TRT_%C3%87ocuk_logo.svg.png',
    url: 'https://tv-trt.medya.trt.com.tr/trt/trtcocuk/index.m3u8',
    group: 'Çocuk (Kids)',
    epgId: 'trt.cocuk',
    playlistId: DEMO_PLAYLIST_ID
  },
  {
    id: 'nasa-tv',
    name: 'NASA TV Live',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/512px-NASA_logo.svg.png',
    url: 'https://nasa-otg.akamaized.net/hls/live/2022714/NASA-OTG-1/master.m3u8',
    group: 'Bilim & Uzay (Science)',
    epgId: 'nasa.tv',
    playlistId: DEMO_PLAYLIST_ID
  },
  {
    id: 'redbull-tv',
    name: 'Red Bull TV',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Red_Bull_logo.svg/512px-Red_Bull_logo.svg.png',
    url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    group: 'Spor (Sports)',
    epgId: 'redbull.tv',
    playlistId: DEMO_PLAYLIST_ID
  },
  {
    id: 'euronews-tr',
    name: 'Euronews Türkçe',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Euronews_logo_2016.svg/512px-Euronews_logo_2016.svg.png',
    url: 'https://euronews-turkey-uz-ateme.hexaglobe.net/da67e657c9a622a557b447881c19b6a0/62bc2d5c/euronews/euronews_turkey/tur/index.m3u8',
    group: 'Haber (News)',
    epgId: 'euronews.tr',
    playlistId: DEMO_PLAYLIST_ID
  },
  {
    id: 'euronews-en',
    name: 'Euronews English',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Euronews_logo_2016.svg/512px-Euronews_logo_2016.svg.png',
    url: 'https://euronews-eng-uz-ateme.hexaglobe.net/c990b7e28b86e8cbfe9a3a992cb91185/62bc2b95/euronews/euronews_eng/eng/index.m3u8',
    group: 'Haber (News)',
    epgId: 'euronews.en',
    playlistId: DEMO_PLAYLIST_ID
  },
  {
    id: 'france-24',
    name: 'France 24 English',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/France24_logo.svg/512px-France24_logo.svg.png',
    url: 'https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8',
    group: 'Haber (News)',
    epgId: 'france24.en',
    playlistId: DEMO_PLAYLIST_ID
  },
  {
    id: 'dw-news',
    name: 'Deutsche Welle (DW) English',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Deutsche_Welle_logo_2012.svg/512px-Deutsche_Welle_logo_2012.svg.png',
    url: 'https://dwstream72-lh.akamaihd.net/i/dwstream72_1@119305/master.m3u8',
    group: 'Haber (News)',
    epgId: 'dw.en',
    playlistId: DEMO_PLAYLIST_ID
  }
];

// Helper to generate current and upcoming programs dynamically
const epgCache = new Map<string, { hour: number; programs: EPGProgram[] }>();

export function getDynamicEPG(channelId: string): EPGProgram[] {
  const currentHour = new Date().getHours();
  
  const cached = epgCache.get(channelId);
  if (cached && cached.hour === currentHour) {
    return cached.programs;
  }

  const currentMinute = new Date().getMinutes();

  // Create blocks of 1 hour / 2 hour programs
  const showConfigs: { [key: string]: { tr: string[]; en: string[] } } = {
    'trt-haber': {
      tr: ['Günün Gelişmeleri', 'Haber Bülteni', 'Satır Başı', 'Ekonomi Raporu', 'Dünya Gündemi', 'Spor Penceresi'],
      en: ['Daily News', 'Global Headlines', 'Economic Report', 'Sports Tonight', 'Documentary Hour', 'Debate']
    },
    'trt-belgesel': {
      tr: ['Doğanın Mucizeleri', 'Vahşi Yaşam', 'Anadolu Coğrafyası', 'Mavi Dünya', 'Tarihin İzinde', 'Gezginin Günlüğü'],
      en: ['Wonders of Nature', 'Wilderness Diaries', 'Hidden Geography', 'Secrets of the Deep', 'Footsteps of History', 'Traveler Journal']
    },
    'trt-spor': {
      tr: ['Spor Stüdyosu', 'Transfer Günlüğü', 'Aktüel Futbol', 'Avrupa Kupaları Özet', 'Klasik Maçlar', 'Amatör Branşlar'],
      en: ['Sports Studio', 'Transfer Central', 'Football Analysis', 'Euro Cup Highlights', 'Classic Reels', 'Olympic Sports']
    },
    'trt-cocuk': {
      tr: ['Rafadan Tayfa', 'Köstebekgiller', 'Maysa ve Bulut', 'Ege ile Gaga', 'İstanbul Muhafızları', 'Keloğlan'],
      en: ['Cartoon Club', 'Puppet Land', 'Tales of Magic', 'Curious Detective', 'City Protectors', 'Heroic Kids']
    },
    'nasa-tv': {
      tr: ['ISS Canlı Yayın', 'Mars Araştırmaları', 'Apollo Misyonları', 'Derin Uzay Teleskopları', 'Hubble Günlükleri', 'Astronot Eğitimi'],
      en: ['ISS Live Feed', 'Mars Exploration Rover', 'Apollo Missions Archive', 'Deep Space Telescopes', 'Hubble Chronicles', 'Astronaut Training']
    },
    'redbull-tv': {
      tr: ['X-Fighters Arşiv', 'Uçurum Atlayışı', 'Formula 1 Analiz', 'Dağ Bisikleti Dünya Kupası', 'Sörf Maceraları', 'Sınırları Zorlayanlar'],
      en: ['X-Fighters Classic', 'Cliff Diving World Series', 'Formula 1 Masterclass', 'MTB World Cup Highlights', 'Surf Adventures', 'Pushing Boundaries']
    },
    'default': {
      tr: ['Gündem Özel', 'Haber Kuşağı', 'Canlı Yayın', 'Dünya Turu', 'Akşam Raporu', 'Günün Özeti'],
      en: ['Global Perspective', 'Live Broadcast', 'World Tour', 'Evening Report', 'Day in Review', 'Current Affairs']
    }
  };

  const currentConfig = showConfigs[channelId] || showConfigs['default'];

  // Generate 6 programs starting from 3 hours ago to 6 hours ahead
  const programs: EPGProgram[] = [];
  const baseTime = new Date();
  baseTime.setMinutes(0);
  baseTime.setSeconds(0);
  baseTime.setHours(currentHour - 2); // Start 2 hours ago

  for (let i = 0; i < 6; i++) {
    const progStart = new Date(baseTime.getTime() + i * 1.5 * 60 * 60 * 1000); // 1.5 hour increments
    const progEnd = new Date(progStart.getTime() + 1.5 * 60 * 60 * 1000);

    const pad = (num: number) => String(num).padStart(2, '0');
    const startStr = `${pad(progStart.getHours())}:${pad(progStart.getMinutes())}`;
    const endStr = `${pad(progEnd.getHours())}:${pad(progEnd.getMinutes())}`;

    const trTitle = currentConfig.tr[i % currentConfig.tr.length];
    const enTitle = currentConfig.en[i % currentConfig.en.length];

    programs.push({
      id: `${channelId}-prog-${i}`,
      title: trTitle, // tr first
      start: startStr,
      end: endStr,
      description: `Bu program, ${trTitle} / ${enTitle} yayınıdır. Android TV Box deneyiminiz için optimize edilmiş yüksek çözünürlüklü yayındır.`
    });
  }

  epgCache.set(channelId, { hour: currentHour, programs });
  return programs;
}
