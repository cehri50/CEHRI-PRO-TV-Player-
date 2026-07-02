/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileVideo, Link, Key, UploadCloud, Plus, AlertCircle, CheckCircle2, 
  Trash2, HelpCircle, ArrowRight, Database, Disc, Settings 
} from 'lucide-react';
import { IPTVPlaylist, PlaylistType, IPTVAppSettings } from '../types';
import { parseM3U, getApiUrl, convertSharingUrl } from '../utils';
import { DEMO_PLAYLIST_ID } from '../demoData';
import { GOOGLE_DRIVE_FILE_ID } from '../config';

interface PlaylistManagerProps {
  playlists: IPTVPlaylist[];
  onAddPlaylist: (playlist: IPTVPlaylist, items: any[]) => void;
  onRemovePlaylist: (playlistId: string) => void;
  onSelectPlaylist: (playlistId: string) => void;
  onLoadDemoPlaylist: () => void;
  language: 'tr' | 'en';
  settings: IPTVAppSettings;
  onExitToHeader?: () => void;
}

export default function PlaylistManager({
  playlists,
  onAddPlaylist,
  onRemovePlaylist,
  onSelectPlaylist,
  onLoadDemoPlaylist,
  language,
  settings,
  onExitToHeader
}: PlaylistManagerProps) {
  const [activeTab, setActiveTab] = useState<'m3u-url' | 'xtream' | 'file'>('m3u-url');
  
  useEffect(() => {
    const handleLocalBack = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        onExitToHeader?.();
      }
    };
    window.addEventListener('keydown', handleLocalBack);
    return () => window.removeEventListener('keydown', handleLocalBack);
  }, [onExitToHeader]);
  
  // Form States
  const [playlistName, setPlaylistName] = useState('Pardus IPTV');
  const [m3uUrl, setM3uUrl] = useState('http://192.168.1.116:8081/api/epg');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Status states
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = {
    tr: {
      title: 'Yayın Kaynağı Ekle',
      subtitle: 'M3U listenizi veya Xtream Codes üyeliğinizi tanımlayın',
      tabM3uUrl: 'M3U URL Ekle',
      tabXtream: 'Xtream Codes API',
      tabFile: 'Yerel M3U Dosyası',
      placeholderName: 'Örn. Ev Playlist, Spor Paketi...',
      fieldName: 'Oynatma Listesi Adı',
      fieldM3uUrl: 'M3U Oynatma Listesi URL',
      fieldServerUrl: 'Sunucu Adresi (Server URL)',
      fieldUsername: 'Kullanıcı Adı (Username)',
      fieldPassword: 'Şifre (Password)',
      dragDropText: 'M3U dosyasını veya M3U bağlantısını (http://...) buraya sürükleyip bırakın',
      orText: 'veya',
      selectFileBtn: 'Dosya Seçerek Yükle',
      addBtn: 'Listeyi Ekle',
      loadingBtn: 'İşleniyor...',
      demoBtn: 'Hazır Demo Kanal Listesini Yükle (1-Tıklama)',
      demoDesc: 'İçerisinde NASA TV, TRT Haber, TRT Spor gibi tamamen yasal, ücretsiz ve çalışır durumda 10 popüler kanal yer alır. Hemen test etmek için yükleyin.',
      activePlaylists: 'Kayıtlı Kaynaklarınız',
      channelsCount: 'kanal',
      addedAt: 'Eklendi:',
      noPlaylists: 'Kayıtlı herhangi bir IPTV listesi bulunamadı. Lütfen yukarıdan bir kaynak ekleyin veya demo listeyi yükleyin.',
      invalidFile: 'Lütfen geçerli bir .m3u dosyası yükleyin.',
      parseError: 'M3U dosyası çözümlenemedi. Biçim doğru olmayabilir.',
      emptyError: 'Lütfen tüm gerekli alanları doldurun.',
      urlFetchError: 'M3U URL adresi çekilemedi (Tarayıcı CORS engeli veya geçersiz URL). Bu uygulama tarayıcıda çalıştığı için dış adreslere CORS engeli takılabilir. Lütfen yerel dosya yükleme yöntemini deneyin veya hazır kanallarımızı yükleyin.',
      xtreamMockSuccess: 'Xtream API başarıyla bağlandı! Canlı kanallar içe aktarıldı.',
      successAdd: 'Oynatma listesi başarıyla eklendi!'
    },
    en: {
      title: 'Add Media Source',
      subtitle: 'Configure your M3U playlist or Xtream Codes login credentials',
      tabM3uUrl: 'Add M3U URL',
      tabXtream: 'Xtream Codes API',
      tabFile: 'Local M3U File',
      placeholderName: 'e.g., Home Playlist, Sports Package...',
      fieldName: 'Playlist Title',
      fieldM3uUrl: 'M3U Playlist URL',
      fieldServerUrl: 'Server Address (Server URL)',
      fieldUsername: 'Username',
      fieldPassword: 'Password',
      dragDropText: 'Drag & drop your M3U file or M3U link (http://...) here',
      orText: 'or',
      selectFileBtn: 'Browse Local File',
      addBtn: 'Add Playlist',
      loadingBtn: 'Processing...',
      demoBtn: 'Load Demo Channel List (1-Click)',
      demoDesc: 'Contains 10 popular fully legal, free and working streams such as NASA TV, TRT, euronews, Red Bull TV. Load to test instantly.',
      activePlaylists: 'Your Loaded Playlists',
      channelsCount: 'channels',
      addedAt: 'Added:',
      noPlaylists: 'No active IPTV playlists found. Please configure a source above or load the ready-to-test demo list.',
      invalidFile: 'Please upload a valid .m3u file.',
      parseError: 'Failed to parse M3U file. Format might be corrupted.',
      emptyError: 'Please fill out all required fields.',
      urlFetchError: 'Failed to fetch M3U URL (CORS policy blockage or invalid link). Since this app runs in a browser environment, CORS might block raw requests. Please upload a local file or load the public demo stream list.',
      xtreamMockSuccess: 'Xtream API connected successfully! Live channels imported.',
      successAdd: 'Playlist added successfully!'
    }
  }[language];

  // Auto clean notifications after 5 seconds
  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg(null);
        setSuccessMsg(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, successMsg]);

  // Handle M3U URL addition
  const handleAddM3uUrl = async (e?: React.FormEvent, overrideUrl?: string, overrideName?: string) => {
    if (e) e.preventDefault();
    const urlToUse = overrideUrl || m3uUrl;
    const nameToUse = overrideName || playlistName;
    
    let normalizedUrl = urlToUse.trim();
    if (!normalizedUrl) {
      setErrorMsg(t.emptyError);
      return;
    }

    // Auto prepend http:// if no protocol is given
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'http://' + normalizedUrl;
    }

    // Convert common sharing URLs (Google Drive, Dropbox, GitHub) to direct download links
    normalizedUrl = convertSharingUrl(normalizedUrl);

    setIsProcessing(true);
    setErrorMsg(null);

    // Auto-extract playlist name if empty
    let finalPlaylistName = nameToUse.trim();
    if (!finalPlaylistName) {
      try {
        const urlObj = new URL(normalizedUrl);
        finalPlaylistName = urlObj.hostname;
      } catch (err) {
        finalPlaylistName = 'M3U Playlist';
      }
    }

    try {
      // Fetch via server-side proxy to bypass CORS completely and get REAL playlist channels!
      const proxyUrl = getApiUrl(`/api/m3u/proxy?url=${encodeURIComponent(normalizedUrl)}`, settings.gatewayUrl);
      let response;
      let text = '';
      
      try {
        response = await fetch(proxyUrl);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server status ${response.status}`);
        }
        text = await response.text();
      } catch (proxyErr: any) {
        console.warn('Proxy fetch failed, attempting direct browser fetch as fallback:', proxyErr);
        // Fallback: Direct browser fetch in case the proxy is blocked by provider, but provider allows direct CORS or is locally reachable
        response = await fetch(normalizedUrl);
        if (!response.ok) {
          throw new Error(`Direct fetch status ${response.status} (Proxy error: ${proxyErr.message})`);
        }
        text = await response.text();
      }

      const playlistId = `m3u-${Date.now()}`;
      const parsedChannels = parseM3U(text, playlistId);
      
      if (parsedChannels.length === 0) {
        setErrorMsg(t.parseError);
        setIsProcessing(false);
        return;
      }

      const newPlaylist: IPTVPlaylist = {
        id: playlistId,
        name: finalPlaylistName,
        type: 'm3u',
        url: normalizedUrl,
        itemsCount: parsedChannels.length,
        addedAt: Date.now()
      };

      onAddPlaylist(newPlaylist, parsedChannels);
      setSuccessMsg(`${t.successAdd} (${parsedChannels.length} ${t.channelsCount})`);
      setPlaylistName('');
      setM3uUrl('');
    } catch (err: any) {
      console.error('Proxy fetch failed:', err);
      setErrorMsg(
        language === 'tr' 
          ? `Bağlantı Hatası: IPTV sağlayıcısından liste alınamadı (${err.message}). Sağlayıcınız tarayıcı isteklerini engelliyor olabilir. Lütfen M3U bağlantısını tarayıcınızdan indirip 'Yerel M3U Dosyası' sekmesinden yüklemeyi deneyin.`
          : `Fetch Error: Failed to retrieve playlist from provider (${err.message}). Your provider might block browser queries. Please download the M3U link on your computer and upload via 'Local M3U File'.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Xtream Codes Login
  const handleAddXtream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistName.trim() || !serverUrl.trim() || !username.trim() || !password.trim()) {
      setErrorMsg(t.emptyError);
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Connect to the real server-side Xtream proxy API to fetch channels and authentication details
      const response = await fetch(getApiUrl('/api/xtream/channels', settings.gatewayUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serverUrl,
          username,
          password
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      const newPlaylist: IPTVPlaylist = {
        id: data.playlistId,
        name: playlistName,
        type: 'xtream',
        serverUrl,
        username,
        password,
        itemsCount: data.channels.length,
        addedAt: Date.now()
      };

      onAddPlaylist(newPlaylist, data.channels);
      
      const successText = language === 'tr'
        ? `Xtream Codes API başarıyla bağlandı! ${data.channels.length} canlı kanal ve kategori içe aktarıldı.`
        : `Xtream Codes API connected successfully! ${data.channels.length} live channels and categories imported.`;
        
      setSuccessMsg(successText);
      setPlaylistName('');
      setServerUrl('');
      setUsername('');
      setPassword('');
    } catch (err: any) {
      console.error('Xtream login failed:', err);
      setErrorMsg(
        language === 'tr'
          ? `Bağlantı Hatası: Xtream sunucusuna bağlanılamadı (${err.message}). Lütfen Sunucu Adresi, Kullanıcı Adı ve Şifrenizin doğruluğunu kontrol edin.`
          : `Connection Error: Failed to connect to Xtream server (${err.message}). Please verify Server URL, Username, and Password.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Process M3U File content
  const processM3UFile = (file: File) => {
    if (!file.name.endsWith('.m3u') && !file.name.endsWith('.m3u8') && !file.type.includes('mpegurl')) {
      setErrorMsg(t.invalidFile);
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const finalName = playlistName.trim() || file.name.replace(/\.[^/.]+$/, ""); // Clean extension
      const playlistId = `local-${Date.now()}`;
      
      try {
        const parsedChannels = parseM3U(content, playlistId);
        
        if (parsedChannels.length === 0) {
          setErrorMsg(t.parseError);
          setIsProcessing(false);
          return;
        }

        const newPlaylist: IPTVPlaylist = {
          id: playlistId,
          name: finalName,
          type: 'local',
          itemsCount: parsedChannels.length,
          addedAt: Date.now()
        };

        onAddPlaylist(newPlaylist, parsedChannels);
        setSuccessMsg(`${t.successAdd} (${parsedChannels.length} ${t.channelsCount})`);
        setPlaylistName('');
      } catch (err) {
        setErrorMsg(t.parseError);
      } finally {
        setIsProcessing(false);
      }
    };
    
    reader.onerror = () => {
      setErrorMsg('Dosya okuma hatası.');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  // File Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // 1. Check if a URL link or text was dropped
    const droppedText = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '';
    const trimmedText = droppedText.trim();

    if (trimmedText && (trimmedText.startsWith('http://') || trimmedText.startsWith('https://'))) {
      setActiveTab('m3u-url');
      setM3uUrl(trimmedText);

      // Auto-extract playlist name
      let autoName = '';
      try {
        const urlObj = new URL(trimmedText);
        autoName = urlObj.hostname;
      } catch (err) {
        autoName = 'IPTV Playlist';
      }
      setPlaylistName(autoName);

      const normalizedDroppedUrl = convertSharingUrl(trimmedText);

      // Process immediately
      setIsProcessing(true);
      setErrorMsg(null);

      try {
        const proxyUrl = getApiUrl(`/api/m3u/proxy?url=${encodeURIComponent(normalizedDroppedUrl)}`, settings.gatewayUrl);
        let response;
        let text = '';
        
        try {
          response = await fetch(proxyUrl);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server status ${response.status}`);
          }
          text = await response.text();
        } catch (proxyErr: any) {
          console.warn('Proxy fetch failed on dropped URL, attempting direct browser fetch:', proxyErr);
          response = await fetch(trimmedText);
          if (!response.ok) {
            throw new Error(`Direct fetch status ${response.status} (Proxy error: ${proxyErr.message})`);
          }
          text = await response.text();
        }

        const playlistId = `m3u-${Date.now()}`;
        const parsedChannels = parseM3U(text, playlistId);
        
        if (parsedChannels.length === 0) {
          setErrorMsg(t.parseError);
          setIsProcessing(false);
          return;
        }

        const newPlaylist: IPTVPlaylist = {
          id: playlistId,
          name: autoName,
          type: 'm3u',
          url: trimmedText,
          itemsCount: parsedChannels.length,
          addedAt: Date.now()
        };

        onAddPlaylist(newPlaylist, parsedChannels);
        setSuccessMsg(`${t.successAdd} (${parsedChannels.length} ${t.channelsCount})`);
        setPlaylistName('');
        setM3uUrl('');
      } catch (err: any) {
        console.error('Proxy fetch failed on dropped URL:', err);
        setErrorMsg(
          language === 'tr'
            ? `Bağlantı Hatası: Sürüklenen URL'den liste alınamadı (${err.message}). Lütfen bağlantının doğruluğunu kontrol edin veya dosyayı indirip doğrudan sürükleyin.`
            : `Fetch Error: Failed to retrieve playlist from dropped URL (${err.message}). Please verify the link or download and drag the file.`
        );
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // 2. Default to file drop
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processM3UFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processM3UFile(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div id="playlist-manager-container" className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-white font-sans max-w-7xl mx-auto p-4">
      {/* LEFT FORM SIDE */}
      <div id="playlist-forms-card" className="lg:col-span-7 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 shadow-xl flex flex-col justify-between">
        <div id="playlist-forms-header">
          <div id="playlist-forms-title-row" className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div id="playlist-icon-bg" className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-400">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h2 id="playlist-forms-title" className="text-xl font-semibold tracking-wide">{t.title}</h2>
                <p id="playlist-forms-desc" className="text-xs text-slate-400">{t.subtitle}</p>
              </div>
            </div>
            {onExitToHeader && (
              <button
                id="btn-playlists-back-to-menu"
                tabIndex={0}
                onClick={onExitToHeader}
                className="flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-sky-400 text-sky-400 hover:text-white rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-sky-400 focus:outline-none focus:scale-105"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                <span>{language === 'tr' ? 'ANA MENÜYE DÖN (GERİ)' : 'RETURN TO MAIN MENU'}</span>
              </button>
            )}
          </div>

          {/* Quick Pardus IPTV Setup Box */}
          <div id="quick-pardus-box" className="mt-4 p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg shrink-0 mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-sky-300">Pardus Yerel Sunucu Bağlantısı</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Yerel Pardus sunucunuzdaki <code className="text-sky-400 font-mono text-[11px] bg-slate-950 px-1.5 py-0.5 rounded">http://192.168.1.116:8081/api/epg</code> adresinden oynatma listesini tek tıkla yükleyin.
                </p>
              </div>
            </div>
            <button
              id="btn-quick-pardus-load"
              type="button"
              disabled={isProcessing}
              onClick={() => {
                setPlaylistName('Pardus IPTV');
                setM3uUrl('http://192.168.1.116:8081/api/epg');
                // Automatically trigger the add action after state is updated
                setTimeout(() => {
                  const submitBtn = document.getElementById('btn-submit-m3u');
                  if (submitBtn) {
                    submitBtn.click();
                  }
                }, 100);
              }}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-sky-400 text-slate-950 font-bold rounded-xl text-xs tracking-wide shadow-md shadow-sky-500/10 hover:from-sky-400 hover:to-sky-300 transition-all cursor-pointer whitespace-nowrap focus:ring-2 focus:ring-sky-300 focus:outline-none focus:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? 'Yükleniyor...' : 'Tek Tıkla Kur'}
            </button>
          </div>

          {/* Quick Google Drive IPTV Setup Box */}
          <div id="quick-gdrive-box" className="mt-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-amber-300">Google Drive Oynatma Listesi</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kayıtlı <code className="text-amber-400 font-mono text-[11px] bg-slate-950 px-1.5 py-0.5 rounded">1wLUYl1...Ac</code> Google Drive dosyasından oynatma listenizi tek tıkla yükleyin.
                </p>
              </div>
            </div>
            <button
              id="btn-quick-gdrive-load"
              type="button"
              disabled={isProcessing}
              onClick={() => {
                setActiveTab('m3u-url');
                setPlaylistName('Google Drive IPTV');
                const targetUrl = 'https://docs.google.com/uc?export=download&id=' + GOOGLE_DRIVE_FILE_ID;
                setM3uUrl(targetUrl);
                
                // Directly trigger the download using overrides to prevent race conditions
                handleAddM3uUrl(undefined, targetUrl, 'Google Drive IPTV');
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold rounded-xl text-xs tracking-wide shadow-md shadow-amber-500/10 hover:from-amber-400 hover:to-amber-300 transition-all cursor-pointer whitespace-nowrap focus:ring-2 focus:ring-amber-300 focus:outline-none focus:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? 'Yükleniyor...' : 'Tek Tıkla Kur'}
            </button>
          </div>


          {/* Form tab selector */}
          <div id="playlist-tabs" className="flex bg-slate-950/80 p-1.5 rounded-xl border border-slate-800/60 my-6">
            <button
              id="tab-btn-m3u"
              onClick={() => { setActiveTab('m3u-url'); setErrorMsg(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === 'm3u-url' 
                  ? 'bg-sky-500 text-slate-950 font-semibold shadow-lg shadow-sky-500/15' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Link className="w-4 h-4" />
              <span>{t.tabM3uUrl}</span>
            </button>
            <button
              id="tab-btn-xtream"
              onClick={() => { setActiveTab('xtream'); setErrorMsg(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === 'xtream' 
                  ? 'bg-sky-500 text-slate-950 font-semibold shadow-lg shadow-sky-500/15' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>{t.tabXtream}</span>
            </button>
            <button
              id="tab-btn-file"
              onClick={() => { setActiveTab('file'); setErrorMsg(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === 'file' 
                  ? 'bg-sky-500 text-slate-950 font-semibold shadow-lg shadow-sky-500/15' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>{t.tabFile}</span>
            </button>
          </div>

          {/* Status Messages */}
          {errorMsg && (
            <div id="manager-error-alert" className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-200 p-3.5 rounded-xl text-xs mb-5 animate-fadeIn">
              <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div id="manager-success-alert" className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 p-3.5 rounded-xl text-xs mb-5 animate-fadeIn">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Content */}
          <div id="tab-content" className="space-y-4">
            {/* Playlist Title Field (used in M3U & Xtream, optional in File) */}
            {activeTab !== 'file' && (
              <div id="field-group-name" className="flex flex-col gap-1.5">
                <label id="label-playlist-name" className="text-xs text-slate-400 font-medium">
                  {t.fieldName} {activeTab === 'm3u-url' && `(${language === 'tr' ? 'İsteğe Bağlı' : 'Optional'})`}
                </label>
                <input
                  id="input-playlist-name"
                  type="text"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  placeholder={t.placeholderName}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                />
              </div>
            )}

            {activeTab === 'm3u-url' && (
              <form id="form-m3u" onSubmit={handleAddM3uUrl} className="space-y-4">
                <div id="field-group-url" className="flex flex-col gap-1.5">
                  <label id="label-m3u-url" className="text-xs text-slate-400 font-medium">{t.fieldM3uUrl}</label>
                  <input
                    id="input-m3u-url"
                    type="text"
                    value={m3uUrl}
                    onChange={(e) => setM3uUrl(e.target.value)}
                    placeholder="http://cord-cutter.net:8080/get.php?username=kullanici&password=sifre&type=m3u"
                    className="bg-slate-950 border border-slate-800/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    {language === 'tr' 
                      ? 'IPTV sağlayıcınızın verdiği http:// veya https:// ile başlayan tam M3U / M3U8 bağlantısını buraya yapıştırabilir veya Yerel Dosya sekmesine gidip dosyayı / bağlantıyı doğrudan ekrana sürükleyip bırakabilirsiniz.' 
                      : 'You can paste your complete M3U / M3U8 link starting with http:// or https://, or drag & drop the file/link onto the screen in the Local M3U File tab.'}
                  </span>
                </div>
                <button
                  id="btn-submit-m3u"
                  type="submit"
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-slate-950 py-3 rounded-xl font-semibold text-xs transition-all duration-200 shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? t.loadingBtn : t.addBtn}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {activeTab === 'xtream' && (
              <form id="form-xtream" onSubmit={handleAddXtream} className="space-y-4">
                <div id="field-group-server" className="flex flex-col gap-1.5">
                  <label id="label-server-url" className="text-xs text-slate-400 font-medium">{t.fieldServerUrl}</label>
                  <input
                    id="input-server-url"
                    type="url"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://iptvsunucu.com:8080"
                    className="bg-slate-950 border border-slate-800/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                  />
                </div>

                <div id="field-grid-credentials" className="grid grid-cols-2 gap-4">
                  <div id="field-group-user" className="flex flex-col gap-1.5">
                    <label id="label-username" className="text-xs text-slate-400 font-medium">{t.fieldUsername}</label>
                    <input
                      id="input-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="kullanıcı"
                      className="bg-slate-950 border border-slate-800/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                    />
                  </div>
                  <div id="field-group-pass" className="flex flex-col gap-1.5">
                    <label id="label-password" className="text-xs text-slate-400 font-medium">{t.fieldPassword}</label>
                    <input
                      id="input-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-slate-950 border border-slate-800/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  id="btn-submit-xtream"
                  type="submit"
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-slate-950 py-3 rounded-xl font-semibold text-xs transition-all duration-200 shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? t.loadingBtn : t.addBtn}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {activeTab === 'file' && (
              <div id="dropzone-wrapper" className="space-y-4">
                <div id="field-group-file-title" className="flex flex-col gap-1.5">
                  <label id="label-file-playlist-name" className="text-xs text-slate-400 font-medium">{t.fieldName} ({t.orText} Dosya Adı)</label>
                  <input
                    id="input-file-playlist-name"
                    type="text"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder={t.placeholderName}
                    className="bg-slate-950 border border-slate-800/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                  />
                </div>

                <div
                  id="drag-drop-zone"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                    isDragging 
                      ? 'border-sky-500 bg-sky-500/5' 
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/60'
                  }`}
                  onClick={handleBrowseClick}
                >
                  <UploadCloud className={`w-12 h-12 mb-4 transition-transform duration-200 ${isDragging ? 'scale-110 text-sky-400' : 'text-slate-500'}`} />
                  <p id="drag-drop-prompt" className="text-xs text-slate-300 font-medium mb-1">{t.dragDropText}</p>
                  <p id="drag-drop-hint" className="text-[10px] text-slate-500 mb-3">M3U veya M3U8</p>
                  <p id="drag-drop-or" className="text-xs text-slate-500 mb-3">{t.orText}</p>
                  <button
                    id="btn-browse-file"
                    type="button"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-lg border border-slate-800 text-xs font-semibold tracking-wide transition-colors"
                  >
                    {t.selectFileBtn}
                  </button>
                  <input
                    id="hidden-file-input"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".m3u,.m3u8,application/x-mpegurl"
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DEMO ACCELERATOR BUTTON */}
        <div id="demo-box" className="mt-8 pt-6 border-t border-slate-800/60">
          <div id="demo-banner" className="bg-gradient-to-r from-sky-500/5 to-emerald-500/5 border border-sky-500/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div id="demo-details" className="max-w-md">
              <div id="demo-badge" className="flex items-center gap-1.5 text-sky-400 font-bold text-[10px] tracking-widest uppercase mb-1">
                <Disc className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                <span>HIZLI BAŞLANGIÇ (FAST START)</span>
              </div>
              <p id="demo-desc" className="text-[11px] text-slate-400 leading-relaxed">
                {t.demoDesc}
              </p>
            </div>
            <button
              id="btn-load-demo"
              onClick={onLoadDemoPlaylist}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs tracking-wide transition-colors shadow-lg shadow-emerald-500/10 shrink-0 cursor-pointer"
            >
              {t.demoBtn}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE LIST */}
      <div id="playlist-list-card" className="lg:col-span-5 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 shadow-xl flex flex-col">
        <h2 id="playlist-list-title" className="text-lg font-semibold tracking-wide text-slate-200 mb-1">{t.activePlaylists}</h2>
        <p id="playlist-list-count" className="text-xs text-slate-500 mb-6">{playlists.length} toplam kaynak eklendi</p>

        {playlists.length === 0 ? (
          <div id="playlist-empty" className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-slate-850 border-dashed rounded-xl bg-slate-950/20">
            <FileVideo className="w-12 h-12 text-slate-700 mb-4 stroke-[1.5]" />
            <p id="playlist-empty-text" className="text-xs text-slate-400 leading-relaxed max-w-xs">{t.noPlaylists}</p>
          </div>
        ) : (
          <div id="playlist-items-list" className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
            {playlists.map((pl) => (
              <div
                id={`playlist-item-${pl.id}`}
                key={pl.id}
                onClick={() => onSelectPlaylist(pl.id)}
                className="group flex items-center justify-between p-4 bg-slate-950/70 hover:bg-slate-950/90 rounded-xl border border-slate-850 hover:border-sky-500/30 cursor-pointer transition-all duration-200"
              >
                <div id={`playlist-item-left-${pl.id}`} className="flex items-center gap-3.5">
                  <div id={`playlist-item-type-bg-${pl.id}`} className="p-2.5 bg-slate-900 rounded-lg group-hover:bg-slate-850 transition-colors text-sky-400">
                    {pl.type === 'xtream' ? <Database className="w-4.5 h-4.5" /> : <FileVideo className="w-4.5 h-4.5" />}
                  </div>
                  <div>
                    <h4 id={`playlist-item-name-${pl.id}`} className="text-xs font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">{pl.name}</h4>
                    <div id={`playlist-item-stats-${pl.id}`} className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <span>{pl.itemsCount} {t.channelsCount}</span>
                      <span>•</span>
                      <span>{t.addedAt} {new Date(pl.addedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <button
                  id={`playlist-item-delete-btn-${pl.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePlaylist(pl.id);
                  }}
                  className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all duration-200 opacity-60 group-hover:opacity-100"
                  title="Sil"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
