/**
 * Cehri50 IPTV Player - Dedicated CORS & Mixed Content Proxy Gateway
 * Built for 7/24 standalone deployment on Railway
 * Supported Node version: >= 18.0.0 (uses native global fetch)
 */

const express = require('express');
const path = require('path');

// Disable strict SSL verification for all outbound backend fetch requests.
// This is critical for IPTV because many M3U and Xtream Codes panels use self-signed or expired SSL certificates on custom ports.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
// Dynamic PORT binding for Railway cloud environments (Railway automatically assigns process.env.PORT)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Global CORS headers middleware to allow cross-origin requests from any client
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
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    message: 'Cehri50 IPTV Proxy is running 7/24 on Railway!'
  });
});

// API Versioning and Force-Update Config
app.get('/api/version', (req, res) => {
  res.json({ 
    currentVersion: '1.0.5', 
    minRequiredVersion: '1.0.5',
    updateUrl: 'https://cehri50-iptv-proxy-production.up.railway.app', // Can be set to APK download link or forum post
    messageTr: 'Cehri50 IPTV Player için yeni bir güncelleme mevcut! Lütfen en iyi performans, yeni özellikler ve kanal yükleme düzeltmeleri için uygulamayı güncelleyin.',
    messageEn: 'A new update is available for Cehri50 IPTV Player! Please update for optimal performance, new features, and channel loading fixes.',
    forceUpdate: true // If set to true, it blocks access on older versions
  });
});

// Helper to convert sharing links (Google Drive, Dropbox, GitHub) to direct raw URLs
function convertSharingUrl(urlStr) {
  if (!urlStr) return '';
  let normalized = urlStr.trim();

  // 1. Google Drive Sharing/View Links
  const fileDMatch = normalized.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://docs.google.com/uc?export=download&id=${fileDMatch[1]}`;
  }
  
  const idMatch = normalized.match(/drive\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return `https://docs.google.com/uc?export=download&id=${idMatch[1]}`;
  }

  const docsDMatch = normalized.match(/docs\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (docsDMatch && docsDMatch[1]) {
    return `https://docs.google.com/uc?export=download&id=${docsDMatch[1]}`;
  }

  // 2. Dropbox Sharing Links
  if (normalized.includes('dropbox.com')) {
    normalized = normalized.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
                           .replace('?dl=0', '?dl=1');
  }

  // 3. GitHub Blob Links
  if (normalized.includes('github.com/') && normalized.includes('/blob/')) {
    normalized = normalized.replace('github.com', 'raw.githubusercontent.com')
                           .replace('/blob/', '/');
  }

  return normalized;
}

// CORS-Bypass Proxy for M3U URL Downloads
app.get('/api/m3u/proxy', async (req, res) => {
  let m3uUrl = req.query.url;
  if (!m3uUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  // Convert common sharing URLs (Dropbox, Github, Google Drive) before first fetch
  m3uUrl = convertSharingUrl(m3uUrl);

  try {
    console.log(`[Proxy] Fetching M3U from: ${m3uUrl}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    let response = await fetch(m3uUrl, {
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

    // If the final redirected URL is a Google Drive/Dropbox/GitHub sharing link (e.g. from TinyURL redirect), convert and fetch again!
    const finalUrl = response.url || m3uUrl;
    const convertedUrl = convertSharingUrl(finalUrl);
    
    if (convertedUrl !== finalUrl) {
      console.log(`[Proxy] Redirect resolved to a sharing URL: ${finalUrl}. Re-fetching raw content from: ${convertedUrl}`);
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 30000);
      
      response = await fetch(convertedUrl, {
        signal: controller2.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      clearTimeout(timeoutId2);
    }

    if (!response.ok) {
      throw new Error(`IPTV provider returned status ${response.status}`);
    }

    let content = await response.text();

    // Check if this is a Google Drive confirmation warning page (HTML with confirm=...)
    const isHtml = content.trim().startsWith('<') || content.includes('<html') || (response.headers.get('content-type') || '').includes('text/html');
    const isGoogleDrive = m3uUrl.includes('google.com') || (response.url && response.url.includes('google.com'));

    if (isHtml && isGoogleDrive) {
      // Check if redirected to login page due to file being restricted (private)
      if (content.includes('accounts.google.com') || content.includes('signin') || content.includes('ServiceLogin')) {
        throw new Error('Google Drive dosyanız "Kısıtlı" (Özel) durumdadır. Lütfen Google Drive üzerinden paylaşım ayarını "Bağlantıya sahip olan herkes görüntüleyebilir" olarak değiştirin.');
      }

      const confirmMatch = content.match(/confirm=([^&"'\s<>]+)/i);
      const idMatch = m3uUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || m3uUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || (response.url && (response.url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || response.url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)));
      const fileId = idMatch ? idMatch[1] : null;

      if (confirmMatch && fileId) {
        const confirmToken = confirmMatch[1];
        const downloadUrl = `https://docs.google.com/uc?export=download&id=${fileId}&confirm=${confirmToken}`;
        console.log(`[Proxy] Google Drive safety warning detected. Token: ${confirmToken}. Re-fetching directly from: ${downloadUrl}`);

        const controllerGD = new AbortController();
        const timeoutIdGD = setTimeout(() => controllerGD.abort(), 30000);

        const gdResponse = await fetch(downloadUrl, {
          signal: controllerGD.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8',
          }
        });
        clearTimeout(timeoutIdGD);

        if (gdResponse.ok) {
          content = await gdResponse.text();
          console.log(`[Proxy] Google Drive file content successfully fetched after passing warning page.`);
        } else {
          console.warn(`[Proxy] Failed to fetch Google Drive file content after passing warning. Status: ${gdResponse.status}`);
        }
      }
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(content);
  } catch (err) {
    console.error(`[Proxy Error] Failed to fetch M3U: ${err.message}`);
    res.status(502).json({ 
      error: 'M3U playlist could not be retrieved from provider.', 
      details: err.message 
    });
  }
});

// CORS-Bypass Proxy for any arbitrary Xtream Codes player_api.php call (Tünelleme)
const handleXtreamProxy = async (req, res) => {
  // Collect parameters from either query string (GET) or body (POST)
  const params = Object.assign({}, req.query, req.body);
  const { serverUrl } = params;
  const otherParams = Object.assign({}, params);
  delete otherParams.serverUrl;

  if (!serverUrl) {
    return res.status(400).json({ error: 'serverUrl parameter is required' });
  }

  // Normalize serverUrl
  let normalizedUrl = serverUrl.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'http://' + normalizedUrl;
  }
  normalizedUrl = normalizedUrl.replace(/\/+$/, '');

  // Re-construct query params for target
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(otherParams)) {
    if (value !== undefined && value !== null) {
      queryParams.set(key, String(value));
    }
  }

  const targetUrl = `${normalizedUrl}/player_api.php?${queryParams.toString()}`;

  try {
    console.log(`[Xtream Proxy Tunneled] Forwarding request to: ${targetUrl}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Xtream target server returned HTTP ${response.status}` 
      });
    }

    // Check content-type to see if it is JSON
    const contentType = response.headers.get('content-type') || '';
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (contentType.includes('application/json') || contentType.includes('text/plain') || contentType.includes('text/javascript')) {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return res.json(json);
      } catch (_) {
        res.setHeader('Content-Type', contentType || 'text/plain');
        return res.send(text);
      }
    } else {
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      return res.send(Buffer.from(buffer));
    }
  } catch (err) {
    console.error(`[Xtream Proxy Tunneled Error]: ${err.message}`);
    return res.status(502).json({ 
      error: 'Failed to tunnel request to target Xtream server', 
      details: err.message 
    });
  }
};

app.get('/api/xtream/proxy', handleXtreamProxy);
app.post('/api/xtream/proxy', handleXtreamProxy);

// CORS-Bypass and SSL-Bypass Proxy for TV Channel Logos & Images
app.get('/api/image/proxy', async (req, res) => {
  let imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  // Convert sharing URLs if needed
  imageUrl = convertSharingUrl(imageUrl);

  try {
    console.log(`[Image Proxy] Fetching logo from: ${imageUrl}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for images

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*',
      }
    });
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    } else {
      res.setHeader('Content-Type', 'image/png'); // Fallback
    }

    // Add long caching for images to speed up TV Box performance!
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours caching

    const arrayBuffer = await response.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error(`[Image Proxy Error] Failed to load image: ${imageUrl}. Error: ${err.message}`);
    // Send a high-quality fallback image or redirect to prevent UI breakdown
    return res.redirect('https://images.unsplash.com/photo-1542204172-e7052809a8a7?w=128&auto=format&fit=crop&q=60');
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

    const authData = await authResponse.json();
    
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
    let categories = [];
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
    const categoryMap = new Map();
    if (Array.isArray(categories)) {
      categories.forEach((cat) => {
        if (cat && cat.category_id && cat.category_name) {
          categoryMap.set(String(cat.category_id), String(cat.category_name));
        }
      });
    }

    // Step 3: Map streams to client interface
    const xtreamPlaylistId = `xtream-${Date.now()}`;
    const mappedChannels = streams.map((stream, index) => {
      const streamId = stream.stream_id;
      const categoryId = String(stream.category_id || '');
      const groupName = categoryMap.get(categoryId) || 'Genel (General)';
      const extension = stream.container_extension || 'm3u8';
      
      // Construct standard stream URL
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

  } catch (err) {
    console.error(`[Xtream Proxy Error]: ${err.message}`);
    res.status(502).json({ 
      error: 'Failed to establish connection with Xtream Codes server.', 
      details: err.message 
    });
  }
});

// Helper to rewrite relative URLs in M3U8 playlists to absolute proxied URLs
function rewritePlaylist(content, originalUrl, proxyBaseUrl) {
  const lines = content.split(/\r?\n/);
  const rewrittenLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Handle tag lines containing URI attributes
    if (trimmed.startsWith('#')) {
      return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
        try {
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
  const streamUrl = req.query.url;
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

    console.log(`[Stream Proxy] Fetch completed. Status: ${response.status}`);

    if (!response.ok) {
      return res.status(response.status).send(`Provider returned status ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || response.headers.get('Content-Type') || '';
    const isM3U8 = streamUrl.toLowerCase().includes('.m3u8') || 
                   contentType.toLowerCase().includes('mpegurl') || 
                   contentType.toLowerCase().includes('m3u8');

    // Add stream headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (isM3U8) {
      console.log(`[Stream Proxy] Detected playlist file (.m3u8), initiating text parsing...`);
      const contentText = await response.text();
      
      // Construct proxy base URL dynamically based on current incoming host (e.g. cehri50-iptv.up.railway.app)
      const isLocalhost = req.headers.host && (req.headers.host.includes('localhost') || req.headers.host.includes('127.0.0.1'));
      const protocol = isLocalhost ? 'http' : 'https';
      const host = req.headers.host || 'localhost:3000';
      const proxyBaseUrl = `${protocol}://${host}/api/stream/proxy`;
      
      const rewrittenContent = rewritePlaylist(contentText, streamUrl, proxyBaseUrl);
      res.setHeader('Content-Type', 'application/x-mpegURL');
      return res.send(rewrittenContent);
    }

    // Binary content chunk-by-chunk streaming
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    } else {
      res.setHeader('Content-Type', streamUrl.includes('.ts') ? 'video/mp2t' : 'video/mp2t');
    }

    if (response.body) {
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } catch (readError) {
        console.error(`[Stream Proxy] Exception while streaming segments: ${readError.message}`);
      } finally {
        reader.releaseLock();
      }
      res.end();
    } else {
      res.status(502).send('Provider stream body is empty');
    }
  } catch (err) {
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

const xmltvCache = new Map();

function safeBase64Decode(str) {
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

const extractTime = (dateStr) => {
  const match = dateStr.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '00:00';
};

function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function formatXmltvDate(dateStr) {
  if (dateStr && dateStr.length >= 12) {
    const hh = dateStr.substring(8, 10);
    const mm = dateStr.substring(10, 12);
    return `${hh}:${mm}`;
  }
  return '00:00';
}

function parseXMLTV(xmlText) {
  const programsByChannel = new Map();
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
    
    const prog = {
      id: `xmltv-${channelId}-${index++}`,
      title,
      start: startTime,
      end: stopTime,
      description: desc
    };
    
    if (!programsByChannel.has(channelId)) {
      programsByChannel.set(channelId, []);
    }
    programsByChannel.get(channelId).push(prog);
    
    if (index > 80000) break; // guard limit
  }
  
  return programsByChannel;
}

function generateFallbackEPG(channelId) {
  const currentHour = new Date().getHours();
  const showConfigs = {
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
  const programs = [];
  const baseTime = new Date();
  baseTime.setMinutes(0);
  baseTime.setSeconds(0);
  baseTime.setHours(currentHour - 2);

  for (let i = 0; i < 6; i++) {
    const progStart = new Date(baseTime.getTime() + i * 1.5 * 60 * 60 * 1000);
    const progEnd = new Date(progStart.getTime() + 1.5 * 60 * 60 * 1000);

    const pad = (num) => String(num).padStart(2, '0');
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
        const data = await response.json();
        if (data && Array.isArray(data.epg_listings)) {
          const programs = data.epg_listings.map((item, idx) => {
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
    } catch (err) {
      console.warn(`[EPG Service] Xtream short EPG retrieval failed: ${err.message}`);
    }
  }
  
  // 2. If XMLTV url-tvg is specified (for M3U list): Download & Ingest
  if (urlTvg && epgId) {
    try {
      let cached = xmltvCache.get(urlTvg);
      
      // Cache valid for 1 hour
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
    } catch (err) {
      console.warn(`[EPG Service] XMLTV ingestion failed: ${err.message}`);
    }
  }
  
  // 3. Fallback to server-consistent realistic EPG
  const fallbackPrograms = generateFallbackEPG(channelId || 'default');
  return res.json({ source: 'fallback', programs: fallbackPrograms });
});

// Start listening
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Cehri50 IPTV Proxy] Server is live on port ${PORT}`);
  console.log(`[Cehri50 IPTV Proxy] Accessible 7/24 at: http://0.0.0.0:${PORT}`);
});
