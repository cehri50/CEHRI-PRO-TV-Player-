/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Volume2, Move, ArrowLeft, Maximize, Keyboard, Eye, EyeOff } from 'lucide-react';

interface NavigationGuideProps {
  language: 'tr' | 'en';
}

export default function NavigationGuide({ language }: NavigationGuideProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  const t = {
    tr: {
      title: 'Kumanda & Klavye Kılavuzu',
      desc: 'Bu arayüz Android TV ve TV Box kumandalarıyla tam uyumludur. Kumandadaki yön tuşlarını veya klavyenizi kullanabilirsiniz.',
      nav: 'Yön Tuşları: Gezinme / Kanal Listesi',
      zap: 'Yön Tuşları (Oynatma Sırasında): Yukarı/Aşağı Kanal Değiştirir, Sağ/Sol Ses Ayarlar',
      enter: 'Okey / Enter: Seç / Kanala Git / Panel Aç',
      back: 'Geri / Backspace: Menüyü Kapat / Geri Dön',
      fs: 'F Tuşu: Tam Ekran Modu',
      space: 'Space / P: Duraklat / Başlat',
      mute: 'M Tuşu: Sesi Kapat/Aç',
      quick: '1-9 Tuşları: Hızlı Kanal Seçimi',
      show: 'Kılavuzu Göster',
      hide: 'Gizle'
    },
    en: {
      title: 'Remote & Keyboard Guide',
      desc: 'This interface is fully compatible with Android TV & TV Box remote controllers. You can use standard D-pad arrows or your keyboard.',
      nav: 'Arrow Keys: Navigation / Channel Grid',
      zap: 'Arrow Keys (During Playback): Up/Down Zaps Channels, Left/Right Adjusts Volume',
      enter: 'OK / Enter: Select / Play / Show Controls',
      back: 'Back / Backspace: Exit Menu / Return',
      fs: 'F Key: Toggle Fullscreen',
      space: 'Space / P: Play / Pause Stream',
      mute: 'M Key: Mute / Unmute',
      quick: 'Numbers 1-9: Quick Channel Change',
      show: 'Show Guide',
      hide: 'Hide'
    }
  }[language];

  return (
    <div id="nav-guide-root" className="fixed bottom-4 right-4 z-40 font-sans">
      {isOpen ? (
        <div id="nav-guide-box" className="w-80 bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border border-slate-800 text-slate-100 shadow-2xl transition-all duration-300">
          <div id="nav-guide-header" className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div id="nav-guide-title-wrapper" className="flex items-center gap-2">
              <Keyboard id="nav-guide-keyboard-icon" className="w-5 h-5 text-sky-400" />
              <h3 id="nav-guide-title" className="text-sm font-semibold text-slate-200">{t.title}</h3>
            </div>
            <button 
              id="nav-guide-close-btn"
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-200 transition-colors p-1"
              title={t.hide}
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
          <p id="nav-guide-desc" className="text-xs text-slate-400 mb-3 leading-relaxed">
            {t.desc}
          </p>
          <ul id="nav-guide-list" className="space-y-2 text-xs text-slate-300">
            <li id="nav-guide-item-nav" className="flex items-start gap-2">
              <Move className="w-3.5 h-3.5 text-sky-500 mt-0.5 shrink-0" />
              <span>{t.nav}</span>
            </li>
            <li id="nav-guide-item-zap" className="flex items-start gap-2">
              <Play className="w-3.5 h-3.5 text-sky-500 mt-0.5 shrink-0" />
              <span>{t.zap}</span>
            </li>
            <li id="nav-guide-item-enter" className="flex items-start gap-2">
              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-sky-400 font-mono border border-slate-700 shrink-0">OK</span>
              <span>{t.enter}</span>
            </li>
            <li id="nav-guide-item-back" className="flex items-start gap-2">
              <ArrowLeft className="w-3.5 h-3.5 text-sky-500 mt-0.5 shrink-0" />
              <span>{t.back}</span>
            </li>
            <li id="nav-guide-item-fs" className="flex items-start gap-2">
              <Maximize className="w-3.5 h-3.5 text-sky-500 mt-0.5 shrink-0" />
              <span>{t.fs}</span>
            </li>
            <li id="nav-guide-item-quick" className="flex items-start gap-2">
              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-sky-400 font-mono border border-slate-700 shrink-0">1-9</span>
              <span>{t.quick}</span>
            </li>
          </ul>
        </div>
      ) : (
        <button
          id="nav-guide-toggle-btn"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-sm border border-slate-800 text-slate-300 hover:text-white py-2 px-3.5 rounded-lg shadow-xl text-xs transition-all duration-200"
        >
          <Keyboard className="w-4 h-4 text-sky-400" />
          <span>{t.show}</span>
          <Eye className="w-3.5 h-3.5 text-slate-500" />
        </button>
      )}
    </div>
  );
}
