/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IPTVPlaylistItem, IPTVPlaylist } from './types';
import { RENDER_API_URL } from './config';

/**
 * Parses raw M3U string content into IPTVPlaylistItem array
 */
export function parseM3U(m3uContent: string, playlistId: string): IPTVPlaylistItem[] {
  const items: IPTVPlaylistItem[] = [];
  const lines = m3uContent.split('\n');
  
  // Extract url-tvg or x-tvg-url from the EXTM3U header
  let urlTvg: string | undefined = undefined;
  for (let idx = 0; idx < Math.min(20, lines.length); idx++) {
    const line = lines[idx].trim();
    if (line.startsWith('#EXTM3U')) {
      const tvgUrlMatch = line.match(/url-tvg="([^"]+)"/) || line.match(/x-tvg-url="([^"]+)"/);
      if (tvgUrlMatch) {
        urlTvg = tvgUrlMatch[1];
      }
      break;
    }
  }
  
  let currentInfo: {
    name: string;
    logo?: string;
    group: string;
    epgId?: string;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      // Parse EXTINF line
      // Example: #EXTINF:-1 tvg-id="CNN.us" tvg-name="CNN" tvg-logo="http://logo.png" group-title="News",CNN US
      const infoPart = line.substring(8);
      
      // Extract tvg-logo
      const logoMatch = infoPart.match(/tvg-logo="([^"]+)"/);
      const logo = logoMatch ? logoMatch[1] : undefined;
      
      // Extract group-title
      const groupMatch = infoPart.match(/group-title="([^"]+)"/);
      let group = groupMatch ? groupMatch[1] : 'Genel (General)';
      
      // Normalize group names to be clean
      group = group.replace(/\[.*?\]/g, '').trim() || 'Genel (General)';

      // Extract tvg-id
      const epgMatch = infoPart.match(/tvg-id="([^"]+)"/);
      const epgId = epgMatch ? epgMatch[1] : undefined;
      
      // Extract name (everything after the last comma)
      const commaIndex = line.lastIndexOf(',');
      let name = 'Bilinmeyen Kanal (Unknown)';
      if (commaIndex !== -1 && commaIndex < line.length - 1) {
        name = line.substring(commaIndex + 1).trim();
      } else {
        // Fallback name parsing if comma is missing
        const nameMatch = infoPart.match(/tvg-name="([^"]+)"/);
        name = nameMatch ? nameMatch[1] : 'Kanal (Channel)';
      }

      currentInfo = {
        name,
        logo,
        group,
        epgId
      };
    } else if (line.startsWith('http') && currentInfo) {
      // We found a URL for the EXTINF above
      const id = `${playlistId}-${items.length}-${Math.random().toString(36).substr(2, 5)}`;
      items.push({
        id,
        name: currentInfo.name,
        logo: currentInfo.logo,
        url: line,
        group: currentInfo.group,
        epgId: currentInfo.epgId,
        playlistId,
        urlTvg
      });
      currentInfo = null;
    }
  }

  return items;
}

/**
 * Validates a stream URL format
 */
export function getStreamType(url: string): 'hls' | 'dash' | 'mp4' | 'mkv' | 'unknown' {
  const lowercase = url.toLowerCase();
  if (lowercase.includes('.m3u8')) return 'hls';
  if (lowercase.includes('.mpd')) return 'dash';
  if (lowercase.includes('.mp4')) return 'mp4';
  if (lowercase.includes('.mkv')) return 'mkv';
  if (lowercase.includes('.ts') || lowercase.includes('mpegts')) return 'hls'; // Fallback to HLS/TS
  return 'hls'; // Default to HLS for stream proxy
}

/**
 * Format system timestamp into custom display date/time
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Clean up invalid assets or return local cache checks
 */
export function getCleanLogoUrl(url?: string): string {
  if (!url) return 'https://images.unsplash.com/photo-1542204172-e7052809a8a7?w=128&auto=format&fit=crop&q=60'; // Premium abstract placeholder
  return url;
}

/**
 * Dynamically resolves relative API paths to the hosted Cloud Run URL if running in a native
 * container (Capacitor/Android/iOS WebView) or local bundle.
 */
export function getApiUrl(path: string, customGateway?: string): string {
  let gateway = customGateway ? customGateway.trim() : '';

  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    // If the browser is running on the app's real web deployment (dev or pre),
    // and the custom gateway is pointing to a different container domain of the same app,
    // we should override/bypass it and use relative path (currentOrigin) to keep it same-origin and avoid CORS!
    const isSharedUrl = window.location.hostname.includes('europe-west1.run.app');
    if (isSharedUrl && gateway && gateway.includes('europe-west1.run.app') && !gateway.includes(window.location.hostname)) {
      console.log(`[API URL] Overriding mismatched gateway ${gateway} with same-origin ${currentOrigin} for path ${path}`);
      gateway = currentOrigin;
    }

    // Mixed Content Bypass: If the page is loaded over secure HTTPS, any AJAX request to an http:// private IP/gateway
    // will be blocked by browser security. In this case, we fallback to the cloud app's secure HTTPS origin to handle proxying.
    if (window.location.protocol === 'https:' && gateway && gateway.startsWith('http://')) {
      console.log(`[API URL] Overriding insecure HTTP gateway ${gateway} with secure same-origin ${currentOrigin} to prevent browser Mixed Content blockages.`);
      gateway = currentOrigin;
    }
  }

  if (gateway) {
    const cleanGateway = gateway.replace(/\/$/, ''); // strip trailing slash
    return `${cleanGateway}${path.startsWith('/') ? '' : '/'}${path}`;
  }
  
  // Detect if running under Capacitor/Android TV or local offline environments
  const isLocalOrNative = 
    typeof window !== 'undefined' && 
    (window.hasOwnProperty('Capacitor') ||
     (window as any).Capacitor ||
     window.location.protocol === 'capacitor:' || 
     window.location.protocol === 'file:' || 
     (window.location.hostname === 'localhost' && window.location.port !== '3000'));
     
  if (isLocalOrNative) {
    const isCapacitor = typeof window !== 'undefined' && (!!(window as any).Capacitor || window.location.protocol === 'capacitor:');
    const defaultGateway = isCapacitor
      ? RENDER_API_URL
      : (typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file') && !window.location.origin.startsWith('capacitor')
          ? window.location.origin
          : RENDER_API_URL);
    return `${defaultGateway}${path.startsWith('/') ? '' : '/'}${path}`;
  }
  
  return path; // relative path
}
