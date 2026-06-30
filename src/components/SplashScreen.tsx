/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { Tv, Cpu, ShieldCheck, Check, Terminal, Wifi, Database } from 'lucide-react';
import cehriLogo from '../assets/images/cehri_logo_1782719992837.jpg';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Sistem başlatılıyor...');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [lang, setLang] = useState<'tr' | 'en'>('tr');
  const [hwStats, setHwStats] = useState({
    ram: 'Allocating RAM...',
    cores: 'Detecting cores...',
    gpu: 'GPU mapping...'
  });

  // Keep a stable ref to onFinish so we don't restart the timers when App.tsx re-renders (e.g. clock update)
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Detect language from localstorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexus_iptv_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.language === 'en') {
          setLang('en');
        }
      }
    } catch (e) {
      // default to tr
    }
  }, []);

  const t = {
    tr: {
      title: 'CEHRİ50',
      subtitle: 'KAPADOKYA TV BOX ENGINE',
      initializing: 'Sistem modülleri ve kumanda sürücüleri kuruluyor...',
      checkingGpu: 'TV Box GPU Hızlandırması test ediliyor (OpenGLES v3.2)...',
      loadingPlayer: 'ExoPlayer v2.18.5 multi-codec modülü yükleniyor...',
      optimizingRam: 'Bellek (RAM) temizleniyor ve önbellek alanı ayrılıyor...',
      loadingPlaylists: 'Kanallar ve EPG rehberi veritabanından çekiliyor...',
      ready: 'Cehri50 IPTV oynatıcı hazır! Başlatılıyor...',
      stepSys: 'Temel Sürücüler',
      stepGpu: 'GPU Donanım Çözücü',
      stepPlayer: 'ExoPlayer / Media3 Motoru',
      stepCache: 'Kanal Logo Önbelleği',
      stepPlaylists: 'Oynatma Listeleri',
      secDecoding: 'DONANIMSAL ÇÖZÜMLEME | SÜRÜM 3.1.0'
    },
    en: {
      title: 'CEHRİ50',
      subtitle: 'KAPADOKYA TV BOX ENGINE',
      initializing: 'Setting up core modules and controller drivers...',
      checkingGpu: 'Testing TV Box GPU acceleration (OpenGLES v3.2)...',
      loadingPlayer: 'Loading ExoPlayer v2.18.5 multi-codec engine...',
      optimizingRam: 'Purging memory RAM & allocating stream cache buffer...',
      loadingPlaylists: 'Syncing channels and EPG guides from SQLite DB...',
      ready: 'Cehri50 IPTV engine ready! Launching portal...',
      stepSys: 'Core Drivers',
      stepGpu: 'GPU Decoder HW',
      stepPlayer: 'ExoPlayer / Media3 Engine',
      stepCache: 'Logo Vector Cache',
      stepPlaylists: 'IPTV Playlists',
      secDecoding: 'HARDWARE DECODING | VER 3.1.0'
    }
  }[lang];

  useEffect(() => {
    const timeouts: any[] = [];

    const steps = [
      {
        t: 400,
        p: 15,
        s: t.initializing,
        comp: 'sys',
        stats: { ram: '1.2 GB / 4.0 GB', cores: '8x ARM Cortex-A53', gpu: 'Mali-G31 MP2' }
      },
      {
        t: 1000,
        p: 35,
        s: t.checkingGpu,
        comp: 'gpu',
        stats: { ram: '1.4 GB / 4.0 GB', cores: '8x ARM Cortex-A53 (OK)', gpu: 'Vulkan 1.1 Support' }
      },
      {
        t: 1600,
        p: 60,
        s: t.loadingPlayer,
        comp: 'player',
        stats: { ram: '1.8 GB / 4.0 GB', cores: 'H.264/H.265 HW DECODE', gpu: 'ExoPlayer Active' }
      },
      {
        t: 2200,
        p: 80,
        s: t.optimizingRam,
        comp: 'cache',
        stats: { ram: '512 MB Free (Cleaned)', cores: 'Threading: L2 Ready', gpu: 'Cache: 50MB Bound' }
      },
      {
        t: 2800,
        p: 95,
        s: t.loadingPlaylists,
        comp: 'playlists',
        stats: { ram: '560 MB (Streams OK)', cores: 'EPG Sync Complete', gpu: 'Direct3D/OpenGL' }
      },
      {
        t: 3300,
        p: 100,
        s: t.ready,
        comp: 'done',
        stats: { ram: 'Ready', cores: 'Active Threading', gpu: 'V-Sync Locked 60fps' }
      }
    ];

    steps.forEach((step) => {
      const id = setTimeout(() => {
        setProgress(step.p);
        setStatus(step.s);
        if (step.comp !== 'done') {
          setCompletedSteps(prev => {
            if (prev.includes(step.comp)) return prev;
            return [...prev, step.comp];
          });
        }
        setHwStats(step.stats);
      }, step.t);
      timeouts.push(id);
    });

    const endTimeout = setTimeout(() => {
      onFinishRef.current();
    }, 3800);
    timeouts.push(endTimeout);

    return () => {
      timeouts.forEach(id => clearTimeout(id));
    };
  }, [lang]);

  const renderCheckItem = (id: string, label: string) => {
    const isCompleted = completedSteps.includes(id);
    return (
      <div id={`splash-check-${id}`} className={`flex items-center justify-between p-2.5 rounded-lg border transition-all duration-300 ${
        isCompleted 
          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' 
          : 'bg-slate-900/40 border-slate-800/40 text-slate-500'
      }`}>
        <span className="text-[11px] font-medium tracking-wide flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 opacity-60" />
          {label}
        </span>
        <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
          isCompleted ? 'bg-emerald-500 border-emerald-500 text-slate-950 scale-110' : 'border-slate-700 bg-slate-950'
        }`}>
          {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
        </div>
      </div>
    );
  };

  return (
    <div id="splash-screen-root" className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-white z-50 overflow-hidden font-sans">
      {/* Background Ambient Glow */}
      <div id="splash-glow-1" className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div id="splash-glow-2" className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div id="splash-container" className="relative flex flex-col items-center max-w-2xl w-full px-6 text-center z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        
        {/* LEFT PANEL: BRAND & LOGO */}
        <div id="splash-brand-panel" className="flex flex-col items-center justify-center text-center space-y-4">
          <div id="splash-icon-wrapper" className="relative animate-pulse mb-2">
            <div id="splash-card" className="p-1 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl shadow-2xl shadow-amber-500/20 overflow-hidden w-32 h-32 flex items-center justify-center">
              <img 
                id="splash-logo-img" 
                src={cehriLogo} 
                alt="Cehri Logo" 
                className="w-[120px] h-[120px] object-cover rounded-[22px]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div id="splash-cpu-badge" className="absolute -bottom-2 -right-2 p-2.5 bg-slate-950 rounded-xl border border-amber-500/30 shadow-lg">
              <Cpu id="splash-cpu-icon" className="w-5 h-5 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>

          <div>
            <h1 id="splash-title" className="text-4xl font-extrabold tracking-wider text-slate-100 flex items-center justify-center gap-1.5">
              CEHRİ<span className="text-amber-500">50</span>
            </h1>
            <p id="splash-subtitle" className="text-amber-500/70 text-[10px] font-bold tracking-[0.25em] uppercase">
              KAPADOKYA EDITION
            </p>
          </div>

          <div id="splash-progress-container" className="w-full max-w-xs space-y-2 pt-4">
            <div id="splash-progress-track" className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/40">
              <div 
                id="splash-progress-bar"
                className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>BOOT SEQUENCE</span>
              <span>{progress}%</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: INITIALIZATION TERMINAL */}
        <div id="splash-terminal-panel" className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 text-left space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              SYSTEM DIAGNOSTICS
            </span>
            <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[9px]">EXOPLAYER v2.18</span>
          </div>

          {/* System Check list */}
          <div id="splash-checklist" className="space-y-2">
            {renderCheckItem('sys', t.stepSys)}
            {renderCheckItem('gpu', t.stepGpu)}
            {renderCheckItem('player', t.stepPlayer)}
            {renderCheckItem('cache', t.stepCache)}
            {renderCheckItem('playlists', t.stepPlaylists)}
          </div>

          {/* System Telemetry stats */}
          <div id="splash-telemetry" className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 text-[9px] font-mono text-slate-400">
            <div className="flex flex-col">
              <span className="text-slate-600">RAM USAGE</span>
              <span className="text-slate-300 font-bold truncate">{hwStats.ram}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-600">HARDWARE CPU</span>
              <span className="text-slate-300 font-bold truncate">{hwStats.cores}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-600">DECODER ENGINE</span>
              <span className="text-slate-300 font-bold truncate">{hwStats.gpu}</span>
            </div>
          </div>

          {/* Current log status bar */}
          <div className="bg-slate-950 p-2.5 rounded border border-slate-850 flex items-center gap-2 text-[10px] text-sky-400 font-mono">
            <Wifi className="w-3.5 h-3.5 animate-pulse shrink-0" />
            <span className="truncate">{status}</span>
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <div id="splash-footer" className="absolute bottom-8 flex items-center gap-2 text-[10px] text-slate-600 font-mono">
        <ShieldCheck id="splash-shield-icon" className="w-4 h-4 text-emerald-500/60" />
        <span>{t.secDecoding}</span>
      </div>
    </div>
  );
}
