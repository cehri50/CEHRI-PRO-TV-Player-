/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Global CORS headers middleware to allow cross-origin requests from web/Capacitor clients
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept, Origin, Cache-Control, Pragma');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Express middleware
  app.use(express.json({ limit: '10mb' }));

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // CORS-Bypass Proxy for M3U URL Downloads
  app.get('/api/m3u/proxy', async (req, res) => {
    const m3uUrl = req.query.url as string;
    if (!m3uUrl) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
      console.log(`[Proxy] Fetching M3U from: ${m3uUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(m3uUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`IPTV provider returned status ${response.status}`);
      }

      const content = await response.text();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(content);
    } catch (err: any) {
      console.error(`[Proxy Error] Failed to fetch M3U: ${err.message}`);
      res.status(502).json({ 
        error: 'M3U playlist could not be retrieved from provider.', 
        details: err.message 
      });
    }
  });

  // CORS-Bypass Proxy for Xtream Codes API Authentication and Channel Retrieval
  app.post('/api/xtream/channels', async (req, res) => {
    const { serverUrl, username, password } = req.body;

    if (!serverUrl || !username || !password) {
      return res.status(400).json({ error: 'serverUrl, username, and password are required' });
    }

    // Normalize serverUrl
    let normalizedUrl = serverUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'http://' + normalizedUrl;
    }
    normalizedUrl = normalizedUrl.replace(/\/+$/, ''); // Remove trailing slash

    try {
      console.log(`[Xtream Proxy] Authenticating with: ${normalizedUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      // Step 1: Call base player_api.php to verify credentials
      const authUrl = `${normalizedUrl}/player_api.php?username=${username}&password=${password}`;
      const authResponse = await fetch(authUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!authResponse.ok) {
        return res.status(authResponse.status).json({ 
          error: `Xtream server returned HTTP ${authResponse.status}` 
        });
      }

      const authData: any = await authResponse.json();
      
      // Check for valid authentication response
      if (!authData || !authData.user_info || authData.user_info.auth === 0) {
        return res.status(401).json({ 
          error: 'Authentication failed. Check your Xtream Codes username, password, and URL.' 
        });
      }

      // Step 2: Fetch streams and categories in parallel
      console.log(`[Xtream Proxy] Fetching channels and categories...`);
      const streamsController = new AbortController();
      const streamsTimeoutId = setTimeout(() => streamsController.abort(), 15000); // 15s timeout

      const categoriesUrl = `${normalizedUrl}/player_api.php?username=${username}&password=${password}&action=get_live_categories`;
      const streamsUrl = `${normalizedUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;

      const [categoriesResponse, streamsResponse] = await Promise.all([
        fetch(categoriesUrl, { signal: streamsController.signal }).catch(() => null),
        fetch(streamsUrl, { signal: streamsController.signal })
      ]);
      clearTimeout(streamsTimeoutId);

      if (!streamsResponse.ok) {
        return res.status(502).json({ error: 'Failed to retrieve streams from Xtream server.' });
      }

      // Read responses
      let categories: any[] = [];
      if (categoriesResponse && categoriesResponse.ok) {
        try {
          categories = await categoriesResponse.json();
        } catch (_) {
          categories = [];
        }
      }

      const streams = await streamsResponse.json();

      if (!Array.isArray(streams)) {
        return res.status(502).json({ error: 'Xtream server returned invalid stream format.' });
      }

      // Create a category map for ultra fast lookup
      const categoryMap = new Map<string, string>();
      if (Array.isArray(categories)) {
        categories.forEach((cat: any) => {
          if (cat && cat.category_id && cat.category_name) {
            categoryMap.set(String(cat.category_id), String(cat.category_name));
          }
        });
      }

      // Step 3: Map streams to client interface
      const xtreamPlaylistId = `xtream-${Date.now()}`;
      const mappedChannels = streams.map((stream: any, index: number) => {
        const streamId = stream.stream_id;
        const categoryId = String(stream.category_id || '');
        const groupName = categoryMap.get(categoryId) || 'Genel (General)';
        const extension = stream.container_extension || 'm3u8';
        
        // Construct standard stream URL
        // Example: http://domain:port/live/user/pass/1234.ts or .m3u8
        const streamUrl = `${normalizedUrl}/live/${username}/${password}/${streamId}.${extension}`;

        return {
          id: `${xtreamPlaylistId}-ch-${streamId}-${index}`,
          name: stream.name || `Channel ${streamId}`,
          logo: stream.stream_icon || '',
          url: streamUrl,
          group: groupName,
          epgId: stream.epg_channel_id || undefined,
          playlistId: xtreamPlaylistId
        };
      });

      console.log(`[Xtream Proxy] Successfully retrieved ${mappedChannels.length} streams.`);

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.json({
        playlistId: xtreamPlaylistId,
        channels: mappedChannels,
        userInfo: {
          status: authData.user_info.status,
          expiry: authData.user_info.exp_date,
          maxConnections: authData.user_info.max_connections
        }
      });

    } catch (err: any) {
      console.error(`[Xtream Proxy Error]: ${err.message}`);
      res.status(502).json({ 
        error: 'Failed to establish connection with Xtream Codes server.', 
        details: err.message 
      });
    }
  });

  // Helper to rewrite relative URLs in M3U8 playlists to absolute proxied URLs
  function rewritePlaylist(content: string, originalUrl: string, proxyBaseUrl: string): string {
    const lines = content.split(/\r?\n/);
    const rewrittenLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Handle tag lines (which might contain URIs inside attributes, e.g. #EXT-X-KEY:METHOD=AES-128,URI="key.key")
      if (trimmed.startsWith('#')) {
        return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
          try {
            // Skip data URIs or already proxied URIs
            if (uri.startsWith('data:') || uri.includes('/api/stream/proxy')) {
              return match;
            }
            const resolvedUri = new URL(uri, originalUrl).href;
            const proxiedUri = `${proxyBaseUrl}?url=${encodeURIComponent(resolvedUri)}`;
            return `URI="${proxiedUri}"`;
          } catch (_) {
            return match;
          }
        });
      }

      // Handle stream/segment URL lines
      try {
        // If it's already a proxied URL, skip it
        if (trimmed.includes('/api/stream/proxy')) {
          return line;
        }
        const resolvedUrl = new URL(trimmed, originalUrl).href;
        return `${proxyBaseUrl}?url=${encodeURIComponent(resolvedUrl)}`;
      } catch (_) {
        return line;
      }
    });

    return rewrittenLines.join('\n');
  }

  // CORS-Bypass Streaming Proxy for live stream channels
  app.get('/api/stream/proxy', async (req, res) => {
    const streamUrl = req.query.url as string;
    if (!streamUrl) {
      return res.status(400).send('URL parameter is required');
    }

    try {
      console.log(`[Stream Proxy] Request starting for: ${streamUrl}`);
      
      const controller = new AbortController();
      req.on('close', () => {
        console.log('[Stream Proxy] Connection closed by client, aborting stream fetch');
        controller.abort();
      });

      const response = await fetch(streamUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      console.log(`[Stream Proxy] Fetch completed. Status: ${response.status} (${response.statusText})`);

      if (!response.ok) {
        console.log(`[Stream Proxy] Error response received from provider. Status: ${response.status}`);
        return res.status(response.status).send(`Provider returned status ${response.status}`);
      }

      // Copy headers from provider
      const contentType = response.headers.get('content-type') || response.headers.get('Content-Type') || '';
      console.log(`[Stream Proxy] Provider Content-Type: "${contentType}"`);

      const isM3U8 = streamUrl.toLowerCase().includes('.m3u8') || 
                     contentType.toLowerCase().includes('mpegurl') || 
                     contentType.toLowerCase().includes('m3u8');

      // Add CORS and stream headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      if (isM3U8) {
        console.log(`[Stream Proxy] Detected playlist file (.m3u8), initiating text parsing...`);
        console.log(`[Stream Proxy] Playlist rewrite başlangıcı for: ${streamUrl}`);
        
        const contentText = await response.text();
        console.log(`[Stream Proxy] Playlist content fetched. Length: ${contentText.length} characters.`);
        
        // Construct the proxy base URL dynamically based on the current request
        const isLocalhost = req.headers.host && (req.headers.host.includes('localhost') || req.headers.host.includes('127.0.0.1') || req.headers.host.includes('192.168.'));
        const protocol = isLocalhost ? 'http' : 'https';
        const host = req.headers.host || 'localhost:3000';
        const proxyBaseUrl = `${protocol}://${host}/api/stream/proxy`;
        
        const rewrittenContent = rewritePlaylist(contentText, streamUrl, proxyBaseUrl);
        console.log(`[Stream Proxy] Playlist rewrite bitişi. Rewritten length: ${rewrittenContent.length} characters.`);
        
        res.setHeader('Content-Type', 'application/x-mpegURL');
        console.log(`[Stream Proxy] Sending rewritten playlist content and ending response...`);
        return res.send(rewrittenContent);
      }

      // For binary files (e.g. video segments .ts), stream them chunk-by-chunk for high performance
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      } else {
        // Fallback content-types based on file extension
        if (streamUrl.includes('.ts')) {
          res.setHeader('Content-Type', 'video/mp2t');
        } else {
          res.setHeader('Content-Type', 'video/mp2t');
        }
      }

      if (response.body) {
        console.log(`[Stream Proxy] Initiating binary chunk streaming. Target: ${streamUrl}`);
        const reader = response.body.getReader();
        let totalBytesStreamed = 0;
        let chunkCount = 0;

        try {
          while (true) {
            console.log(`[Stream Proxy] Calling reader.read() for chunk #${chunkCount + 1}...`);
            const { done, value } = await reader.read();
            if (done) {
              console.log(`[Stream Proxy] Stream reading complete (done: true). Total chunks: ${chunkCount}, Total bytes: ${totalBytesStreamed}`);
              break;
            }
            
            chunkCount++;
            totalBytesStreamed += value.length;
            
            console.log(`[Stream Proxy] res.write() başlangıcı - Chunk #${chunkCount} received. Size: ${value.length} bytes. Total so far: ${totalBytesStreamed} bytes.`);
            
            const writeSuccess = res.write(value);
            if (!writeSuccess) {
              console.log(`[Stream Proxy] res.write() buffer full for chunk #${chunkCount}, waiting for drain...`);
            }
          }
        } catch (readError: any) {
          console.error(`[Stream Proxy] EXCEPTION while reading stream body!`);
          console.error(`[Stream Proxy] Stack trace:\n${readError?.stack || readError}`);
        } finally {
          console.log(`[Stream Proxy] Releasing lock on response body reader.`);
          reader.releaseLock();
        }
        
        console.log(`[Stream Proxy] Calling res.end() to complete response...`);
        res.end();
        console.log(`[Stream Proxy] res.end() called successfully.`);
      } else {
        console.log(`[Stream Proxy] Provider stream body is null!`);
        res.status(502).send('Provider stream body is empty');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[Stream Proxy] Stream fetch aborted gracefully');
      } else {
        console.error(`[Stream Proxy Error]: ${err.message}`);
        if (!res.headersSent) {
          res.status(502).send(`Stream Proxy connection failed: ${err.message}`);
        }
      }
    }
  });

  // ==========================================
  // REAL EPG INGESTION & XMLTV PARSING ENGINE
  // ==========================================

  interface EPGProgram {
    id: string;
    title: string;
    start: string; // HH:mm
    end: string;   // HH:mm
    description?: string;
  }

  interface CachedEPG {
    fetchedAt: number;
    programsByChannel: Map<string, EPGProgram[]>;
  }

  const xmltvCache = new Map<string, CachedEPG>();

  function safeBase64Decode(str: string): string {
    if (!str) return '';
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (base64Regex.test(str) && str.length % 4 === 0) {
      try {
        return Buffer.from(str, 'base64').toString('utf-8');
      } catch (_) {
        return str;
      }
    }
    return str;
  }

  const extractTime = (dateStr: string): string => {
    const match = dateStr.match(/(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : '00:00';
  };

  function decodeXmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  }

  function formatXmltvDate(dateStr: string): string {
    if (dateStr && dateStr.length >= 12) {
      const hh = dateStr.substring(8, 10);
      const mm = dateStr.substring(10, 12);
      return `${hh}:${mm}`;
    }
    return '00:00';
  }

  function parseXMLTV(xmlText: string): Map<string, EPGProgram[]> {
    const programsByChannel = new Map<string, EPGProgram[]>();
    const programmeRegex = /<programme\s+([^>]+)>([\s\S]*?)<\/programme>/g;
    let match;
    let index = 0;
    
    while ((match = programmeRegex.exec(xmlText)) !== null) {
      const attrs = match[1];
      const body = match[2];
      
      const channelMatch = attrs.match(/channel="([^"]+)"/);
      if (!channelMatch) continue;
      const channelId = channelMatch[1];
      
      const startMatch = attrs.match(/start="([^"]+)"/);
      const stopMatch = attrs.match(/stop="([^"]+)"/);
      if (!startMatch || !stopMatch) continue;
      
      const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/);
      const title = titleMatch ? decodeXmlEntities(titleMatch[1].trim()) : 'No Title';
      
      const descMatch = body.match(/<desc[^>]*>([\s\S]*?)<\/desc>/);
      const desc = descMatch ? decodeXmlEntities(descMatch[1].trim()) : '';
      
      const startTime = formatXmltvDate(startMatch[1]);
      const stopTime = formatXmltvDate(stopMatch[1]);
      
      const prog: EPGProgram = {
        id: `xmltv-${channelId}-${index++}`,
        title,
        start: startTime,
        end: stopTime,
        description: desc
      };
      
      if (!programsByChannel.has(channelId)) {
        programsByChannel.set(channelId, []);
      }
      programsByChannel.get(channelId)!.push(prog);
      
      if (index > 80000) break; // Scalability guard to prevent buffer overflows
    }
    
    return programsByChannel;
  }

  function generateFallbackEPG(channelId: string): EPGProgram[] {
    const currentHour = new Date().getHours();
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

    const cleanId = channelId.toLowerCase().replace(/^(local-|xtream-|m3u-|demo-)/, '').replace(/-\d+.*$/, '');
    const config = showConfigs[cleanId] || showConfigs['default'];
    const programs: EPGProgram[] = [];
    const baseTime = new Date();
    baseTime.setMinutes(0);
    baseTime.setSeconds(0);
    baseTime.setHours(currentHour - 2);

    for (let i = 0; i < 6; i++) {
      const progStart = new Date(baseTime.getTime() + i * 1.5 * 60 * 60 * 1000);
      const progEnd = new Date(progStart.getTime() + 1.5 * 60 * 60 * 1000);

      const pad = (num: number) => String(num).padStart(2, '0');
      const startStr = `${pad(progStart.getHours())}:${pad(progStart.getMinutes())}`;
      const endStr = `${pad(progEnd.getHours())}:${pad(progEnd.getMinutes())}`;

      const trTitle = config.tr[i % config.tr.length];
      const enTitle = config.en[i % config.en.length];

      programs.push({
        id: `${channelId}-fallback-prog-${i}`,
        title: trTitle,
        start: startStr,
        end: endStr,
        description: `Bu program, ${trTitle} / ${enTitle} yayınıdır. Android TV Box deneyiminiz için optimize edilmiş yüksek çözünürlüklü yayındır.`
      });
    }
    return programs;
  }

  // Real EPG Retrieval Endpoint (Supports Xtream short EPG query & M3U XMLTV ingestion)
  app.post('/api/epg', async (req, res) => {
    const { playlistType, serverUrl, username, password, streamId, epgId, urlTvg, channelId } = req.body;
    
    // Set headers
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 1. If Xtream Code playlist type: Query short EPG
    if (playlistType === 'xtream' && serverUrl && username && password && streamId) {
      try {
        let normalizedUrl = serverUrl.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
          normalizedUrl = 'http://' + normalizedUrl;
        }
        normalizedUrl = normalizedUrl.replace(/\/+$/, '');
        
        const epgUrl = `${normalizedUrl}/player_api.php?username=${username}&password=${password}&action=get_short_epg&stream_id=${streamId}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout
        
        const response = await fetch(epgUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data: any = await response.json();
          if (data && Array.isArray(data.epg_listings)) {
            const programs: EPGProgram[] = data.epg_listings.map((item: any, idx: number) => {
              const title = safeBase64Decode(item.title || 'Live Stream');
              const desc = safeBase64Decode(item.description || '');
              const start = item.start ? extractTime(item.start) : '00:00';
              const end = item.end ? extractTime(item.end) : '00:00';
              
              return {
                id: `xtream-epg-${streamId}-${idx}`,
                title,
                start,
                end,
                description: desc || `Canlı Yayın. Başlangıç saati: ${start}`
              };
            });
            
            if (programs.length > 0) {
              return res.json({ source: 'xtream', programs });
            }
          }
        }
      } catch (err: any) {
        console.warn(`[EPG Service] Xtream short EPG retrieval failed: ${err.message}`);
      }
    }
    
    // 2. If XMLTV url-tvg is specified (for M3U list): Download & Ingest
    if (urlTvg && epgId) {
      try {
        let cached = xmltvCache.get(urlTvg);
        
        // Cache is valid for 1 hour to stay highly updated
        if (!cached || Date.now() - cached.fetchedAt > 60 * 60 * 1000) {
          console.log(`[EPG Service] Ingesting XMLTV feed from: ${urlTvg}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout
          const response = await fetch(urlTvg, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const text = await response.text();
            const parsed = parseXMLTV(text);
            
            cached = {
              fetchedAt: Date.now(),
              programsByChannel: parsed
            };
            xmltvCache.set(urlTvg, cached);
          }
        }
        
        if (cached) {
          const programs = cached.programsByChannel.get(epgId);
          if (programs && programs.length > 0) {
            return res.json({ source: 'xmltv', programs });
          }
        }
      } catch (err: any) {
        console.warn(`[EPG Service] XMLTV ingestion failed: ${err.message}`);
      }
    }
    
    // 3. Fallback to server-consistent realistic EPG
    const fallbackPrograms = generateFallbackEPG(channelId || 'default');
    return res.json({ source: 'fallback', programs: fallbackPrograms });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Dev Server] Mounting Vite dev middleware.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Prod Server] Serving built client files from dist.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[IPTV Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
