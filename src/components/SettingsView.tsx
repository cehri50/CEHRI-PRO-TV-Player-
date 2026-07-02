/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Settings, Languages, Palette, Disc, Shield, Trash2, CheckCircle2,
  Cpu, Keyboard, ArrowRight, Tv, HelpCircle, HardDrive, Zap, History, Globe, Sliders, Bookmark, X
} from 'lucide-react';
import { IPTVAppSettings, IPTVTheme, IPTVBufferSize, IPTVLanguage } from '../types';

interface SettingsViewProps {
  settings: IPTVAppSettings;
  onUpdateSettings: (settings: IPTVAppSettings) => void;
  onClearHistory: () => void;
  onClearFavorites: () => void;
  onClearAllPlaylists: () => void;
  crashLogs?: any[];
  onClearCrashLogs?: () => void;
  language: 'tr' | 'en';
  onExitToHeader?: () => void;
}

export default function SettingsView({
  settings,
  onUpdateSettings,
  onClearHistory,
  onClearFavorites,
  onClearAllPlaylists,
  crashLogs = [],
  onClearCrashLogs,
  language,
  onExitToHeader
}: SettingsViewProps) {
  const [successNotif, setSuccessNotif] = React.useState<string | null>(null);
  const [showFeatures, setShowFeatures] = React.useState(false);

  React.useEffect(() => {
    const handleLocalBack = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        if (showFeatures) {
          setShowFeatures(false);
        } else {
          onExitToHeader?.();
        }
      }
    };
    window.addEventListener('keydown', handleLocalBack);
    return () => window.removeEventListener('keydown', handleLocalBack);
  }, [onExitToHeader, showFeatures]);

  const t = {
    tr: {
      title: 'Sistem Ayarları',
      subtitle: 'Nexus IPTV deneyiminizi ve donanım ayarlarınızı özelleştirin',
      langTitle: 'Uygulama Dili',
      langDesc: 'Menü ve kılavuzların gösterim dili',
      themeTitle: 'Arayüz Teması',
      themeDesc: 'TV ekranına uygun renk şeması',
      bufferTitle: 'Arabellek Boyutu (Buffer)',
      bufferDesc: 'Bağlantı hızınıza göre yayın yükleme süresi',
      hardwareTitle: 'Donanımsal Hızlandırma',
      hardwareDesc: 'Cihaz işlemcisini (GPU) kullanarak akıcı video çözme',
      autoPlayTitle: 'Son Kanaldan Başlat',
      autoPlayDesc: 'Uygulama açıldığında en son izlenen kanalı otomatik aç',
      aspectRatioTitle: 'Varsayılan Ekran Formatı',
      aspectRatioDesc: 'Video oynatıcı varsayılan en-boy oranı',
      dangerTitle: 'Veri Yönetimi & Temizlik',
      dangerDesc: 'Kayıtlı verileri ve geçmişi tamamen sıfırlayın',
      clearHistory: 'İzleme Geçmişini Sil',
      clearFavs: 'Favorileri Sıfırla',
      clearPlaylists: 'Tüm Listeleri Temizle',
      actionSuccess: 'Değişiklikler başarıyla uygulandı.',
      infoTitle: 'TV Box Sürücü Bilgisi',
      infoText: 'Nexus IPTV, Android TV Box, Firestick ve Android 8.0+ televizyonlar için özel olarak optimize edilmiştir. ExoPlayer v2.18 kod çözücü motoru aktiftir.',
      hwEnabled: 'Donanım kod çözücü devrede (ExoPlayer HW).',
      bufferLow: 'Düşük (2s) - Hızlı kanal geçişi, yüksek fiber internet için',
      bufferMedium: 'Orta (6s) - Önerilen dengeli arabellek',
      bufferHigh: 'Yüksek (15s) - Yavaş veya kesintili internet bağlantıları için',
      keyboardShortcuts: 'Kumanda Kısayolları Kılavuzu',
      scUp: 'Yukarı Arrow / Up',
      scUpDesc: 'Kanal listesinde yukarı / İzleme esnasında sonraki kanal (Zapping)',
      scDown: 'Aşağı Arrow / Down',
      scDownDesc: 'Kanal listesinde aşağı / İzleme esnasında önceki kanal (Zapping)',
      scLeft: 'Sol Arrow / Left',
      scLeftDesc: 'Sol sekmeye geçiş / İzleme esnasında sesi kısma',
      scRight: 'Sağ Arrow / Right',
      scRightDesc: 'Kanal listesine geçiş / İzleme esnasında sesi açma',
      scEnter: 'Enter / OK Tuşu',
      scEnterDesc: 'Seçili ögeyi onaylama / Video arayüzünü gösterme',
      scBack: 'Geri / Backspace',
      scBackDesc: 'Önceki menüye dönme / Tam ekrandan çıkma',
      engineTitle: 'Oynatıcı Motoru (Player Engine)',
      engineDesc: 'Video çözümü için varsayılan sistem kütüphanesi',
      leanbackTitle: 'Android TV Leanback Arayüzü',
      leanbackDesc: 'Cihaz başlatıcısı entegrasyonu ve tavsiye kanalları',
      recommendations: 'Kanal Tavsiyelerini Göster',
      banner: 'Ana Ekran Önerilen Kanallar',
      debugLogs: 'Sistem Hata Kayıtları (Crash Logs)',
      debugLogsDesc: 'Video oynatıcı kod çözücü ve ağ bağlantı hataları dökümü',
      clearLogs: 'Hata Günlüklerini Temizle',
      noLogs: 'Kayıtlı sistem hatası bulunamadı.',
      gatewayTitle: 'IPTV Ağ Geçidi Sunucusu',
      gatewayDesc: 'TV Box / Android WebView üzerinde CORS engellerini aşmak ve listelerinizi indirmek için kullanılan proxy sunucu adresi',
      streamProxyTitle: 'Canlı Yayın Akış Proxy\'si',
      streamProxyDesc: 'HTTP formatındaki canlı yayın akışlarını (.ts / .m3u8) tarayıcı veya Android WebView CORS/Mixed-Content engellerini aşarak oynatır'
    },
    en: {
      title: 'System Settings',
      subtitle: 'Customize your Nexus IPTV performance and hardware options',
      langTitle: 'Application Language',
      langDesc: 'Language for menus and screen layouts',
      themeTitle: 'Interface Theme',
      themeDesc: 'Visual color style tailored for big TV screens',
      bufferTitle: 'Stream Buffer Size',
      bufferDesc: 'Load time before play, based on internet stability',
      hardwareTitle: 'Hardware Acceleration',
      hardwareDesc: 'Enables GPU hardware-assisted video decoding',
      autoPlayTitle: 'Auto-play Last Channel',
      autoPlayDesc: 'Automatically play the last watched channel on startup',
      aspectRatioTitle: 'Default Aspect Ratio',
      aspectRatioDesc: 'Default sizing format inside the video player',
      dangerTitle: 'Data Management & Reset',
      dangerDesc: 'Wipe loaded playlists, favorite lists and watch logs',
      clearHistory: 'Wipe Play History',
      clearFavs: 'Clear All Favorites',
      clearPlaylists: 'Delete All Playlists',
      actionSuccess: 'Changes applied successfully.',
      infoTitle: 'TV Box Engine Information',
      infoText: 'Nexus IPTV is custom-engineered for Android TV Boxes, Firesticks and Smart TVs running Android 8.0+. Integrated ExoPlayer v2.18 decoder is active.',
      hwEnabled: 'Hardware decoder active (ExoPlayer HW).',
      bufferLow: 'Low (2s) - Ultra-fast channel zapping, for high speed fiber',
      bufferMedium: 'Medium (6s) - Default balanced streaming experience',
      bufferHigh: 'High (15s) - For slow or unstable internet connections',
      keyboardShortcuts: 'Remote Controller Shortcut Keys',
      scUp: 'Arrow Up',
      scUpDesc: 'Navigate up / Channel Zapping (Next) during playback',
      scDown: 'Arrow Down',
      scDownDesc: 'Navigate down / Channel Zapping (Prev) during playback',
      scLeft: 'Arrow Left',
      scLeftDesc: 'Jump to left menus / Volume decrease during playback',
      scRight: 'Arrow Right',
      scRightDesc: 'Jump to channels / Volume increase during playback',
      scEnter: 'Enter / OK Key',
      scEnterDesc: 'Confirm selection / Trigger video player OSD overlay',
      scBack: 'Backspace / Back',
      scBackDesc: 'Return to previous screen / Exit fullscreen mode',
      engineTitle: 'Decoder Player Engine',
      engineDesc: 'Primary system library selected for video decoding',
      leanbackTitle: 'Android TV Leanback Features',
      leanbackDesc: 'Device launcher suggestions and recommendation channels',
      recommendations: 'Enable Recommendations',
      banner: 'Show Home Recommendations Banner',
      debugLogs: 'Decoder Crash Logs & Debug Logs',
      debugLogsDesc: 'Live readout of audio, video and connection buffer errors',
      clearLogs: 'Wipe Crash Logs',
      noLogs: 'No hardware decoder exceptions found.',
      gatewayTitle: 'IPTV Gateway Server',
      gatewayDesc: 'Proxy gateway server address used to bypass CORS restrictions and download M3U playlists on Webview/TV Box',
      streamProxyTitle: 'Live Stream Proxy',
      streamProxyDesc: 'Bypass CORS & Mixed Content restrictions in browser or Android WebView by routing live streams (.ts / .m3u8) through the gateway'
    }
  }[language];

  const updateLang = (lang: IPTVLanguage) => {
    onUpdateSettings({ ...settings, language: lang });
    triggerSuccess();
  };

  const updateTheme = (theme: IPTVTheme) => {
    onUpdateSettings({ ...settings, theme });
    triggerSuccess();
  };

  const updateBuffer = (size: IPTVBufferSize) => {
    onUpdateSettings({ ...settings, bufferSize: size });
    triggerSuccess();
  };

  const updateAspect = (aspect: 'auto' | '16-9' | '4-3' | 'stretch' | 'zoom') => {
    onUpdateSettings({ ...settings, aspectRatio: aspect });
    triggerSuccess();
  };

  const toggleHW = () => {
    onUpdateSettings({ ...settings, hardwareAcceleration: !settings.hardwareAcceleration });
    triggerSuccess();
  };

  const toggleAutoPlay = () => {
    onUpdateSettings({ ...settings, autoPlayLast: !settings.autoPlayLast });
    triggerSuccess();
  };

  const triggerSuccess = () => {
    setSuccessNotif(t.actionSuccess);
    setTimeout(() => {
      setSuccessNotif(null);
    }, 4000);
  };

  const themes: { id: IPTVTheme; name: string; bg: string; text: string; accent: string }[] = [
    { id: 'classic-dark', name: language === 'tr' ? 'Klasik Siyah' : 'Classic Slate', bg: 'bg-slate-950', text: 'text-slate-100', accent: 'bg-sky-500' },
    { id: 'tivimate-teal', name: 'Tivimate Teal', bg: 'bg-teal-950', text: 'text-teal-100', accent: 'bg-teal-400' },
    { id: 'netflix-red', name: 'Netflix Red', bg: 'bg-neutral-950', text: 'text-neutral-100', accent: 'bg-red-600' },
    { id: 'golden-royal', name: language === 'tr' ? 'Kraliyet Altını' : 'Golden Royal', bg: 'bg-stone-950', text: 'text-stone-100', accent: 'bg-amber-500' }
  ];

  return (
    <div id="settings-root" className="max-w-7xl mx-auto p-4 text-white font-sans grid grid-cols-1 lg:grid-cols-12 gap-8 h-[640px] overflow-hidden">
      
      {/* LEFT FORM FIELDS (7 cols) */}
      <div id="settings-fields-card" className="lg:col-span-8 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 flex flex-col h-full overflow-y-auto space-y-6">
        
        {/* Header */}
        <div id="settings-header" className="flex items-center justify-between border-b border-slate-850 pb-4 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div id="settings-title-icon-bg" className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-400">
              <Settings className="w-6 h-6 animate-none" />
            </div>
            <div>
              <h2 id="settings-title" className="text-xl font-semibold tracking-wide">{t.title}</h2>
              <p id="settings-subtitle" className="text-xs text-slate-400">{t.subtitle}</p>
            </div>
          </div>
          {onExitToHeader && (
            <button
              id="btn-settings-back-to-menu"
              tabIndex={0}
              onClick={onExitToHeader}
              className="flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-sky-400 text-sky-400 hover:text-white rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-sky-400 focus:outline-none focus:scale-105"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              <span>{language === 'tr' ? 'ANA MENÜYE DÖN (GERİ)' : 'RETURN TO MAIN MENU'}</span>
            </button>
          )}
        </div>

        {/* Success Alert */}
        {successNotif && (
          <div id="settings-success-alert" className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 p-3.5 rounded-xl text-xs animate-fadeIn">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
            <span>{successNotif}</span>
          </div>
        )}

        {/* Language Selection */}
        <div id="setting-section-lang" className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl">
          <div id="setting-lang-meta" className="md:col-span-1">
            <h3 id="setting-lang-title" className="text-xs font-semibold flex items-center gap-2 text-slate-200">
              <Languages className="w-4.5 h-4.5 text-sky-400" />
              <span>{t.langTitle}</span>
            </h3>
            <p id="setting-lang-desc" className="text-[10px] text-slate-500 mt-1">{t.langDesc}</p>
          </div>
          <div id="setting-lang-options" className="md:col-span-2 flex gap-3">
            <button
              id="btn-lang-tr"
              onClick={() => updateLang('tr')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                settings.language === 'tr' 
                  ? 'bg-sky-500 border-sky-500 text-slate-950 shadow-lg shadow-sky-500/10' 
                  : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Türkçe
            </button>
            <button
              id="btn-lang-en"
              onClick={() => updateLang('en')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                settings.language === 'en' 
                  ? 'bg-sky-500 border-sky-500 text-slate-950 shadow-lg shadow-sky-500/10' 
                  : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Theme Selection */}
        <div id="setting-section-theme" className="bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl space-y-3">
          <div id="setting-theme-meta">
            <h3 id="setting-theme-title" className="text-xs font-semibold flex items-center gap-2 text-slate-200">
              <Palette className="w-4.5 h-4.5 text-sky-400" />
              <span>{t.themeTitle}</span>
            </h3>
            <p id="setting-theme-desc" className="text-[10px] text-slate-500 mt-1">{t.themeDesc}</p>
          </div>
          <div id="setting-theme-options" className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {themes.map((th) => {
              const isSelected = settings.theme === th.id;
              return (
                <button
                  id={`btn-theme-${th.id}`}
                  key={th.id}
                  onClick={() => updateTheme(th.id)}
                  className={`flex flex-col items-center p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-sky-500 bg-sky-500/5 ring-1 ring-sky-500' 
                      : 'border-slate-850 bg-slate-900/60 hover:bg-slate-850 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full ${th.accent} mb-2 shadow`} />
                  <span className="font-semibold text-[11px] truncate w-full text-center">{th.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Buffer Size Configuration */}
        <div id="setting-section-buffer" className="bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl space-y-3">
          <div id="setting-buffer-meta">
            <h3 id="setting-buffer-title" className="text-xs font-semibold flex items-center gap-2 text-slate-200">
              <Disc className="w-4.5 h-4.5 text-sky-400" />
              <span>{t.bufferTitle}</span>
            </h3>
            <p id="setting-buffer-desc" className="text-[10px] text-slate-500 mt-1">{t.bufferDesc}</p>
          </div>
          <div id="setting-buffer-options" className="flex flex-col gap-2.5">
            {[
              { id: 'low' as IPTVBufferSize, label: 'Low (2s)', detail: t.bufferLow },
              { id: 'medium' as IPTVBufferSize, label: 'Medium (6s)', detail: t.bufferMedium },
              { id: 'high' as IPTVBufferSize, label: 'High (15s)', detail: t.bufferHigh }
            ].map((buf) => {
              const isSelected = settings.bufferSize === buf.id;
              return (
                <button
                  id={`btn-buffer-${buf.id}`}
                  key={buf.id}
                  onClick={() => updateBuffer(buf.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-sky-500 bg-sky-500/5 text-sky-400 font-semibold' 
                      : 'border-slate-850 bg-slate-900/60 hover:bg-slate-850 text-slate-400'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-sky-400' : 'border-slate-600'}`}>
                    {isSelected && <div className="w-2 h-2 bg-sky-400 rounded-full" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{buf.label}</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">{buf.detail}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggles: HW Acceleration & AutoPlay */}
        <div id="setting-section-toggles" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* HW Dec */}
          <div id="setting-hw-card" className="bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl flex items-center justify-between">
            <div id="setting-hw-meta" className="pr-4">
              <h3 id="setting-hw-title" className="text-xs font-semibold flex items-center gap-2 text-slate-200">
                <Cpu className="w-4.5 h-4.5 text-sky-400" />
                <span>{t.hardwareTitle}</span>
              </h3>
              <p id="setting-hw-desc" className="text-[9px] text-slate-500 mt-1">{t.hardwareDesc}</p>
            </div>
            <button
              id="btn-toggle-hw"
              onClick={toggleHW}
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${settings.hardwareAcceleration ? 'bg-sky-500' : 'bg-slate-800'}`}
            >
              <div className={`bg-slate-950 w-4 h-4 rounded-full transition-transform ${settings.hardwareAcceleration ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Auto Play */}
          <div id="setting-autoplay-card" className="bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl flex items-center justify-between">
            <div id="setting-autoplay-meta" className="pr-4">
              <h3 id="setting-autoplay-title" className="text-xs font-semibold flex items-center gap-2 text-slate-200">
                <Tv className="w-4.5 h-4.5 text-sky-400" />
                <span>{t.autoPlayTitle}</span>
              </h3>
              <p id="setting-autoplay-desc" className="text-[9px] text-slate-500 mt-1">{t.autoPlayDesc}</p>
            </div>
            <button
              id="btn-toggle-autoplay"
              onClick={toggleAutoPlay}
              className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${settings.autoPlayLast ? 'bg-sky-500' : 'bg-slate-800'}`}
            >
              <div className={`bg-slate-950 w-4 h-4 rounded-full transition-transform ${settings.autoPlayLast ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Default Aspect Ratio */}
        <div id="setting-section-aspect" className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl">
          <div id="setting-aspect-meta" className="md:col-span-1">
            <h3 id="setting-aspect-title" className="text-xs font-semibold flex items-center gap-2 text-slate-200">
              <HardDrive className="w-4.5 h-4.5 text-sky-400" />
              <span>{t.aspectRatioTitle}</span>
            </h3>
            <p id="setting-aspect-desc" className="text-[10px] text-slate-500 mt-1">{t.aspectRatioDesc}</p>
          </div>
          <div id="setting-aspect-options" className="md:col-span-2 flex flex-wrap gap-2">
            {['auto', '16-9', '4-3', 'stretch', 'zoom'].map((aspect) => (
              <button
                id={`btn-aspect-choice-${aspect}`}
                key={aspect}
                onClick={() => updateAspect(aspect as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide border cursor-pointer uppercase font-mono ${
                  settings.aspectRatio === aspect
                    ? 'bg-sky-500 border-sky-500 text-slate-950'
                    : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400'
                }`}
              >
                {aspect}
              </button>
            ))}
          </div>
        </div>

        {/* Playback Engine Selection */}
        <div id="setting-section-engine" className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl animate-fadeIn">
          <div id="setting-engine-meta" className="md:col-span-1">
            <h3 id="setting-engine-title" className="text-xs font-semibold flex items-center gap-2 text-slate-200">
              <Cpu className="w-4.5 h-4.5 text-sky-400" />
              <span>{t.engineTitle}</span>
            </h3>
            <p id="setting-engine-desc" className="text-[10px] text-slate-500 mt-1">{t.engineDesc}</p>
          </div>
          <div id="setting-engine-options" className="md:col-span-2 flex flex-col sm:flex-row gap-2">
            {[
              { id: 'exoplayer', label: 'ExoPlayer (HW)' },
              { id: 'media3', label: 'Android Media3' },
              { id: 'vlc', label: 'VLC Player Core' }
            ].map((eng) => (
              <button
                id={`btn-engine-choice-${eng.id}`}
                key={eng.id}
                onClick={() => {
                  onUpdateSettings({ ...settings, playerEngine: eng.id as any });
                  triggerSuccess();
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  (settings.playerEngine || 'exoplayer') === eng.id
                    ? 'bg-sky-500 border-sky-500 text-slate-950 shadow-lg shadow-sky-500/10'
                    : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400'
                }`}
              >
                {eng.label}
              </button>
            ))}
          </div>
        </div>

        {/* IPTV Gateway Server URL configuration */}
        <div id="setting-section-gateway" className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl animate-fadeIn">
          <div id="setting-gateway-meta" className="md:col-span-1">
            <h3 id="setting-gateway-title" className="text-xs font-semibold flex items-center gap-2 text-slate-200">
              <Cpu className="w-4.5 h-4.5 text-sky-400" />
              <span>{t.gatewayTitle}</span>
            </h3>
            <p id="setting-gateway-desc" className="text-[10px] text-slate-500 mt-1">{t.gatewayDesc}</p>
          </div>
          <div id="setting-gateway-options" className="md:col-span-2 flex flex-col sm:flex-row gap-2.5">
            <input
              id="input-gateway-url"
              type="text"
              value={settings.gatewayUrl || ''}
              onChange={(e) => {
                onUpdateSettings({ ...settings, gatewayUrl: e.target.value });
              }}
              placeholder="https://your-proxy-domain.com"
              className="flex-1 bg-slate-900 border border-slate-850 hover:border-slate-800 focus:border-sky-500 rounded-lg px-3.5 py-2.5 text-xs font-mono text-slate-200 focus:outline-none transition-all duration-200"
            />
            <button
              id="btn-reset-gateway"
              onClick={() => {
                onUpdateSettings({ ...settings, gatewayUrl: 'https://cehri50-iptv-proxy-production.up.railway.app' });
                triggerSuccess();
              }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 rounded-lg text-xs font-semibold border border-slate-850 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer shrink-0"
            >
              {language === 'tr' ? 'Varsayılana Sıfırla' : 'Reset to Default'}
            </button>
          </div>
        </div>

        {/* CORS-Bypass Streaming Proxy */}
        <div id="setting-section-stream-proxy" className="bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl flex items-center justify-between animate-fadeIn">
          <div id="setting-stream-proxy-meta" className="pr-4">
            <h3 id="setting-stream-proxy-title" className="text-xs font-semibold flex items-center gap-2 text-slate-200">
              <Shield className="w-4.5 h-4.5 text-sky-400" />
              <span>{t.streamProxyTitle}</span>
            </h3>
            <p id="setting-stream-proxy-desc" className="text-[10px] text-slate-500 mt-1">{t.streamProxyDesc}</p>
          </div>
          <button
            id="btn-toggle-stream-proxy"
            onClick={() => {
              onUpdateSettings({ ...settings, streamProxyEnabled: !settings.streamProxyEnabled });
              triggerSuccess();
            }}
            className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${settings.streamProxyEnabled ? 'bg-sky-500' : 'bg-slate-800'}`}
          >
            <div className={`bg-slate-950 w-4 h-4 rounded-full transition-transform ${settings.streamProxyEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Leanback Launcher TV Features */}
        <div id="setting-section-leanback" className="bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl space-y-3 animate-fadeIn">
          <div id="setting-leanback-meta">
            <h3 id="setting-leanback-title" className="text-xs font-semibold flex items-center gap-2 text-slate-200">
              <Tv className="w-4.5 h-4.5 text-sky-400" />
              <span>{t.leanbackTitle}</span>
            </h3>
            <p id="setting-leanback-desc" className="text-[10px] text-slate-500 mt-1">{t.leanbackDesc}</p>
          </div>
          <div id="setting-leanback-options" className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-lg border border-slate-850">
              <span className="text-[11px] text-slate-300 font-bold">{t.recommendations}</span>
              <button
                id="btn-toggle-recommend"
                onClick={() => {
                  onUpdateSettings({ ...settings, leanbackRecommendationsEnabled: !settings.leanbackRecommendationsEnabled });
                  triggerSuccess();
                }}
                className={`w-10 h-5.5 rounded-full p-1 transition-colors cursor-pointer ${settings.leanbackRecommendationsEnabled ? 'bg-sky-500' : 'bg-slate-850'}`}
              >
                <div className={`bg-slate-950 w-3.5 h-3.5 rounded-full transition-transform ${settings.leanbackRecommendationsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-lg border border-slate-850">
              <span className="text-[11px] text-slate-300 font-bold">{t.banner}</span>
              <button
                id="btn-toggle-banner"
                onClick={() => {
                  onUpdateSettings({ ...settings, leanbackBannerEnabled: !settings.leanbackBannerEnabled });
                  triggerSuccess();
                }}
                className={`w-10 h-5.5 rounded-full p-1 transition-colors cursor-pointer ${settings.leanbackBannerEnabled ? 'bg-sky-500' : 'bg-slate-850'}`}
              >
                <div className={`bg-slate-950 w-3.5 h-3.5 rounded-full transition-transform ${settings.leanbackBannerEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone: Data Reset */}
        <div id="setting-section-danger" className="bg-red-500/5 border border-red-500/10 p-5 rounded-xl space-y-3.5">
          <div id="setting-danger-meta">
            <h3 id="setting-danger-title" className="text-xs font-semibold flex items-center gap-2 text-red-400">
              <Shield className="w-4.5 h-4.5 text-red-500" />
              <span>{t.dangerTitle}</span>
            </h3>
            <p id="setting-danger-desc" className="text-[10px] text-slate-500 mt-1">{t.dangerDesc}</p>
          </div>
          <div id="setting-danger-options" className="flex flex-wrap gap-3">
            <button
              id="btn-clear-history"
              onClick={() => { onClearHistory(); triggerSuccess(); }}
              className="px-4 py-2 bg-slate-950 hover:bg-red-900/10 hover:border-red-500/30 border border-slate-800 text-red-400 hover:text-red-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 inline mr-1.5" />
              {t.clearHistory}
            </button>
            <button
              id="btn-clear-favs"
              onClick={() => { onClearFavorites(); triggerSuccess(); }}
              className="px-4 py-2 bg-slate-950 hover:bg-red-900/10 hover:border-red-500/30 border border-slate-800 text-red-400 hover:text-red-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 inline mr-1.5" />
              {t.clearFavs}
            </button>
            <button
              id="btn-clear-playlists"
              onClick={() => { onClearAllPlaylists(); triggerSuccess(); }}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 inline mr-1.5" />
              {t.clearPlaylists}
            </button>
          </div>
        </div>

      </div>

      {/* RIGHT INFORMATION CARD (5 cols) */}
      <div id="settings-info-card" className="lg:col-span-4 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 flex flex-col justify-between h-full overflow-y-auto space-y-6">
        
        {/* Device metadata display */}
        <div id="settings-info-top" className="space-y-4">
          <div id="settings-info-header" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Tv className="w-4.5 h-4.5 text-sky-400" />
            <span>{t.infoTitle}</span>
          </div>
          <p id="settings-info-text" className="text-xs text-slate-400 leading-relaxed">
            {t.infoText}
          </p>
          <div id="settings-info-badges" className="flex flex-col gap-2 pt-2">
            <div id="badge-engine" className="flex items-center gap-2 text-[10px] bg-slate-950/80 border border-slate-850 p-2.5 rounded-lg text-slate-300 font-mono">
              <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t.hwEnabled}</span>
            </div>
            <div id="badge-api" className="flex items-center gap-2 text-[10px] bg-slate-950/80 border border-slate-850 p-2.5 rounded-lg text-slate-300 font-mono">
              <Disc className="w-4 h-4 text-sky-400 shrink-0" />
              <span>HLS.js v1.4.0 Engine active.</span>
            </div>
          </div>
          
          <button
            id="btn-show-features-showcase"
            tabIndex={0}
            onClick={() => setShowFeatures(true)}
            className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:shadow-amber-500/20 transition-all border border-amber-300/20 flex items-center justify-center gap-2 cursor-pointer focus:ring-2 focus:ring-amber-400 focus:outline-none focus:scale-105 active:scale-95"
          >
            <HelpCircle className="w-4 h-4 text-slate-950 shrink-0" />
            <span>{language === 'tr' ? 'OYNATICI ÖZELLİKLERİNİ GÖSTER' : 'SHOW PLAYER FEATURES'}</span>
          </button>
        </div>

        {/* Shortcuts keymap visual panel */}
        <div id="settings-shortcuts" className="border-t border-slate-850 pt-5 space-y-3">
          <div id="settings-shortcuts-header" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Keyboard className="w-4.5 h-4.5 text-sky-400" />
            <span>{t.keyboardShortcuts}</span>
          </div>
          <div id="settings-shortcuts-list" className="space-y-2 text-[11px] text-slate-300 max-h-[220px] overflow-y-auto pr-1">
            {[
              { key: t.scUp, val: t.scUpDesc },
              { key: t.scDown, val: t.scDownDesc },
              { key: t.scLeft, val: t.scLeftDesc },
              { key: t.scRight, val: t.scRightDesc },
              { key: t.scEnter, val: t.scEnterDesc },
              { key: t.scBack, val: t.scBackDesc }
            ].map((shortcut, i) => (
              <div id={`shortcut-row-${i}`} key={i} className="flex flex-col gap-0.5 bg-slate-950/50 p-2 rounded border border-slate-850/40">
                <span id={`shortcut-key-${i}`} className="font-bold text-sky-400 font-mono">{shortcut.key}</span>
                <span id={`shortcut-val-${i}`} className="text-slate-400">{shortcut.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Decoder Crash Logs & Debug Terminal */}
        <div id="settings-crash-terminal" className="border-t border-slate-850 pt-5 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Shield className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{t.debugLogs}</span>
            </div>
            {crashLogs.length > 0 && onClearCrashLogs && (
              <button
                id="btn-wipe-logs"
                onClick={onClearCrashLogs}
                className="text-[9px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 px-2 py-1 rounded transition-colors cursor-pointer"
              >
                {t.clearLogs}
              </button>
            )}
          </div>
          <p className="text-[9px] text-slate-500 leading-relaxed">{t.debugLogsDesc}</p>

          <div id="crash-terminal-box" className="bg-black/90 rounded-lg p-3 border border-slate-850 font-mono text-[9px] text-slate-400 h-36 overflow-y-auto space-y-2">
            {crashLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-1.5 py-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500/40" />
                <span>{t.noLogs}</span>
              </div>
            ) : (
              crashLogs.map((log) => (
                <div key={log.id} className="border-b border-slate-900 pb-1.5 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[8px] text-slate-600">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`px-1 rounded text-[8px] font-bold ${
                      log.type === 'network' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                      log.type === 'decoder' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                      'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    }`}>
                      {log.type.toUpperCase()}
                    </span>
                  </div>
                  {log.channelName && (
                    <div className="text-sky-300 font-bold mt-0.5 truncate">
                      Ch: {log.channelName}
                    </div>
                  )}
                  <p className="text-slate-300 leading-normal mt-0.5">{log.message}</p>
                  <p className="text-[8px] text-slate-600 truncate">{log.details}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* FULL DETAILED FEATURES MODAL SHOWCASE */}
      {showFeatures && (
        <div id="features-modal-backdrop" className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div id="features-modal-content" className="bg-slate-900 border border-slate-850 rounded-2xl max-w-4xl w-full p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col space-y-4">
            
            <button
              id="btn-close-features-modal"
              onClick={() => setShowFeatures(false)}
              className="absolute top-4 right-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 text-slate-400 hover:text-white p-2 rounded-xl transition-all cursor-pointer focus:ring-2 focus:ring-amber-400 focus:outline-none"
              title={language === 'tr' ? 'Kapat' : 'Close'}
            >
              <X className="w-5 h-5 text-amber-400" />
            </button>

            <div id="features-modal-header" className="border-b border-slate-800 pb-3 flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-wide text-amber-400">
                  {language === 'tr' ? 'Nexus IPTV Özel Yetenekleri & Özellikleri' : 'Nexus IPTV Core Features & Capabilities'}
                </h2>
                <p className="text-xs text-slate-400">
                  {language === 'tr' ? 'Büyük ekran televizyon ve TV Box cihazınız için optimize edilmiş tüm özellikler' : 'All special features optimized for smart TVs, Firesticks and Android TV Boxes'}
                </p>
              </div>
            </div>

            <div id="features-modal-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: <Tv className="w-5 h-5 text-amber-400" />,
                  title: language === 'tr' ? 'Google TV & TV Box Uyumlu' : 'Google TV & TV Box Friendly',
                  desc: language === 'tr' 
                    ? 'Tamamen kumanda (D-pad) uyumludur. Dokunma veya mouse imleci gerektirmeden yön tuşlarıyla tüm sekmeleri ve kanalları kontrol edebilirsiniz.'
                    : '100% remote control (D-pad) compatible. Zero touch or mouse required—navigate all tabs, menus, and playlists smoothly with arrows.'
                },
                {
                  icon: <Cpu className="w-5 h-5 text-emerald-400" />,
                  title: language === 'tr' ? 'Donanımsal Hızlandırma (HW)' : 'Hardware Acceleration',
                  desc: language === 'tr'
                    ? 'Cihaz işlemcisini (GPU) ve ExoPlayer kod çözücü motorunu kullanarak 4K, Full HD canlı yayınları takılma ve ısınma olmadan akıcı oynatır.'
                    : 'Leverages hardware GPU decoding alongside ExoPlayer core to deliver smooth, stutter-free playback of 4K and Full HD streams.'
                },
                {
                  icon: <Globe className="w-5 h-5 text-sky-400" />,
                  title: language === 'tr' ? 'CORS Ağ Geçidi (Stream Proxy)' : 'CORS Bypass Gateway',
                  desc: language === 'tr'
                    ? 'Tarayıcıların ve TV WebView altyapılarının katı CORS/Mixed-Content engellerini aşmak için yayınlarınızı özel proxy üzerinden tüneller.'
                    : 'Bypasses rigid browser and TV WebView CORS security policies by dynamically proxying stream chunks (.ts, .m3u8, HTTP) in real-time.'
                },
                {
                  icon: <HardDrive className="w-5 h-5 text-indigo-400" />,
                  title: language === 'tr' ? 'Onay Sınırsız Google Drive' : 'Google Drive Warning Bypass',
                  desc: language === 'tr'
                    ? 'Google Drive üzerinden IPTV listesi yüklerken karşılaşılan "büyük dosya virüs taraması" onay uyarılarını otomatik aşarak listenizi indirir.'
                    : 'Directly fetches and streams large M3U playlist files hosted on Google Drive, bypasses virus check confirmation steps transparently.'
                },
                {
                  icon: <Zap className="w-5 h-5 text-yellow-400" />,
                  title: language === 'tr' ? 'Yıldırım Kanal Geçişi (Zapping)' : 'Instant Stream Zapping',
                  desc: language === 'tr'
                    ? 'Canlı yayın izleme modunda kumandadan YUKARI/AŞAĞI tuşlarına basarak kanallar arasında anında geçiş yapabilir, SAĞ/SOL tuşlarıyla sesi açıp kısabilirsiniz.'
                    : 'Zap streams swiftly using D-Pad UP/DOWN keys during playback without closing the player. Adjust audio volume with D-Pad LEFT/RIGHT.'
                },
                {
                  icon: <Sliders className="w-5 h-5 text-teal-400" />,
                  title: language === 'tr' ? 'İnteraktif TV Rehberi (EPG)' : 'Interactive EPG Guide',
                  desc: language === 'tr'
                    ? 'Yayın akışı kılavuzu (EPG) ile kanalların günlük programlarını saatlik zaman tünelinde inceleyebilir, yayın akışından doğrudan kanala gidebilirsiniz.'
                    : 'View current and upcoming schedules via the horizontal TV Guide timeline. Simply select a show card to jump directly to its channel.'
                },
                {
                  icon: <Palette className="w-5 h-5 text-rose-400" />,
                  title: language === 'tr' ? 'Kişiselleştirilmiş 4 Premium Tema' : '4 Gorgeous Premium Themes',
                  desc: language === 'tr'
                    ? 'Televizyon ekranınıza en iyi uyan renk şemasını seçin: Kraliyet Altını, Tivimate Teal, Netflix Kırmızı veya Klasik Siyah arasından dilediğinizi kullanın.'
                    : 'Select the color profile that fits your environment: Royal Golden, Tivimate Teal, Netflix Red, or Classic Slate interfaces.'
                },
                {
                  icon: <Shield className="w-5 h-5 text-blue-400" />,
                  title: language === 'tr' ? 'Gelişmiş Teşhis & Hata Terminali' : 'Diagnostic Terminal Logs',
                  desc: language === 'tr'
                    ? 'Uygulama arka planında oynatıcı motorunun ürettiği hata kodlarını, çözücü istisnalarını ve ağ kopmalarını anlık raporlayan teknik terminal.'
                    : 'An embedded diagnostic console logging real-time media exceptions, network socket drops, and stream handshake errors.'
                }
              ].map((feat, index) => (
                <div id={`feature-modal-item-${index}`} key={index} className="flex gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800 hover:border-amber-500/20 transition-all">
                  <div className="shrink-0 p-2 bg-slate-900 rounded-lg h-fit border border-slate-800">
                    {feat.icon}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-200">{feat.title}</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div id="features-modal-footer" className="border-t border-slate-800 pt-3 flex justify-end">
              <button
                id="btn-close-features-modal-footer"
                tabIndex={0}
                onClick={() => setShowFeatures(false)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer focus:ring-2 focus:ring-amber-300 focus:outline-none"
              >
                {language === 'tr' ? 'Kılavuzu Kapat (GERİ)' : 'Close Guide (BACK)'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
