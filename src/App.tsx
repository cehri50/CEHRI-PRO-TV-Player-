/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Tv, Library, Settings, Star, History, Clock, Power, 
  HelpCircle, Volume2, ShieldAlert, Wifi, MonitorPlay, Calendar, Globe,
  UploadCloud, CheckCircle2, AlertCircle
} from 'lucide-react';
import { 
  IPTVPlaylistItem, IPTVPlaylist, IPTVHistoryItem, IPTVAppSettings, IPTVTheme, CrashLog 
} from './types';
import { DEMO_PLAYLIST, DEMO_CHANNELS, DEMO_PLAYLIST_ID } from './demoData';
import { parseM3U, getApiUrl, convertSharingUrl, isLocalUrl } from './utils';
import { RENDER_API_URL, APP_VERSION } from './config';
import cehriLogo from './assets/images/cehri_logo_1782719992837.jpg';
import SplashScreen from './components/SplashScreen';
import NavigationGuide from './components/NavigationGuide';
import PlaylistManager from './components/PlaylistManager';
import ChannelList from './components/ChannelList';
import CustomVideoPlayer from './components/CustomVideoPlayer';
import SettingsView from './components/SettingsView';
import TVGuideTimeline from './components/TVGuideTimeline';
import PortalWebView from './components/PortalWebView';

const LOCAL_STORAGE_PLAYLISTS = 'nexus_iptv_playlists';
const LOCAL_STORAGE_CHANNELS = 'nexus_iptv_channels';
const LOCAL_STORAGE_FAVORITES = 'nexus_iptv_favorites';
const LOCAL_STORAGE_HISTORY = 'nexus_iptv_history';
const LOCAL_STORAGE_SETTINGS = 'nexus_iptv_settings';

const DEFAULT_SETTINGS: IPTVAppSettings = {
  theme: 'golden-royal',
  language: 'tr',
  bufferSize: 'medium',
  hardwareAcceleration: true,
  autoPlayLast: true,
  aspectRatio: 'auto',
  playerEngine: 'exoplayer',
  userAgent: 'Mozilla/5.0 (Linux; Android 10; SmartTV) ExoPlayer/2.18',
  portalUrl: 'https://archive.org/details/nasa-tv',
  leanbackBannerEnabled: true,
  leanbackRecommendationsEnabled: true,
  gatewayUrl: typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file') && !window.location.origin.startsWith('capacitor')
    ? window.location.origin
    : RENDER_API_URL,
  streamProxyEnabled: true
};

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const handleFinishBooting = useCallback(() => {
    setIsBooting(false);
  }, []);
  const [currentTime, setCurrentTime] = useState('');
  
  // Local state
  const [playlists, setPlaylists] = useState<IPTVPlaylist[]>([]);
  const [channels, setChannels] = useState<IPTVPlaylistItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<IPTVHistoryItem[]>([]);
  const [settings, setSettings] = useState<IPTVAppSettings>(DEFAULT_SETTINGS);
  const [crashLogs, setCrashLogs] = useState<CrashLog[]>([]);
  const [updateNeededInfo, setUpdateNeededInfo] = useState<{
    needed: boolean;
    message: string;
    updateUrl: string;
    forceUpdate: boolean;
    currentVersion: string;
  } | null>(null);
  
  // Player state
  const [activeChannel, setActiveChannel] = useState<IPTVPlaylistItem | null>(null);
  const [activeTab, setActiveTab] = useState<'channels' | 'tv-guide' | 'portal' | 'playlists' | 'settings'>('playlists');

  // TV Box Remote control spatial navigation coordinator
  const tabsList: ('channels' | 'tv-guide' | 'portal' | 'playlists' | 'settings')[] = [
    'channels', 'tv-guide', 'portal', 'playlists', 'settings'
  ];
  const [headerFocusedIndex, setHeaderFocusedIndex] = useState(3); // Default to playlists
  const [focusedArea, setFocusedArea] = useState<'header' | 'content'>('content');

  // Synchronize headerFocusedIndex with activeTab
  useEffect(() => {
    const idx = tabsList.indexOf(activeTab);
    if (idx !== -1) {
      setHeaderFocusedIndex(idx);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeChannel) return; // CustomVideoPlayer takes control of keys when active

    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (focusedArea === 'header') {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            setHeaderFocusedIndex(prev => {
              const nextIdx = prev > 0 ? prev - 1 : tabsList.length - 1;
              const targetId = `nav-tab-${tabsList[nextIdx]}`;
              document.getElementById(targetId)?.focus();
              return nextIdx;
            });
            break;
          case 'ArrowRight':
            e.preventDefault();
            setHeaderFocusedIndex(prev => {
              const nextIdx = prev < tabsList.length - 1 ? prev + 1 : 0;
              const targetId = `nav-tab-${tabsList[nextIdx]}`;
              document.getElementById(targetId)?.focus();
              return nextIdx;
            });
            break;
          case 'ArrowDown':
            e.preventDefault();
            setFocusedArea('content');
            break;
          case 'Enter':
            e.preventDefault();
            setActiveTab(tabsList[headerFocusedIndex]);
            break;
          default:
            break;
        }
      } else {
        // In content area. If they press Backspace/Escape and no channel is active,
        // go back to the header bar so they can switch tabs with remote control!
        if (e.key === 'Backspace' || e.key === 'Escape') {
          e.preventDefault();
          setFocusedArea('header');
          const targetId = `nav-tab-${tabsList[headerFocusedIndex]}`;
          document.getElementById(targetId)?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [focusedArea, headerFocusedIndex, activeTab, activeChannel]);

  // Global drag-and-drop and toast state
  const [dragCounter, setDragCounter] = useState(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'loading', message: string) => {
    setToast({ type, message });
    if (type !== 'loading') {
      const timer = setTimeout(() => {
        setToast(current => current?.message === message ? null : current);
      }, 7000);
      return () => clearTimeout(timer);
    }
  };

  const handleImportM3UText = (name: string, content: string) => {
    const playlistId = `local-${Date.now()}`;
    try {
      const parsedChannels = parseM3U(content, playlistId);
      if (parsedChannels.length === 0) {
        showToast('error', settings.language === 'tr' ? 'M3U içeriği çözümlenemedi veya boş.' : 'Failed to parse M3U content or it is empty.');
        return;
      }
      const newPlaylist: IPTVPlaylist = {
        id: playlistId,
        name,
        type: 'local',
        itemsCount: parsedChannels.length,
        addedAt: Date.now()
      };
      handleAddPlaylist(newPlaylist, parsedChannels);
      showToast('success', settings.language === 'tr' ? `Başarıyla eklendi: ${name} (${parsedChannels.length} kanal)` : `Successfully added: ${name} (${parsedChannels.length} channels)`);
    } catch (err: any) {
      showToast('error', settings.language === 'tr' ? 'Çözümleme hatası.' : 'Parsing error.');
    }
  };

  const handleImportM3UUrl = async (url: string) => {
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'http://' + normalizedUrl;
    }

    // Convert common sharing URLs (Google Drive, Dropbox, GitHub) to raw content downloads
    normalizedUrl = convertSharingUrl(normalizedUrl);

    let playlistName = 'M3U Playlist';
    try {
      const urlObj = new URL(normalizedUrl);
      playlistName = urlObj.hostname;
    } catch (e) {}

    showToast('loading', settings.language === 'tr' ? 'Oynatma listesi indiriliyor...' : 'Downloading playlist...');

    try {
      let response;
      let text = '';

      if (isLocalUrl(normalizedUrl)) {
        console.log('[App] Local URL detected, attempting direct browser fetch:', normalizedUrl);
        try {
          response = await fetch(normalizedUrl);
          if (!response.ok) {
            throw new Error(`Status ${response.status}`);
          }
          text = await response.text();
        } catch (localErr: any) {
          console.warn('[App] Direct local fetch failed:', localErr);
          throw new Error(
            settings.language === 'tr'
              ? `Yerel ağ adresine (${normalizedUrl}) doğrudan erişilemedi.\n\n` +
                `💡 Çözüm Yolları:\n` +
                `1. Bu adresi tarayıcınızda yeni sekmede açıp içeriğini kopyalayarak, 'Yerel M3U Dosyası' sekmesinden metin olarak veya sürükle-bırak yöntemiyle yükleyebilirsiniz.\n` +
                `2. Pardus sunucunuzu internete açmak için Ngrok veya LocalTunnel kullanıp, size verilen güvenli HTTPS adresini buraya ekleyebilirsiniz.`
              : `Could not connect to local network address (${normalizedUrl}) directly from browser.\n\n` +
                `💡 Solutions:\n` +
                `1. Open this address in a new tab, copy its contents, and upload/paste them under the 'Local M3U File' tab.\n` +
                `2. Use a tunnel tool like Ngrok or LocalTunnel on your Pardus server to get a secure HTTPS link.`
          );
        }
      } else {
        const proxyUrl = getApiUrl(`/api/m3u/proxy?url=${encodeURIComponent(normalizedUrl)}`, settings.gatewayUrl);
        try {
          response = await fetch(proxyUrl);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server status ${response.status}`);
          }
          text = await response.text();
        } catch (proxyErr: any) {
          console.warn('Proxy fetch failed on App.tsx, attempting direct browser fetch:', proxyErr);
          response = await fetch(normalizedUrl);
          if (!response.ok) {
            throw new Error(`Direct fetch status ${response.status} (Proxy error: ${proxyErr.message})`);
          }
          text = await response.text();
        }
      }

      const playlistId = `m3u-${Date.now()}`;
      const parsedChannels = parseM3U(text, playlistId);

      if (parsedChannels.length === 0) {
        showToast('error', settings.language === 'tr' ? 'Çözümlenebilir kanal bulunamadı.' : 'No parseable channels found.');
        return;
      }

      const newPlaylist: IPTVPlaylist = {
        id: playlistId,
        name: playlistName,
        type: 'm3u',
        url: normalizedUrl,
        itemsCount: parsedChannels.length,
        addedAt: Date.now()
      };

      handleAddPlaylist(newPlaylist, parsedChannels);
      showToast('success', settings.language === 'tr' ? `Başarıyla indirildi: ${playlistName} (${parsedChannels.length} kanal)` : `Successfully downloaded: ${playlistName} (${parsedChannels.length} channels)`);
    } catch (err: any) {
      showToast('error', settings.language === 'tr' ? `Yüklenemedi:\n${err.message}` : `Load failed:\n${err.message}`);
    }
  };

  const handleGlobalDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter(prev => prev + 1);
  };

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter(prev => Math.max(0, prev - 1));
  };

  const handleGlobalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleGlobalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter(0);

    // 1. Try to catch a URL link
    const droppedText = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '';
    const trimmedText = droppedText.trim();

    if (trimmedText && (trimmedText.startsWith('http://') || trimmedText.startsWith('https://'))) {
      handleImportM3UUrl(trimmedText);
      return;
    }

    // 2. Try to catch a local file
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.m3u') || file.name.endsWith('.m3u8') || file.type.includes('mpegurl')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          const cleanName = file.name.replace(/\.[^/.]+$/, ""); // strip extension
          handleImportM3UText(cleanName, content);
        };
        reader.readAsText(file);
      } else {
        showToast('error', settings.language === 'tr' ? 'Lütfen geçerli bir .m3u veya .m3u8 dosyası yükleyin.' : 'Please upload a valid .m3u or .m3u8 file.');
      }
    }
  };

  // Crash Logger callback
  const handleAddCrashLog = (type: 'network' | 'decoder' | 'system', message: string, details: string, channelName?: string) => {
    const newLog: CrashLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      channelName,
      type,
      message,
      details
    };
    setCrashLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 50);
      try {
        localStorage.setItem('nexus_iptv_crashlogs', JSON.stringify(updated));
      } catch(e) {}
      return updated;
    });
  };

  // Hydrate crash logs on start
  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem('nexus_iptv_crashlogs');
      if (savedLogs) setCrashLogs(JSON.parse(savedLogs));
    } catch(e) {}
  }, []);

  // Clock runner
  useEffect(() => {
    const updateClock = () => {
      const date = new Date();
      const h = String(date.getHours()).padStart(2, '0');
      const m = String(date.getMinutes()).padStart(2, '0');
      const s = String(date.getSeconds()).padStart(2, '0');
      setCurrentTime(`${h}:${m}:${s}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Remote version check for automatic / forced updates
  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const gateway = settings.gatewayUrl || RENDER_API_URL;
        console.log(`[Update Check] Checking for updates via gateway: ${gateway}`);
        
        const res = await fetch(getApiUrl('/api/version', gateway));
        if (res.ok) {
          const data = await res.json();
          const clientVer = APP_VERSION;
          const serverMinVer = data.minRequiredVersion;
          
          const isOlder = (client: string, required: string) => {
            const cParts = client.split('.').map(Number);
            const rParts = required.split('.').map(Number);
            for (let i = 0; i < Math.max(cParts.length, rParts.length); i++) {
              const c = cParts[i] || 0;
              const r = rParts[i] || 0;
              if (c < r) return true;
              if (c > r) return false;
            }
            return false;
          };

          if (isOlder(clientVer, serverMinVer)) {
            console.log(`[Update Check] Version mismatch detected. Local: ${clientVer}, Min Required: ${serverMinVer}`);
            setUpdateNeededInfo({
              needed: true,
              message: settings.language === 'tr' ? data.messageTr : data.messageEn,
              updateUrl: data.updateUrl,
              forceUpdate: !!data.forceUpdate,
              currentVersion: data.currentVersion
            });
          }
        }
      } catch (err) {
        console.warn('Update check failed:', err);
      }
    };
    
    // Check after settings load
    if (settings.gatewayUrl) {
      checkUpdates();
    }
  }, [settings.gatewayUrl, settings.language]);

  // Hydrate from LocalStorage
  useEffect(() => {
    try {
      const savedPlaylists = localStorage.getItem(LOCAL_STORAGE_PLAYLISTS);
      const savedChannels = localStorage.getItem(LOCAL_STORAGE_CHANNELS);
      const savedFavorites = localStorage.getItem(LOCAL_STORAGE_FAVORITES);
      const savedHistory = localStorage.getItem(LOCAL_STORAGE_HISTORY);
      const savedSettings = localStorage.getItem(LOCAL_STORAGE_SETTINGS);

      if (savedPlaylists) setPlaylists(JSON.parse(savedPlaylists));
      if (savedChannels) setChannels(JSON.parse(savedChannels));
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings) as IPTVAppSettings;
        // Cleanse old/mismatched gateway URL if user is running on a real cloud run domain,
        // but their localStorage has the hardcoded dev URL or old hostname.
        // Additionally, if they are running on a native TV Box (Capacitor/localhost) or if their gateway is a stale development URL,
        // force heal it to the live production Railway proxy URL so it works seamlessly!
        if (typeof window !== 'undefined') {
          const isNativeTVBox = window.hasOwnProperty('Capacitor') ||
            (window as any).Capacitor ||
            window.location.protocol === 'capacitor:' || 
            window.location.protocol === 'file:' || 
            (window.location.hostname === 'localhost' && window.location.port !== '3000');

          const hasStaleDevUrl = parsed.gatewayUrl && parsed.gatewayUrl.includes('run.app') && !window.location.hostname.includes('europe-west1.run.app');

          if (isNativeTVBox || !parsed.gatewayUrl || hasStaleDevUrl) {
            parsed.gatewayUrl = RENDER_API_URL;
            try {
              localStorage.setItem(LOCAL_STORAGE_SETTINGS, JSON.stringify(parsed));
            } catch (e) {}
          } else if (window.location.hostname.includes('europe-west1.run.app')) {
            if (parsed.gatewayUrl && parsed.gatewayUrl.includes('europe-west1.run.app') && !parsed.gatewayUrl.includes(window.location.hostname)) {
              parsed.gatewayUrl = window.location.origin;
              try {
                localStorage.setItem(LOCAL_STORAGE_SETTINGS, JSON.stringify(parsed));
              } catch (e) {}
            }
          }
        }
        setSettings(parsed);
      }

      // Auto-load last watched channel if settings permit and we have history
      if (savedSettings && savedHistory && savedChannels) {
        const parsedSettings = JSON.parse(savedSettings) as IPTVAppSettings;
        const parsedHistory = JSON.parse(savedHistory) as IPTVHistoryItem[];
        const parsedChannels = JSON.parse(savedChannels) as IPTVPlaylistItem[];
        
        if (parsedSettings.autoPlayLast && parsedHistory.length > 0) {
          const lastWatched = parsedHistory[0];
          const matchedChannel = parsedChannels.find(c => c.id === lastWatched.channelId);
          if (matchedChannel) {
            setActiveChannel(matchedChannel);
          }
        }
      }
    } catch (err) {
      console.error('LocalStorage hydration failed', err);
    }
  }, []);

  // Auto boot into channels if channels exist, else playlists
  useEffect(() => {
    if (!isBooting) {
      if (channels.length > 0) {
        setActiveTab('channels');
      } else {
        setActiveTab('playlists');
      }
    }
  }, [isBooting]);

  // Playlist management actions
  const handleAddPlaylist = (newPlaylist: IPTVPlaylist, newChannels: IPTVPlaylistItem[]) => {
    const updatedPlaylists = [...playlists.filter(p => p.id !== newPlaylist.id), newPlaylist];
    const updatedChannels = [...channels.filter(c => c.playlistId !== newPlaylist.id), ...newChannels];
    
    setPlaylists(updatedPlaylists);
    setChannels(updatedChannels);
    
    localStorage.setItem(LOCAL_STORAGE_PLAYLISTS, JSON.stringify(updatedPlaylists));
    localStorage.setItem(LOCAL_STORAGE_CHANNELS, JSON.stringify(updatedChannels));
    setActiveTab('channels');
  };

  const handleRemovePlaylist = (playlistId: string) => {
    const updatedPlaylists = playlists.filter(p => p.id !== playlistId);
    const updatedChannels = channels.filter(c => c.playlistId !== playlistId);
    const updatedFavorites = favorites.filter(favId => {
      const channel = channels.find(c => c.id === favId);
      return channel ? channel.playlistId !== playlistId : true;
    });
    const updatedHistory = history.filter(h => h.playlistId !== playlistId);

    setPlaylists(updatedPlaylists);
    setChannels(updatedChannels);
    setFavorites(updatedFavorites);
    setHistory(updatedHistory);

    localStorage.setItem(LOCAL_STORAGE_PLAYLISTS, JSON.stringify(updatedPlaylists));
    localStorage.setItem(LOCAL_STORAGE_CHANNELS, JSON.stringify(updatedChannels));
    localStorage.setItem(LOCAL_STORAGE_FAVORITES, JSON.stringify(updatedFavorites));
    localStorage.setItem(LOCAL_STORAGE_HISTORY, JSON.stringify(updatedHistory));

    if (activeChannel && activeChannel.playlistId === playlistId) {
      setActiveChannel(null);
    }
  };

  const handleSelectPlaylist = (playlistId: string) => {
    // Simply filter views or go to channel listings
    setActiveTab('channels');
  };

  const handleLoadDemoPlaylist = () => {
    handleAddPlaylist(DEMO_PLAYLIST, DEMO_CHANNELS);
  };

  // Toggle channel favorite
  const handleToggleFavorite = (channelId: string) => {
    const updated = favorites.includes(channelId)
      ? favorites.filter(id => id !== channelId)
      : [...favorites, channelId];
    
    setFavorites(updated);
    localStorage.setItem(LOCAL_STORAGE_FAVORITES, JSON.stringify(updated));
  };

  // Select channel to stream & update watch logs history
  const handleSelectChannel = (channel: IPTVPlaylistItem) => {
    setActiveChannel(channel);

    const historyItem: IPTVHistoryItem = {
      id: `hist-${Date.now()}`,
      channelId: channel.id,
      channelName: channel.name,
      logo: channel.logo,
      url: channel.url,
      group: channel.group,
      playlistId: channel.playlistId,
      watchedAt: Date.now()
    };

    const updatedHistory = [
      historyItem,
      ...history.filter(h => h.channelId !== channel.id)
    ].slice(0, 30); // Max 30 logs

    setHistory(updatedHistory);
    localStorage.setItem(LOCAL_STORAGE_HISTORY, JSON.stringify(updatedHistory));
  };

  // Dynamic system settings update
  const handleUpdateSettings = (newSettings: IPTVAppSettings) => {
    setSettings(newSettings);
    localStorage.setItem(LOCAL_STORAGE_SETTINGS, JSON.stringify(newSettings));
  };

  // Clear states
  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(LOCAL_STORAGE_HISTORY);
  };

  const handleClearFavorites = () => {
    setFavorites([]);
    localStorage.removeItem(LOCAL_STORAGE_FAVORITES);
  };

  const handleClearAllPlaylists = () => {
    setPlaylists([]);
    setChannels([]);
    setFavorites([]);
    setHistory([]);
    setActiveChannel(null);
    localStorage.removeItem(LOCAL_STORAGE_PLAYLISTS);
    localStorage.removeItem(LOCAL_STORAGE_CHANNELS);
    localStorage.removeItem(LOCAL_STORAGE_FAVORITES);
    localStorage.removeItem(LOCAL_STORAGE_HISTORY);
    setActiveTab('playlists');
  };

  // Channel zapping triggers inside video player
  const handleNextChannel = () => {
    if (channels.length === 0 || !activeChannel) return;
    const currentIdx = channels.findIndex(c => c.id === activeChannel.id);
    if (currentIdx !== -1) {
      const nextIdx = (currentIdx + 1) % channels.length;
      handleSelectChannel(channels[nextIdx]);
    }
  };

  const handlePrevChannel = () => {
    if (channels.length === 0 || !activeChannel) return;
    const currentIdx = channels.findIndex(c => c.id === activeChannel.id);
    if (currentIdx !== -1) {
      const prevIdx = (currentIdx - 1 + channels.length) % channels.length;
      handleSelectChannel(channels[prevIdx]);
    }
  };

  // Dynamic theme CSS configurations
  const getThemeClasses = (theme: IPTVTheme) => {
    switch (theme) {
      case 'tivimate-teal':
        return {
          background: 'bg-radial from-teal-950/90 to-slate-950 text-teal-100',
          card: 'bg-teal-900/40 border-teal-800/40',
          accentText: 'text-teal-400',
          accentBg: 'bg-teal-500',
          accentBgHover: 'hover:bg-teal-400',
          focusRing: 'ring-teal-400',
          topbar: 'bg-teal-950/80 border-teal-900'
        };
      case 'netflix-red':
        return {
          background: 'bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100',
          card: 'bg-neutral-900/40 border-neutral-850/40',
          accentText: 'text-red-500',
          accentBg: 'bg-red-600',
          accentBgHover: 'hover:bg-red-500',
          focusRing: 'ring-red-500',
          topbar: 'bg-neutral-950/85 border-neutral-900'
        };
      case 'golden-royal':
        return {
          background: 'bg-radial from-stone-900/90 to-stone-950 text-stone-100',
          card: 'bg-stone-900/40 border-stone-800/40',
          accentText: 'text-amber-500',
          accentBg: 'bg-amber-500',
          accentBgHover: 'hover:bg-amber-400',
          focusRing: 'ring-amber-500',
          topbar: 'bg-stone-950/80 border-stone-900'
        };
      case 'classic-dark':
      default:
        return {
          background: 'bg-slate-950 text-slate-100',
          card: 'bg-slate-900/40 border-slate-800/80',
          accentText: 'text-sky-400',
          accentBg: 'bg-sky-500',
          accentBgHover: 'hover:bg-sky-400',
          focusRing: 'ring-sky-500',
          topbar: 'bg-slate-950/80 border-slate-900'
        };
    }
  };

  const themeStyle = getThemeClasses(settings.theme);

  if (isBooting) {
    return <SplashScreen onFinish={handleFinishBooting} />;
  }

  return (
    <div 
      id="iptv-app-viewport" 
      className={`min-h-screen ${themeStyle.background} font-sans flex flex-col relative transition-all duration-500 overflow-x-hidden`}
      onDragEnter={handleGlobalDragEnter}
      onDragOver={handleGlobalDragOver}
    >
      {/* BACKGROUND GRAPHICS GLOW */}
      <div id="bg-glow-1" className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div id="bg-glow-2" className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP STATUS BAR NAVIGATION (Tivimate / OTT Style) */}
      <header id="app-header" className={`relative z-30 ${themeStyle.topbar} backdrop-blur-md border-b px-6 py-4 flex items-center justify-between shadow-lg`}>
        {/* Brand */}
        <div id="brand-logo-group" className="flex items-center gap-3">
          <div id="brand-icon-wrapper" className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/15 overflow-hidden flex items-center justify-center p-[2px]">
            <img 
              id="brand-logo-img" 
              src={cehriLogo} 
              alt="Cehri Logo" 
              className="w-full h-full object-cover rounded-[10px]"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 id="brand-title" className="text-base font-bold tracking-wider flex items-center gap-1.5 text-slate-100">
              CEHRİ<span className={themeStyle.accentText}>50</span>
            </h1>
            <span id="brand-badge" className="text-[9px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-amber-500 font-bold font-mono tracking-wider uppercase">
              KAPADOKYA EDITION
            </span>
          </div>
        </div>

        {/* Dynamic menu bar */}
        <nav id="app-nav-bar" className="flex flex-wrap items-center bg-slate-900/60 p-1 rounded-xl border border-slate-850/80 gap-1">
          <button
            id="nav-tab-channels"
            tabIndex={0}
            onClick={() => setActiveTab('channels')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-sky-400 focus:outline-none ${
              activeTab === 'channels' 
                ? `${themeStyle.accentBg} text-slate-950 font-bold shadow-lg` 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            } ${focusedArea === 'header' && headerFocusedIndex === 0 ? 'ring-2 ring-sky-400 outline-none scale-105' : ''}`}
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span>{settings.language === 'tr' ? 'Kanallar' : 'Channels'}</span>
          </button>

          <button
            id="nav-tab-tv-guide"
            tabIndex={0}
            onClick={() => setActiveTab('tv-guide')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-sky-400 focus:outline-none ${
              activeTab === 'tv-guide' 
                ? `${themeStyle.accentBg} text-slate-950 font-bold shadow-lg` 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            } ${focusedArea === 'header' && headerFocusedIndex === 1 ? 'ring-2 ring-sky-400 outline-none scale-105' : ''}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{settings.language === 'tr' ? 'TV Rehberi' : 'TV Guide'}</span>
          </button>

          <button
            id="nav-tab-portal"
            tabIndex={0}
            onClick={() => setActiveTab('portal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-sky-400 focus:outline-none ${
              activeTab === 'portal' 
                ? `${themeStyle.accentBg} text-slate-950 font-bold shadow-lg` 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            } ${focusedArea === 'header' && headerFocusedIndex === 2 ? 'ring-2 ring-sky-400 outline-none scale-105' : ''}`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{settings.language === 'tr' ? 'Web Portal' : 'Web Portal'}</span>
          </button>

          <button
            id="nav-tab-playlists"
            tabIndex={0}
            onClick={() => setActiveTab('playlists')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-sky-400 focus:outline-none ${
              activeTab === 'playlists' 
                ? `${themeStyle.accentBg} text-slate-950 font-bold shadow-lg` 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            } ${focusedArea === 'header' && headerFocusedIndex === 3 ? 'ring-2 ring-sky-400 outline-none scale-105' : ''}`}
          >
            <Library className="w-3.5 h-3.5" />
            <span>{settings.language === 'tr' ? 'Kaynaklar' : 'Sources'}</span>
          </button>

          <button
            id="nav-tab-settings"
            tabIndex={0}
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-sky-400 focus:outline-none ${
              activeTab === 'settings' 
                ? `${themeStyle.accentBg} text-slate-950 font-bold shadow-lg` 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            } ${focusedArea === 'header' && headerFocusedIndex === 4 ? 'ring-2 ring-sky-400 outline-none scale-105' : ''}`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{settings.language === 'tr' ? 'Ayarlar' : 'Settings'}</span>
          </button>
        </nav>

        {/* Live Device Status */}
        <div id="device-info-bar" className="flex items-center gap-4 text-xs font-mono">
          <div id="net-badge" className="hidden lg:flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 border border-slate-850 rounded-lg text-emerald-400">
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">ONLINE</span>
          </div>

          <div id="clock-badge" className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 border border-slate-850 rounded-lg text-slate-300 font-bold">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>{currentTime}</span>
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT BODY */}
      <main id="app-main-viewport" className="flex-1 py-6 px-4 md:px-8 relative z-20 overflow-y-auto">
        {activeTab === 'channels' && (
          <ChannelList
            playlists={playlists}
            channels={channels}
            activeChannel={activeChannel}
            favorites={favorites}
            history={history}
            onSelectChannel={handleSelectChannel}
            onToggleFavorite={handleToggleFavorite}
            language={settings.language}
            keyboardFocusActive={focusedArea === 'content' && !activeChannel} // Only focus channel list if in content area and player is closed
            onSwitchTab={setActiveTab}
            onExitToHeader={() => setFocusedArea('header')}
          />
        )}

        {activeTab === 'tv-guide' && (
          <TVGuideTimeline
            playlists={playlists}
            channels={channels}
            favorites={favorites}
            onSelectChannel={handleSelectChannel}
            onToggleFavorite={handleToggleFavorite}
            language={settings.language}
            onExitToHeader={() => setFocusedArea('header')}
          />
        )}

        {activeTab === 'portal' && (
          <PortalWebView
            settings={settings}
            language={settings.language}
            onExitToHeader={() => setFocusedArea('header')}
          />
        )}

        {activeTab === 'playlists' && (
          <PlaylistManager
            playlists={playlists}
            onAddPlaylist={handleAddPlaylist}
            onRemovePlaylist={handleRemovePlaylist}
            onSelectPlaylist={handleSelectPlaylist}
            onLoadDemoPlaylist={handleLoadDemoPlaylist}
            language={settings.language}
            settings={settings}
            onExitToHeader={() => setFocusedArea('header')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onClearHistory={handleClearHistory}
            onClearFavorites={handleClearFavorites}
            onClearAllPlaylists={handleClearAllPlaylists}
            crashLogs={crashLogs}
            onClearCrashLogs={() => { setCrashLogs([]); localStorage.removeItem('nexus_iptv_crashlogs'); }}
            language={settings.language}
            onExitToHeader={() => setFocusedArea('header')}
          />
        )}
      </main>

      {/* REMOTE KEYBOARD SHORTCUT FLOATING GUIDE (Except during fullscreen stream) */}
      {!activeChannel && (
        <NavigationGuide language={settings.language} />
      )}

      {/* INTEGRATED FULL-SCREEN TV CUSTOM VIDEO PLAYER (EXOPLAYER) */}
      {activeChannel && (
        <CustomVideoPlayer
          channel={activeChannel}
          onClose={() => setActiveChannel(null)}
          onNextChannel={handleNextChannel}
          onPrevChannel={handlePrevChannel}
          settings={settings}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          language={settings.language}
          onAddCrashLog={handleAddCrashLog}
        />
      )}

      {/* GLOBAL DRAG OVERLAY */}
      {dragCounter > 0 && (
        <div 
          id="global-drag-overlay"
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 border-4 border-dashed border-sky-500 m-4 rounded-3xl animate-fadeIn text-white"
          onDragOver={handleGlobalDragOver}
          onDragLeave={handleGlobalDragLeave}
          onDrop={handleGlobalDrop}
        >
          <div className="p-6 bg-sky-500/10 rounded-full border border-sky-500/20 text-sky-400 mb-6 animate-bounce">
            <UploadCloud className="w-16 h-16" />
          </div>
          <h2 className="text-3xl font-bold tracking-wide mb-2">
            {settings.language === 'tr' ? 'Yayın Listesini Buraya Bırakın' : 'Drop Your Playlist Here'}
          </h2>
          <p className="text-sm text-slate-400 max-w-md text-center leading-relaxed">
            {settings.language === 'tr' 
              ? 'M3U / M3U8 dosyasını veya IPTV bağlantı adresini ekranın herhangi bir yerine bırakarak anında yükleyebilirsiniz.' 
              : 'You can drop M3U / M3U8 files or any IPTV connection URL anywhere on the screen to import instantly.'}
          </p>
        </div>
      )}

      {/* FORCE UPDATE OVERLAY */}
      {updateNeededInfo && updateNeededInfo.needed && (
        <div 
          id="force-update-overlay"
          className="fixed inset-0 bg-slate-950/98 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-6 text-white font-sans text-center animate-fadeIn"
        >
          {/* Decorative glowing gradient behind */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[150px] pointer-events-none" />
          
          <div className="max-w-xl bg-slate-900/40 border border-slate-800/80 p-8.5 rounded-3xl shadow-2xl relative overflow-hidden backdrop-blur-md">
            {/* Top header */}
            <div className="w-16 h-16 bg-sky-500/10 rounded-full border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold tracking-wide mb-3">
              {settings.language === 'tr' ? 'Yeni Sürüm Mevcut!' : 'New Update Available!'}
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              {updateNeededInfo.message}
            </p>

            <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-850/60 mb-6 text-left">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
                  {settings.language === 'tr' ? 'Mevcut Sürüm' : 'Current Version'}
                </span>
                <span className="text-sm font-mono font-bold text-slate-300">
                  v{APP_VERSION}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
                  {settings.language === 'tr' ? 'En Güncel Sürüm' : 'Latest Version'}
                </span>
                <span className="text-sm font-mono font-bold text-sky-400">
                  v{updateNeededInfo.currentVersion}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <a 
                href={updateNeededInfo.updateUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-3.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 transition-all duration-200 text-center"
              >
                {settings.language === 'tr' ? 'GÜNCELLEMEYİ İNDİR (.APK)' : 'DOWNLOAD UPDATE (.APK)'}
              </a>
              
              {!updateNeededInfo.forceUpdate && (
                <button
                  onClick={() => setUpdateNeededInfo(null)}
                  className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 font-semibold text-xs rounded-xl border border-slate-850 transition-all duration-200"
                >
                  {settings.language === 'tr' ? 'Daha Sonra Hatırlat' : 'Remind Me Later'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL TOAST NOTIFICATION */}
      {toast && (
        <div 
          id="global-toast-message"
          className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-slate-900/95 border border-slate-800/80 backdrop-blur-md px-5 py-4 rounded-2xl shadow-2xl animate-slideIn max-w-md text-white transition-all duration-350"
        >
          {toast.type === 'loading' && (
            <div className="w-5 h-5 text-sky-400 animate-spin flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
          )}
          {toast.type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          {toast.type === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs font-medium leading-relaxed whitespace-pre-line">
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
