import { IPTVPlaylistItem, IPTVPlaylist, EPGProgram } from './types';
import { getDynamicEPG } from './demoData';
import { getApiUrl } from './utils';

// Cache to prevent duplicate calls for the same channel in the same hour
const clientEpgCache = new Map<string, { fetchedAt: number; programs: EPGProgram[] }>();
const parsedXmltvCache = new Map<string, Map<string, EPGProgram[]>>();

function decodeXmlEntities(str: string): string {
  if (!str) return '';
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

function parseXMLTVOnClient(xmlText: string): Map<string, EPGProgram[]> {
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
      id: `xmltv-client-${channelId}-${index++}`,
      title,
      start: startTime,
      end: stopTime,
      description: desc
    };
    
    if (!programsByChannel.has(channelId)) {
      programsByChannel.set(channelId, []);
    }
    programsByChannel.get(channelId)!.push(prog);
    
    if (index > 25000) break; // Scalability guard to prevent memory issues in WebView
  }
  
  return programsByChannel;
}

export async function fetchRealEPG(
  channel: IPTVPlaylistItem,
  playlist?: IPTVPlaylist
): Promise<EPGProgram[]> {
  const cacheKey = `${channel.id}-${new Date().getHours()}`;
  const cached = clientEpgCache.get(cacheKey);
  
  // Return cached EPG if it is less than 20 minutes old
  if (cached && Date.now() - cached.fetchedAt < 20 * 60 * 1000) {
    return cached.programs;
  }

  // Detect Capacitor/Native App or Localhost
  const isLocalOrNative = 
    window.location.protocol === 'file:' || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    (window as any).Capacitor !== undefined;

  let streamId: string | undefined = undefined;
  
  // Extract stream ID for Xtream Code channels
  if (playlist?.type === 'xtream' && channel.url) {
    const parts = channel.url.split('/');
    const lastPart = parts[parts.length - 1]; // e.g. "12345.ts" or "12345"
    if (lastPart) {
      const streamIdMatch = lastPart.match(/^(\d+)\./) || lastPart.match(/^(\d+)$/);
      if (streamIdMatch) {
        streamId = streamIdMatch[1];
      }
    }
  }

  // If running in Capacitor/Native context, fetch DIRECTLY from sources to bypass server proxy bottleneck!
  if (isLocalOrNative) {
    // 1. Direct Xtream Codes EPG Query
    if (playlist?.type === 'xtream' && playlist.serverUrl && playlist.username && playlist.password && streamId) {
      try {
        let normalizedUrl = playlist.serverUrl.trim().replace(/\/+$/, '');
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
          normalizedUrl = 'http://' + normalizedUrl;
        }
        
        const directUrl = `${normalizedUrl}/player_api.php?username=${playlist.username}&password=${playlist.password}&action=get_short_epg&stream_id=${streamId}`;
        console.log(`[EPG Client] Native Direct fetch from Xtream API:`, directUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(directUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.epg_listings)) {
            const extractTime = (dateStr: string): string => {
              const match = dateStr.match(/(\d{2}):(\d{2})/);
              return match ? `${match[1]}:${match[2]}` : '00:00';
            };
            
            const programs: EPGProgram[] = data.epg_listings.map((item: any, idx: number) => ({
              id: `direct-xtream-${streamId}-${idx}`,
              title: item.title || 'Live Stream',
              start: item.start ? extractTime(item.start) : '00:00',
              end: item.end ? extractTime(item.end) : '00:00',
              description: item.description || ''
            }));
            
            if (programs.length > 0) {
              clientEpgCache.set(cacheKey, { fetchedAt: Date.now(), programs });
              return programs;
            }
          }
        }
      } catch (err) {
        console.warn('[EPG Client] Direct Xtream fetch failed, falling back:', err);
      }
    }

    // 2. Direct XMLTV Parser (if urlTvg is specified)
    if (channel.urlTvg && channel.epgId) {
      try {
        let xmlMap = parsedXmltvCache.get(channel.urlTvg);
        if (!xmlMap) {
          console.log(`[EPG Client] Native Direct download & parse XMLTV:`, channel.urlTvg);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          const response = await fetch(channel.urlTvg, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const text = await response.text();
            xmlMap = parseXMLTVOnClient(text);
            parsedXmltvCache.set(channel.urlTvg, xmlMap);
          }
        }
        
        if (xmlMap) {
          const programs = xmlMap.get(channel.epgId);
          if (programs && programs.length > 0) {
            clientEpgCache.set(cacheKey, { fetchedAt: Date.now(), programs });
            return programs;
          }
        }
      } catch (err) {
        console.warn('[EPG Client] Direct XMLTV parse failed, falling back:', err);
      }
    }
  }

  // 3. Server Proxy Fetch Fallback (for hosting on web platforms)
  try {
    console.log(`[EPG Client] Querying server proxy EPG for channel: ${channel.name}`);
    const response = await fetch(getApiUrl('/api/epg'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        playlistType: playlist?.type || 'local',
        serverUrl: playlist?.serverUrl,
        username: playlist?.username,
        password: playlist?.password,
        streamId,
        epgId: channel.epgId,
        urlTvg: channel.urlTvg,
        channelId: channel.id
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.programs) && data.programs.length > 0) {
        clientEpgCache.set(cacheKey, {
          fetchedAt: Date.now(),
          programs: data.programs
        });
        return data.programs;
      }
    }
  } catch (err) {
    console.warn('[EPG Client] Server proxy EPG fetch failed:', err);
  }
  
  // 4. Safe Robust dynamic mock generation
  const fallbackPrograms = getDynamicEPG(channel.id);
  clientEpgCache.set(cacheKey, {
    fetchedAt: Date.now(),
    programs: fallbackPrograms
  });
  return fallbackPrograms;
}
