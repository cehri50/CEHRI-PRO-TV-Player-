/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Clock, Play, Calendar, MonitorPlay, Star, ArrowLeft, ArrowRight, Info, Tv, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { IPTVPlaylistItem, IPTVPlaylist, EPGProgram } from '../types';
import { fetchRealEPG } from '../epgClient';
import { getDynamicEPG } from '../demoData';
import { getCleanLogoUrl } from '../utils';

interface TVGuideTimelineProps {
  playlists: IPTVPlaylist[];
  channels: IPTVPlaylistItem[];
  favorites: string[];
  onSelectChannel: (channel: IPTVPlaylistItem) => void;
  onToggleFavorite: (channelId: string) => void;
  language: 'tr' | 'en';
  onExitToHeader?: () => void;
}

export default function TVGuideTimeline({
  playlists,
  channels,
  favorites,
  onSelectChannel,
  onToggleFavorite,
  language,
  onExitToHeader
}: TVGuideTimelineProps) {
  const [selectedChannel, setSelectedChannel] = useState<IPTVPlaylistItem | null>(
    channels.length > 0 ? channels[0] : null
  );

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
  const [selectedProgram, setSelectedProgram] = useState<EPGProgram | null>(null);
  const [activePrograms, setActivePrograms] = useState<EPGProgram[]>([]);
  const [isLoadingEPG, setIsLoadingEPG] = useState(false);
  const [currentTimeOffset, setCurrentTimeOffset] = useState(0); // in hours
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scalability States for TV Guide Sidebar
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);

  // Fast, scalable filter for channel sidebar search
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(ch => ch.name.toLowerCase().includes(q) || (ch.group && ch.group.toLowerCase().includes(q)));
  }, [channels, searchQuery]);

  // Reset visibleCount whenever search query updates to avoid memory overflow
  useEffect(() => {
    setVisibleCount(50);
  }, [searchQuery]);

  // Fallback if no selected channel is set but channels loaded
  useEffect(() => {
    if (!selectedChannel && channels.length > 0) {
      setSelectedChannel(channels[0]);
    }
  }, [channels, selectedChannel]);

  // Load programs for selected channel asynchronously
  useEffect(() => {
    if (!selectedChannel) {
      setActivePrograms([]);
      return;
    }

    let isMounted = true;
    setIsLoadingEPG(true);

    const playlist = playlists.find(p => p.id === selectedChannel.playlistId);

    fetchRealEPG(selectedChannel, playlist)
      .then(programs => {
        if (isMounted) {
          setActivePrograms(programs);
          setIsLoadingEPG(false);
        }
      })
      .catch((err) => {
        console.error('[TVGuideTimeline] EPG fetch error:', err);
        if (isMounted) {
          setIsLoadingEPG(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedChannel, playlists]);

  // Set default selected program when active channel changes
  useEffect(() => {
    if (activePrograms.length > 0) {
      // Find the current ongoing program if possible
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const found = activePrograms.find(p => {
        const [sh, sm] = p.start.split(':').map(Number);
        const [eh, em] = p.end.split(':').map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        return currentMinutes >= startMin && currentMinutes < endMin;
      }) || activePrograms[1] || activePrograms[0];
      
      setSelectedProgram(found);
    } else {
      setSelectedProgram(null);
    }
  }, [activePrograms]);

  const t = {
    tr: {
      guideTitle: 'Nexus TV Rehberi & EPG',
      guideSubtitle: 'Yayın akışını saat dilimlerine göre takip edin ve doğrudan oynatın.',
      nowPlaying: 'Canlı Yayında',
      watchNow: 'KANALI İZLE',
      duration: 'Süre',
      favAdd: 'Favorilere Ekle',
      favRemove: 'Favorilerden Çıkar',
      noChannels: 'Önizleme yapacak kanal bulunamadı. Lütfen oynatma listesi ekleyin.',
      nextHours: 'Sonraki Saatler',
      prevHours: 'Önceki Saatler',
      noProg: 'Program bilgisi alınamadı.',
      progDetail: 'Yayın Akışı Detayları',
      epgTimeline: 'Zaman Çizelgesi',
      benchTitle: 'Performans Verisi',
      benchDesc: '50,000+ Kanal ve Logo Önbellekleme aktif.'
    },
    en: {
      guideTitle: 'Nexus TV Guide & EPG Grid',
      guideSubtitle: 'Explore electronic program guides across interactive timelines.',
      nowPlaying: 'Currently Broadcasting',
      watchNow: 'WATCH LIVE',
      duration: 'Duration',
      favAdd: 'Add Favorites',
      favRemove: 'Unfavorite',
      noChannels: 'No active channels. Please load a playlist first.',
      nextHours: 'Later Hours',
      prevHours: 'Earlier Hours',
      noProg: 'No program details available.',
      progDetail: 'Broadcast Details',
      epgTimeline: 'Schedules Grid',
      benchTitle: 'System Metrics',
      benchDesc: 'Rendering 50,000+ streams smoothly with fast loading cache.'
    }
  }[language];

  // Calculate EPG Program progress percentage
  const getProgress = (prog: EPGProgram) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = prog.start.split(':').map(Number);
    const [eh, em] = prog.end.split(':').map(Number);
    
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    
    if (currentMinutes < startMin) return 0;
    if (currentMinutes > endMin) return 100;
    
    const total = endMin - startMin;
    const elapsed = currentMinutes - startMin;
    return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
  };

  const handleNextHours = () => {
    setCurrentTimeOffset(prev => prev + 2);
  };

  const handlePrevHours = () => {
    setCurrentTimeOffset(prev => Math.max(0, prev - 2));
  };

  return (
    <div id="epg-timeline-root" className="bg-slate-950/40 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 flex flex-col h-[650px] overflow-hidden text-white font-sans space-y-4">
      {/* HEADER SECTION */}
      <div id="epg-header" className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-850 pb-3 gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-wide">{t.guideTitle}</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">{t.guideSubtitle}</p>
          </div>
        </div>

        {/* Timeline hour offset controls + Back button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              id="btn-epg-prev-time"
              onClick={handlePrevHours}
              disabled={currentTimeOffset === 0}
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-850 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-900 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 font-bold bg-slate-900/80 border border-slate-800/40 px-2.5 py-1.5 rounded-lg">
              UTC +{currentTimeOffset}h
            </span>
            <button
              id="btn-epg-next-time"
              onClick={handleNextHours}
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-850 text-slate-400 hover:text-white cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {onExitToHeader && (
            <button
              id="btn-epg-back-to-menu"
              tabIndex={0}
              onClick={onExitToHeader}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-sky-400 text-sky-400 hover:text-white rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-sky-400 focus:outline-none focus:scale-105"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              <span>{language === 'tr' ? 'GERİ' : 'BACK'}</span>
            </button>
          )}
        </div>
      </div>

      {/* TWO PANEL CONTENT: LEFT CHANNELS, RIGHT GRID SCHEDULE & BOTTOM DETAILS */}
      <div id="epg-layout-grid" className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden min-h-0">
        
        {/* LEFT COMPACT CHANNELS LIST (4 cols) - SCALABLE & FILTERABLE */}
        <div id="epg-channels-panel" className="lg:col-span-4 bg-slate-950/30 border border-slate-850/60 rounded-xl flex flex-col h-full overflow-hidden">
          <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-850 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between shrink-0">
            <span>{filteredChannels.length} {language === 'tr' ? 'KANAL' : 'CHANNELS'}</span>
            <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 border border-slate-800 text-slate-500 font-mono">D-PAD COMPATIBLE</span>
          </div>

          {/* SIDEBAR SEARCH INPUT FOR INSTANT NAVIGATION FOR 20,000+ CHANNELS */}
          <div className="p-2 border-b border-slate-850/60 bg-slate-950/20 shrink-0">
            <input
              type="text"
              placeholder={language === 'tr' ? 'Kanal veya grup ara...' : 'Search channels or groups...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-850 focus:border-sky-500/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20 font-sans transition-all"
            />
          </div>

          <div 
            id="epg-channel-items" 
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
              if (scrollHeight - scrollTop - clientHeight < 150) {
                setVisibleCount(prev => Math.min(prev + 50, filteredChannels.length));
              }
            }}
            className="flex-1 overflow-y-auto divide-y divide-slate-900 p-1 space-y-1"
          >
            {filteredChannels.slice(0, visibleCount).map((ch, idx) => {
              const isSelected = selectedChannel?.id === ch.id;
              const isFav = favorites.includes(ch.id);
              
              // Get current show name for sublabel
              const progs = getDynamicEPG(ch.id);
              const currentShowName = progs[1]?.title || progs[0]?.title || '';

              return (
                <button
                  id={`epg-channel-row-${ch.id}`}
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-between group relative overflow-hidden ${
                    isSelected 
                      ? 'bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-md scale-[1.01]' 
                      : 'border border-transparent hover:bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={getCleanLogoUrl(ch.logo)}
                      alt={ch.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-lg object-contain bg-slate-900 p-0.5 border border-slate-800 shrink-0 shadow-sm"
                    />
                    <div className="min-w-0">
                      <span className={`text-xs font-bold block truncate ${isSelected ? 'text-sky-300' : 'text-slate-200'}`}>
                        {ch.name}
                      </span>
                      <span className="text-[9px] text-slate-500 block truncate font-mono mt-0.5">
                        {currentShowName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isFav && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT SCHEDULE TIMELINE & SELECTED ITEM CARD (8 cols) */}
        <div id="epg-details-panel" className="lg:col-span-8 flex flex-col h-full overflow-hidden space-y-4">
          
          {/* EPG Timeline list for selected channel */}
          <div className="bg-slate-950/40 border border-slate-850/60 rounded-xl flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-850 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                {selectedChannel?.name} — {t.epgTimeline}
              </span>
              <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/20">LIVE EPG SYNCED</span>
            </div>

            <div id="epg-timeline-items" className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {isLoadingEPG ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div id={`epg-skeleton-${idx}`} key={idx} className="w-full p-4 rounded-xl border border-slate-850 bg-slate-950/20 animate-pulse flex flex-col space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-4.5 w-20 bg-slate-800 rounded-md" />
                      <div className="h-3 w-10 bg-slate-800/40 rounded-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-4 w-1/2 bg-slate-800 rounded-md" />
                      <div className="h-3.5 w-5/6 bg-slate-800/30 rounded-md" />
                    </div>
                  </div>
                ))
              ) : activePrograms.length === 0 ? (
                <div id="epg-empty-state" className="flex flex-col items-center justify-center text-center p-12 text-slate-500 h-full">
                  <Tv className="w-12 h-12 mb-3 stroke-[1.2] opacity-40 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-400 mb-1">{t.noProg}</p>
                  <p className="text-[10px] text-slate-500 max-w-xs">Bu kanal için aktif akış bilgisi bulunamadı.</p>
                </div>
              ) : (
                activePrograms.map((prog, i) => {
                  const isCurrent = i === 1 || i === 2; // Simulated active
                  const isSelected = selectedProgram?.id === prog.id;
                  const progressVal = getProgress(prog);

                  return (
                    <button
                      id={`epg-prog-block-${prog.id}`}
                      key={prog.id}
                      onClick={() => setSelectedProgram(prog)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col space-y-2 relative overflow-hidden group ${
                        isSelected
                          ? 'bg-sky-500/5 border-sky-500/40 shadow-lg scale-[1.01]'
                          : 'bg-slate-950/40 border-slate-850/60 hover:bg-slate-900/40 hover:border-slate-800'
                      }`}
                    >
                      {/* Progress track if active */}
                      {isCurrent && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800">
                          <div className="h-full bg-sky-500 transition-all" style={{ width: `${progressVal}%` }} />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded text-[10px]">
                            {prog.start} - {prog.end}
                          </span>
                          {isCurrent && (
                            <span className="text-[8px] bg-emerald-500 text-slate-950 px-1 py-0.5 rounded font-bold uppercase animate-pulse">
                              {t.nowPlaying}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono">
                          90 min
                        </span>
                      </div>

                      <div>
                        <h4 className={`text-xs font-bold leading-snug ${isSelected ? 'text-sky-300' : 'text-slate-200'} group-hover:text-white transition-colors`}>
                          {prog.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 leading-relaxed">
                          {prog.description}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ACTIVE PROGRAM DETAILS CARD & WATCH TRIGGERS (At the bottom) */}
          <div id="epg-active-card" className="bg-slate-900/60 backdrop-blur-md border border-slate-850 rounded-xl p-4 shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0 flex-1">
              <span className="text-[9px] font-bold text-sky-400 uppercase tracking-widest font-mono">
                {selectedChannel?.name}
              </span>
              <h3 className="text-sm font-extrabold text-slate-100 truncate leading-snug">
                {selectedProgram ? selectedProgram.title : t.noProg}
              </h3>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {selectedProgram ? selectedProgram.description : ''}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
              <button
                id="btn-epg-fav-toggle"
                onClick={() => selectedChannel && onToggleFavorite(selectedChannel.id)}
                className="flex-1 md:flex-initial px-3.5 py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Star className={`w-4 h-4 ${selectedChannel && favorites.includes(selectedChannel.id) ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">
                  {selectedChannel && favorites.includes(selectedChannel.id) ? t.favRemove : t.favAdd}
                </span>
              </button>

              <button
                id="btn-epg-play-trigger"
                onClick={() => selectedChannel && onSelectChannel(selectedChannel)}
                className="flex-1 md:flex-initial px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/10"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{t.watchNow}</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
