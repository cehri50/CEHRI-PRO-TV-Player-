/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Globe, ArrowLeft, ArrowRight, RotateCw, Shield, HelpCircle, 
  ExternalLink, Laptop, Tv, Smartphone, RefreshCw, Layers 
} from 'lucide-react';
import { IPTVAppSettings } from '../types';

interface PortalWebViewProps {
  settings: IPTVAppSettings;
  language: 'tr' | 'en';
  onExitToHeader?: () => void;
}

interface WebPreset {
  name: string;
  url: string;
  descTr: string;
  descEn: string;
}

export default function PortalWebView({ settings, language, onExitToHeader }: PortalWebViewProps) {
  const [urlInput, setUrlInput] = useState('https://archive.org/details/nasa-tv');

  React.useEffect(() => {
    const handleLocalBack = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        onExitToHeader?.();
      }
    };
    window.addEventListener('keydown', handleLocalBack);
    return () => window.removeEventListener('keydown', handleLocalBack);
  }, [onExitToHeader]);
  const [currentUrl, setCurrentUrl] = useState('https://archive.org/details/nasa-tv');
  const [customUA, setCustomUA] = useState(settings.userAgent || 'Mozilla/5.0 (Linux; Android 10; SmartTV) ExoPlayer/2.18');
  const [uaPreset, setUaPreset] = useState<'tv' | 'desktop' | 'mobile'>('tv');
  const [iframeError, setIframeError] = useState(false);

  const presets: WebPreset[] = [
    { 
      name: 'NASA TV Portal', 
      url: 'https://archive.org/details/nasa-tv', 
      descTr: 'NASA canlı yayınları, uzay arşivleri ve belgesel portalı.',
      descEn: 'NASA live broadcasts, space archives and documentary portal.' 
    },
    { 
      name: 'TRT Haber Web', 
      url: 'https://www.trthaber.com', 
      descTr: 'TRT Haber canlı takip ve güncel gelişmeler sayfası.',
      descEn: 'TRT Haber live coverage and news feed portal.' 
    },
    { 
      name: 'Euronews Live Portal', 
      url: 'https://www.euronews.com/live', 
      descTr: 'Euronews Avrupa ve dünya gündemi canlı video haber portalı.',
      descEn: 'Euronews live video news portal for global perspective.' 
    },
    { 
      name: 'IPTV Player Web Tool', 
      url: 'https://www.hlsplayer.net', 
      descTr: 'HLS (.m3u8) akışlarını doğrudan test etmek için web çözücü.',
      descEn: 'Web player to directly test raw HLS stream links.' 
    }
  ];

  const t = {
    tr: {
      title: 'Yerleşik Web Portal / WebView',
      subtitle: 'IPTV sağlayıcı arayüzlerini, Xtream Web Player portallarını ve harici yayıncı web sitelerini görüntüleyin.',
      addressPlaceholder: 'HTTPS URL adresi girin (örn: https://...)',
      go: 'Bağlan',
      uaTitle: 'Kullanıcı Aracısı (User-Agent)',
      uaDesc: 'WebView portalına kendinizi TV, Masaüstü veya Mobil tarayıcı olarak tanıtın.',
      uaTv: 'Smart TV (ExoPlayer v2.18)',
      uaDesktop: 'Masaüstü (Chrome 110)',
      uaMobile: 'Mobil (Safari iOS)',
      iframeWarningTitle: 'Iframe Güvenlik & CORS Politikası Koruması',
      iframeWarningDesc: 'Harici web siteleri güvenlik nedeniyle (X-Frame-Options) iframe içinde gösterilmeyi engelleyebilir. Bu durumda yeni sekmede açmak için butonu kullanabilirsiniz.',
      openExternal: 'Dışarıda Aç',
      quickPresets: 'Hazır Portal Sayfaları',
      webPreview: 'Canlı Web Portalı Önizleme Ekranı',
      browserError: 'Portal yüklenirken sorun çıkarsa, akış adresini kopyalayıp Kaynak Ekle sekmelerinden listenize ekleyebilirsiniz.'
    },
    en: {
      title: 'Built-in Web Portal / WebView',
      subtitle: 'Render IPTV provider interfaces, Xtream Web Players and streaming dashboards inside the app.',
      addressPlaceholder: 'Enter HTTPS URL (e.g. https://...)',
      go: 'Navigate',
      uaTitle: 'User-Agent Selector',
      uaDesc: 'Identify this WebView connection profile to portals as a Smart TV, Desktop or Mobile client.',
      uaTv: 'Smart TV (ExoPlayer v2.18)',
      uaDesktop: 'Desktop (Chrome 110)',
      uaMobile: 'Mobile (Safari iOS)',
      iframeWarningTitle: 'Iframe Security & CORS Policy Guard',
      iframeWarningDesc: 'Certain external portals block rendering inside custom sandboxes (X-Frame-Options). In those instances, you may open the page in an external tab.',
      openExternal: 'Open External Tab',
      quickPresets: 'Quick Portal Presets',
      webPreview: 'Live Portal WebView Frame',
      browserError: 'If the portal fails to load, you can always extract the live stream URL and add it in the Source tab.'
    }
  }[language];

  const applyUa = (preset: 'tv' | 'desktop' | 'mobile') => {
    setUaPreset(preset);
    if (preset === 'tv') {
      setCustomUA('Mozilla/5.0 (Linux; Android 10; SmartTV) ExoPlayer/2.18');
    } else if (preset === 'desktop') {
      setCustomUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/110.0.0.0 Safari/537.36');
    } else {
      setCustomUA('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148');
    }
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = urlInput.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }
    setUrlInput(target);
    setCurrentUrl(target);
    setIframeError(false);
  };

  const loadPreset = (url: string) => {
    setUrlInput(url);
    setCurrentUrl(url);
    setIframeError(false);
  };

  return (
    <div id="webview-root" className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[660px] overflow-hidden text-white font-sans animate-fadeIn">
      
      {/* LEFT NAVIGATION & CONTROLS (5 cols) */}
      <div id="webview-controls-card" className="lg:col-span-4 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between h-full overflow-y-auto space-y-4">
        
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-850 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">{t.title}</h2>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{t.subtitle}</p>
              </div>
            </div>
            {onExitToHeader && (
              <button
                id="btn-portal-back-to-menu"
                tabIndex={0}
                onClick={onExitToHeader}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-sky-400 text-sky-400 hover:text-white rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-sky-400 focus:outline-none focus:scale-105"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                <span>{language === 'tr' ? 'GERİ' : 'BACK'}</span>
              </button>
            )}
          </div>

          {/* Search Bar / Navigate */}
          <form onSubmit={handleNavigate} className="flex gap-2">
            <input
              id="webview-url-input"
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={t.addressPlaceholder}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            />
            <button
              id="btn-webview-go"
              type="submit"
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              {t.go}
            </button>
          </form>

          {/* User-Agent Switcher */}
          <div className="bg-slate-950/40 border border-slate-850/60 p-3.5 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-sky-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">{t.uaTitle}</span>
            </div>
            <p className="text-[9px] text-slate-500 leading-relaxed">{t.uaDesc}</p>
            
            <div className="grid grid-cols-3 gap-1.5">
              <button
                id="btn-ua-tv"
                type="button"
                onClick={() => applyUa('tv')}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-[9px] font-bold cursor-pointer transition-all ${
                  uaPreset === 'tv' ? 'bg-sky-500/10 border-sky-500 text-sky-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Tv className="w-3.5 h-3.5 mb-1" />
                <span>TV</span>
              </button>
              <button
                id="btn-ua-desktop"
                type="button"
                onClick={() => applyUa('desktop')}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-[9px] font-bold cursor-pointer transition-all ${
                  uaPreset === 'desktop' ? 'bg-sky-500/10 border-sky-500 text-sky-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 mb-1" />
                <span>PC</span>
              </button>
              <button
                id="btn-ua-mobile"
                type="button"
                onClick={() => applyUa('mobile')}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-[9px] font-bold cursor-pointer transition-all ${
                  uaPreset === 'mobile' ? 'bg-sky-500/10 border-sky-500 text-sky-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 mb-1" />
                <span>Phone</span>
              </button>
            </div>

            <textarea
              id="webview-ua-output"
              value={customUA}
              onChange={(e) => setCustomUA(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-[9px] text-slate-400 font-mono focus:outline-none focus:border-slate-700 h-14 resize-none leading-relaxed"
            />
          </div>

          {/* Quick presets */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.quickPresets}</span>
            </h3>
            <div className="space-y-1.5">
              {presets.map((preset, i) => (
                <button
                  id={`btn-webpreset-${i}`}
                  key={i}
                  onClick={() => loadPreset(preset.url)}
                  className={`w-full p-2.5 rounded-lg border text-left cursor-pointer transition-all flex flex-col ${
                    currentUrl === preset.url 
                      ? 'border-sky-500 bg-sky-500/5' 
                      : 'border-slate-850/60 bg-slate-950/20 hover:bg-slate-900/60'
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-200">{preset.name}</span>
                  <span className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{language === 'tr' ? preset.descTr : preset.descEn}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info/Warning Panel */}
        <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>{t.iframeWarningTitle}</span>
          </div>
          <p className="text-[9px] text-slate-500 leading-relaxed">{t.iframeWarningDesc}</p>
          <a
            id="btn-webview-external"
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center justify-center gap-1 bg-slate-950 hover:bg-slate-900 border border-slate-850 p-2 rounded text-[9px] text-slate-300 font-bold transition-all cursor-pointer"
          >
            <span>{t.openExternal}</span>
            <ExternalLink className="w-3 h-3 text-sky-400" />
          </a>
        </div>

      </div>

      {/* RIGHT PREVIEW SCREEN (8 cols) */}
      <div id="webview-iframe-panel" className="lg:col-span-8 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl relative">
        {/* Iframe Toolbar header */}
        <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-850 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            <span className="ml-2 font-semibold text-slate-300 truncate max-w-[240px]">{currentUrl}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded font-bold font-sans">
              HTTPS SECURE
            </span>
            <button
              id="btn-webview-reload"
              onClick={() => {
                // Refresh iframe
                const frame = document.getElementById('portal-webview-frame') as HTMLIFrameElement;
                if (frame) frame.src = currentUrl;
              }}
              className="p-1 hover:bg-slate-800 rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
            </button>
          </div>
        </div>

        {/* WebView Frame */}
        <div className="flex-1 bg-slate-950 relative flex items-center justify-center">
          <iframe
            id="portal-webview-frame"
            src={currentUrl}
            title="IPTV Portal WebView"
            referrerPolicy="no-referrer"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            className="absolute inset-0 w-full h-full border-0 bg-white"
            onError={() => setIframeError(true)}
          />

          {/* Secondary fallback/overlay help text */}
          <div className="absolute bottom-4 left-4 right-4 bg-slate-950/90 backdrop-blur-md p-3 rounded-xl border border-slate-850 flex items-center gap-3 text-[10px] pointer-events-auto z-10 text-slate-400">
            <HelpCircle className="w-4 h-4 text-sky-400 shrink-0" />
            <p className="leading-relaxed">
              {t.browserError}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
