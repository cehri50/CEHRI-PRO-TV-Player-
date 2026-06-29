/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Tv, Heart, History, Search, Folder, Play, CheckCircle, Flame,
  Tv2, Star, Clock, AlertTriangle, ShieldAlert, Library
} from 'lucide-react';
import { IPTVPlaylistItem, IPTVHistoryItem, IPTVPlaylist } from '../types';
import { getDynamicEPG } from '../demoData';
import { getCleanLogoUrl } from '../utils';

interface ChannelListProps {
  playlists: IPTVPlaylist[];
  channels: IPTVPlaylistItem[];
  activeChannel: IPTVPlaylistItem | null;
  favorites: string[]; // List of channel IDs
  history: IPTVHistoryItem[];
  onSelectChannel: (channel: IPTVPlaylistItem) => void;
  onToggleFavorite: (channelId: string) => void;
  language: 'tr' | 'en';
  keyboardFocusActive: boolean;
  onSwitchTab?: (tab: 'channels' | 'tv-guide' | 'portal' | 'playlists' | 'settings') => void;
  onExitToHeader?: () => void;
}

export default function ChannelList({
  playlists,
  channels,
  activeChannel,
  favorites,
  history,
  onSelectChannel,
  onToggleFavorite,
  language,
  keyboardFocusActive,
  onSwitchTab,
  onExitToHeader
}: ChannelListProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>('TÜMÜ_ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'history'>('all');
  
  // Remote Controller / Keyboard cursor index
  const [focusedSection, setFocusedSection] = useState<'tabs' | 'groups' | 'search' | 'channels'>('channels');
  const [focusedTabIndex, setFocusedTabIndex] = useState(0); // 0: all, 1: favorites, 2: history
  const [focusedGroupIndex, setFocusedGroupIndex] = useState(0);
  const [focusedChannelIndex, setFocusedChannelIndex] = useState(0);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Virtualization States
  const [columns, setColumns] = useState(3);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(500);
  const rowHeight = 210; // Comfortable height for channel cards with EPG spacing

  // Handle dynamic columns based on window resize (mobile, desktop, TV Box)
  useEffect(() => {
    const updateDimensions = () => {
      if (window.innerWidth >= 1280) {
        setColumns(3);
      } else if (window.innerWidth >= 768) {
        setColumns(2);
      } else {
        setColumns(1);
      }
      if (containerRef.current) {
        setViewportHeight(containerRef.current.clientHeight || 500);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Update viewport height whenever filtered channels list updates
  useEffect(() => {
    if (containerRef.current) {
      setViewportHeight(containerRef.current.clientHeight || 500);
    }
  }, [channels.length]);

  const t = {
    tr: {
      searchPlaceholder: 'Kanal adı ara...',
      allChannels: 'Tüm Kanallar',
      favorites: 'Favori Kanallarım',
      history: 'Son İzlenenler',
      allGroups: 'Tüm Kategoriler',
      noChannels: 'Gösterilecek kanal bulunamadı. Lütfen aramanızı kontrol edin veya yukarıdan yeni bir oynatma listesi yükleyin.',
      liveBadge: 'CANLI',
      nowPlaying: 'Şu An:',
      nextUp: 'Sıradaki:',
      favoriteTooltip: 'Favorilere Ekle / Çıkar',
      playTooltip: 'Oynat',
      channelsTitle: 'Kanal Listesi',
      groupsTitle: 'Kategoriler',
      totalChannels: 'Kanal',
      demoPlaylistNotice: 'Örnek demo liste yüklenmiştir.',
      noFavs: 'Favorilerinizde henüz kanal yok. Gezinirken favori düğmelerine basarak ekleyebilirsiniz.',
      noHistory: 'İzleme geçmişiniz henüz boş.'
    },
    en: {
      searchPlaceholder: 'Search channel name...',
      allChannels: 'All Channels',
      favorites: 'My Favorites',
      history: 'Recently Watched',
      allGroups: 'All Categories',
      noChannels: 'No channels found. Please check your search query or load a new playlist from the manager.',
      liveBadge: 'LIVE',
      nowPlaying: 'Now:',
      nextUp: 'Next:',
      favoriteTooltip: 'Add to / Remove from Favorites',
      playTooltip: 'Play Stream',
      channelsTitle: 'Channel Directory',
      groupsTitle: 'Categories',
      totalChannels: 'channels',
      demoPlaylistNotice: 'Demo streams loaded successfully.',
      noFavs: 'No favorite channels added yet. Click on the heart icon during browsing to save.',
      noHistory: 'Your watch history is currently empty.'
    }
  }[language];

  // Extract all unique groups from channels
  const groups = useMemo(() => {
    const list = new Set<string>();
    channels.forEach(ch => {
      if (ch.group) list.add(ch.group);
    });
    return ['TÜMÜ_ALL', ...Array.from(list)];
  }, [channels]);

  // Filter channels based on tab, group, and search query
  const filteredChannels = useMemo(() => {
    let result = channels;

    // Filter by Tab
    if (activeTab === 'favorites') {
      result = result.filter(ch => favorites.includes(ch.id));
    } else if (activeTab === 'history') {
      // Order by history watched timestamp
      const historyIds = history.map(h => h.channelId);
      result = result.filter(ch => historyIds.includes(ch.id));
      // Sort to match history sequence (most recent first)
      result = [...result].sort((a, b) => {
        const indexA = history.findIndex(h => h.channelId === a.id);
        const indexB = history.findIndex(h => h.channelId === b.id);
        return indexA - indexB;
      });
    }

    // Filter by Category Group (if not 'TÜMÜ_ALL' and not in history/favorite mode unless wanted)
    if (selectedGroup !== 'TÜMÜ_ALL') {
      result = result.filter(ch => ch.group === selectedGroup);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(ch => ch.name.toLowerCase().includes(q) || ch.group.toLowerCase().includes(q));
    }

    return result;
  }, [channels, activeTab, selectedGroup, searchQuery, favorites, history]);

  // Set selected group safely when groups change
  useEffect(() => {
    if (!groups.includes(selectedGroup)) {
      setSelectedGroup('TÜMÜ_ALL');
    }
  }, [groups, selectedGroup]);

  // Adjust indexes to bounds on filters change
  useEffect(() => {
    setFocusedChannelIndex(0);
  }, [filteredChannels.length]);

  // Remote controller keyboard listeners mapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!keyboardFocusActive) return;

      const tabsCount = 3;
      const groupsCount = groups.length;
      const channelsCount = filteredChannels.length;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (focusedSection === 'channels') {
            const cols = columns;
            if (focusedChannelIndex >= cols) {
              setFocusedChannelIndex(prev => prev - cols);
            } else {
              setFocusedSection('search');
              searchInputRef.current?.focus();
            }
          } else if (focusedSection === 'groups') {
            if (focusedGroupIndex > 0) {
              setFocusedGroupIndex(prev => prev - 1);
            } else {
              if (onExitToHeader) {
                onExitToHeader();
              } else {
                setFocusedSection('tabs');
              }
            }
          } else if (focusedSection === 'search') {
            if (onExitToHeader) {
              onExitToHeader();
            } else {
              setFocusedSection('tabs');
            }
          } else if (focusedSection === 'tabs') {
            if (onExitToHeader) {
              onExitToHeader();
            }
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (focusedSection === 'tabs') {
            setFocusedSection('search');
            searchInputRef.current?.focus();
          } else if (focusedSection === 'search') {
            setFocusedSection('channels');
          } else if (focusedSection === 'channels') {
            const cols = columns;
            if (focusedChannelIndex + cols < channelsCount) {
              setFocusedChannelIndex(prev => prev + cols);
            }
          } else if (focusedSection === 'groups') {
            if (focusedGroupIndex < groupsCount - 1) {
              setFocusedGroupIndex(prev => prev + 1);
            }
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (focusedSection === 'channels') {
            const cols = columns;
            if (focusedChannelIndex % cols === 0) {
              setFocusedSection('groups');
            } else if (focusedChannelIndex > 0) {
              setFocusedChannelIndex(prev => prev - 1);
            }
          } else if (focusedSection === 'tabs') {
            if (focusedTabIndex > 0) {
              setFocusedTabIndex(prev => prev - 1);
              const tabs: ('all' | 'favorites' | 'history')[] = ['all', 'favorites', 'history'];
              setActiveTab(tabs[focusedTabIndex - 1]);
            }
          } else if (focusedSection === 'search') {
            setFocusedSection('groups');
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (focusedSection === 'groups') {
            setFocusedSection('channels');
            setFocusedChannelIndex(0);
          } else if (focusedSection === 'tabs') {
            if (focusedTabIndex < tabsCount - 1) {
              setFocusedTabIndex(prev => prev + 1);
              const tabs: ('all' | 'favorites' | 'history')[] = ['all', 'favorites', 'history'];
              setActiveTab(tabs[focusedTabIndex + 1]);
            }
          } else if (focusedSection === 'channels') {
            if (focusedChannelIndex < channelsCount - 1) {
              setFocusedChannelIndex(prev => prev + 1);
            }
          }
          break;

        case 'Enter':
          e.preventDefault();
          if (focusedSection === 'channels' && channelsCount > 0) {
            onSelectChannel(filteredChannels[focusedChannelIndex]);
          } else if (focusedSection === 'tabs') {
            const tabs: ('all' | 'favorites' | 'history')[] = ['all', 'favorites', 'history'];
            setActiveTab(tabs[focusedTabIndex]);
          } else if (focusedSection === 'groups') {
            setSelectedGroup(groups[focusedGroupIndex]);
          }
          break;

        case 'Backspace':
        case 'Escape':
          e.preventDefault();
          setFocusedSection('groups');
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    keyboardFocusActive, focusedSection, focusedTabIndex, focusedGroupIndex, 
    focusedChannelIndex, groups, filteredChannels, onSelectChannel, columns
  ]);

  // Handle focus scrolling synchronization with extreme optimization
  useEffect(() => {
    if (focusedSection === 'channels' && containerRef.current) {
      const targetRow = Math.floor(focusedChannelIndex / columns);
      const targetScrollTop = targetRow * rowHeight;
      const currentScrollTop = containerRef.current.scrollTop;
      const viewHeight = containerRef.current.clientHeight || 500;

      // Bring the focused row fully inside the visible viewport
      if (targetScrollTop < currentScrollTop) {
        containerRef.current.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      } else if (targetScrollTop + rowHeight > currentScrollTop + viewHeight) {
        containerRef.current.scrollTo({ top: targetScrollTop - viewHeight + rowHeight, behavior: 'smooth' });
      }
    } else if (focusedSection === 'groups') {
      const activeElement = document.getElementById(`group-item-focus-${focusedGroupIndex}`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [focusedSection, focusedChannelIndex, focusedGroupIndex, columns, rowHeight]);

  // Handle programmatic DOM focus synchronization to prevent WebView focus loss/disconnects
  useEffect(() => {
    if (!keyboardFocusActive) return;
    
    if (focusedSection === 'channels') {
      const el = document.getElementById(`channel-card-focus-${focusedChannelIndex}`);
      if (el) {
        el.focus();
      }
    } else if (focusedSection === 'groups') {
      const el = document.getElementById(`group-item-focus-${focusedGroupIndex}`);
      if (el) {
        el.focus();
      }
    } else if (focusedSection === 'search') {
      searchInputRef.current?.focus();
    } else if (focusedSection === 'tabs') {
      const tabIds = ['tab-btn-all', 'tab-btn-favs', 'tab-btn-history'];
      const el = document.getElementById(tabIds[focusedTabIndex]);
      if (el) {
        el.focus();
      }
    }
  }, [focusedSection, focusedChannelIndex, focusedGroupIndex, focusedTabIndex, keyboardFocusActive]);

  const totalRows = Math.ceil(filteredChannels.length / columns);
  const totalHeight = totalRows * rowHeight;

  const visibleChannels = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
    const endRow = Math.min(totalRows - 1, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 2);
    
    const items = [];
    for (let r = startRow; r <= endRow; r++) {
      for (let c = 0; c < columns; c++) {
        const index = r * columns + c;
        if (index < filteredChannels.length) {
          items.push({
            channel: filteredChannels[index],
            index,
            style: {
              position: 'absolute' as const,
              left: `${(c / columns) * 100}%`,
              top: `${r * rowHeight}px`,
              width: `${100 / columns}%`,
              height: `${rowHeight}px`,
              padding: '8px',
            }
          });
        }
      }
    }
    return items;
  }, [filteredChannels, columns, scrollTop, viewportHeight, totalRows, rowHeight]);

  return (
    <div id="channel-list-container" className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-white font-sans max-w-7xl mx-auto p-4 h-[640px] overflow-hidden">
      {/* SIDEBAR */}
      <div id="channel-sidebar" className="lg:col-span-3 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 flex flex-col h-full overflow-hidden">
        
        {/* TAB NAVIGATION */}
        <div id="sidebar-tabs" className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-5">
          <button
            id="tab-btn-all"
            onClick={() => { setActiveTab('all'); setFocusedTabIndex(0); setSelectedGroup('TÜMÜ_ALL'); }}
            className={`flex-1 flex flex-col items-center py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all duration-200 ${
              activeTab === 'all'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            } ${focusedSection === 'tabs' && focusedTabIndex === 0 ? 'ring-2 ring-sky-400 border border-transparent' : ''}`}
          >
            <Tv2 className="w-4 h-4 mb-1" />
            <span>{language === 'tr' ? 'Kanallar' : 'Channels'}</span>
          </button>

          <button
            id="tab-btn-favs"
            onClick={() => { setActiveTab('favorites'); setFocusedTabIndex(1); setSelectedGroup('TÜMÜ_ALL'); }}
            className={`flex-1 flex flex-col items-center py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all duration-200 ${
              activeTab === 'favorites'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            } ${focusedSection === 'tabs' && focusedTabIndex === 1 ? 'ring-2 ring-sky-400 border border-transparent' : ''}`}
          >
            <Star className="w-4 h-4 mb-1" />
            <span>{language === 'tr' ? 'Favori' : 'Favs'}</span>
          </button>

          <button
            id="tab-btn-history"
            onClick={() => { setActiveTab('history'); setFocusedTabIndex(2); setSelectedGroup('TÜMÜ_ALL'); }}
            className={`flex-1 flex flex-col items-center py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            } ${focusedSection === 'tabs' && focusedTabIndex === 2 ? 'ring-2 ring-sky-400 border border-transparent' : ''}`}
          >
            <Clock className="w-4 h-4 mb-1" />
            <span>{language === 'tr' ? 'Geçmiş' : 'History'}</span>
          </button>
        </div>

        <div id="sidebar-groups-header" className="flex items-center gap-2 mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Folder className="w-4 h-4 text-slate-600" />
          <span>{t.groupsTitle}</span>
        </div>

        {/* GROUPS LIST */}
        <div id="sidebar-groups-list" className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-slate-300 font-sans">
          {groups.map((group, idx) => {
            const isGroupSelected = selectedGroup === group;
            const isGroupFocused = focusedSection === 'groups' && focusedGroupIndex === idx;
            const displayName = group === 'TÜMÜ_ALL' ? t.allGroups : group;

            return (
              <div
                id={`group-item-focus-${idx}`}
                key={group}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedGroup(group);
                  setFocusedGroupIndex(idx);
                  setFocusedSection('groups');
                }}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium cursor-pointer transition-all duration-200 tv-focus-item w-full text-left focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                  isGroupFocused
                    ? 'bg-sky-500 text-slate-950 font-bold scale-[1.02] shadow-[0_4px_20px_rgba(56,189,248,0.4)] border-l-4 border-slate-950'
                    : isGroupSelected 
                      ? 'bg-sky-500/15 border-l-4 border-sky-400 text-sky-400 font-semibold' 
                      : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 border-l-4 border-transparent'
                }`}
              >
                <span className="truncate pr-2">{displayName}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${isGroupSelected ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-950/60 text-slate-500'}`}>
                  {group === 'TÜMÜ_ALL' 
                    ? channels.length 
                    : channels.filter(c => c.group === group).length
                  }
                </span>
              </div>
            );
          })}
        </div>

        {/* REMOTE GUIDE HELPER */}
        {keyboardFocusActive && (
          <div id="sidebar-remote-guide" className="mt-3 bg-slate-950/60 border border-slate-850/40 rounded-xl p-3 text-[10px] text-slate-500 leading-normal space-y-1">
            <div className="font-semibold uppercase tracking-wider text-slate-400">
              {language === 'tr' ? 'Kumanda Kılavuzu' : 'Remote Guide'}
            </div>
            <div>
              • {language === 'tr' ? 'Kategoriler arasında gezinirken seçmek için ENTER tuşuna basın.' : 'Use ARROWS to highlight, press ENTER to load category.'}
            </div>
            <div>
              • {language === 'tr' ? 'Kanallar sütunundayken GERİ/ESC ile kategorilere hızlıca dönebilirsiniz.' : 'Press BACK/ESC on channels to return to categories.'}
            </div>
          </div>
        )}

        {/* MANAGE SOURCES BUTTON */}
        {onSwitchTab && (
          <button
            id="manage-sources-sidebar-btn"
            onClick={() => onSwitchTab('playlists')}
            className="mt-4 w-full flex items-center justify-center gap-2.5 py-3.5 bg-slate-950/80 hover:bg-slate-900 text-sky-400 hover:text-sky-300 border border-slate-850 hover:border-sky-500/30 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 shadow-md shrink-0 cursor-pointer"
          >
            <Library className="w-4 h-4" />
            <span>{language === 'tr' ? 'Yayın Kaynaklarını Yönet' : 'Manage Playlist Sources'}</span>
          </button>
        )}
      </div>

      {/* CHANNELS PANEL */}
      <div id="channels-main" className="lg:col-span-9 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 flex flex-col h-full overflow-hidden">
        
        {/* SEARCH AND COUNTS */}
        <div id="channels-header" className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-850">
          <div id="channels-title-wrapper" className="flex items-center gap-3">
            <Tv className="w-5.5 h-5.5 text-sky-400" />
            <div>
              <h3 id="channels-title" className="text-sm font-semibold tracking-wide text-slate-200">
                {activeTab === 'favorites' ? t.favorites : activeTab === 'history' ? t.history : t.allChannels}
              </h3>
              <p id="channels-count" className="text-[10px] text-slate-500 tracking-wider uppercase">
                {filteredChannels.length} {t.totalChannels}
              </p>
            </div>
          </div>

          <div 
            id="search-box"
            className={`relative flex items-center bg-slate-950 rounded-xl border transition-all duration-200 max-w-xs w-full ${
              focusedSection === 'search' 
                ? 'border-sky-500 ring-1 ring-sky-500' 
                : 'border-slate-850 hover:border-slate-750'
            }`}
          >
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
            <input
              id="search-input-field"
              type="text"
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setFocusedSection('search')}
              placeholder={t.searchPlaceholder}
              className="bg-transparent pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none w-full"
            />
          </div>
        </div>

        {/* CHANNELS GRID (VIRTUALIZED FOR 20,000+ CHANNELS) */}
        <div 
          id="channels-grid-viewport"
          ref={containerRef}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          className="flex-1 overflow-y-auto pr-1 relative select-none"
        >
          {filteredChannels.length === 0 ? (
            <div id="channels-empty" className="flex flex-col items-center justify-center text-center py-20 px-4">
              <Tv2 className="w-14 h-14 text-slate-700 mb-4 stroke-[1.2]" />
              <p id="channels-empty-text" className="text-xs text-slate-500 leading-relaxed max-w-sm">
                {activeTab === 'favorites' ? t.noFavs : activeTab === 'history' ? t.noHistory : t.noChannels}
              </p>
            </div>
          ) : (
            <div 
              id="channels-grid-layout" 
              style={{ height: `${totalHeight}px`, position: 'relative', width: '100%' }}
            >
              {visibleChannels.map(({ channel, index, style }) => {
                const isActive = activeChannel?.id === channel.id;
                const isFocused = focusedSection === 'channels' && focusedChannelIndex === index;
                const isFavorite = favorites.includes(channel.id);
                
                const epg = getDynamicEPG(channel.id);
                const currentShow = epg[2];
                const nextShow = epg[3];

                return (
                  <div 
                    key={channel.id} 
                    style={style}
                  >
                    <div
                      id={`channel-card-focus-${index}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        onSelectChannel(channel);
                        setFocusedChannelIndex(index);
                        setFocusedSection('channels');
                      }}
                      className={`w-full h-full group flex flex-col p-4 rounded-xl border bg-slate-950/40 hover:bg-slate-950/85 transition-all duration-300 cursor-pointer text-left relative overflow-hidden tv-focus-item focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                        isActive 
                          ? 'border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/5' 
                          : 'border-slate-850 hover:border-slate-750'
                      } ${isFocused ? 'focused border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.4)] z-10' : ''}`}
                    >
                      <div id={`channel-card-top-${channel.id}`} className="flex items-start gap-3.5 mb-3">
                        <div id={`channel-card-logo-bg-${channel.id}`} className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-850/60 p-1 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-slate-850 transition-colors">
                          <img
                            id={`channel-card-logo-img-${channel.id}`}
                            src={getCleanLogoUrl(channel.logo)}
                            alt={channel.name}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542204172-e7052809a8a7?w=128&auto=format&fit=crop&q=60';
                            }}
                            className="max-w-full max-h-full object-contain rounded"
                          />
                        </div>

                        <div id={`channel-card-names-${channel.id}`} className="min-w-0 flex-1">
                          <div id={`channel-card-status-badge-${channel.id}`} className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[9px] bg-red-600/10 text-red-500 font-bold px-1.5 py-0.5 rounded uppercase tracking-widest border border-red-500/15 animate-pulse shrink-0">
                              {t.liveBadge}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono truncate uppercase tracking-wider">
                              {channel.group}
                            </span>
                          </div>
                          <h4 id={`channel-card-channel-name-${channel.id}`} className="text-xs font-semibold text-slate-100 group-hover:text-sky-400 transition-colors truncate">
                            {channel.name}
                          </h4>
                        </div>
                      </div>

                      <div id={`channel-card-epg-${channel.id}`} className="border-t border-slate-850/60 pt-2 mt-auto w-full">
                        <div id={`channel-card-epg-now-${channel.id}`} className="flex items-baseline gap-1 text-[10px] text-slate-400 mb-1">
                          <span className="font-semibold text-sky-400 shrink-0">{t.nowPlaying}</span>
                          <span className="truncate text-slate-300">{currentShow?.title}</span>
                        </div>
                        
                        <div id={`channel-card-epg-time-${channel.id}`} className="flex items-center gap-2 text-[9px] text-slate-500 font-mono mb-2">
                          <span>{currentShow?.start}</span>
                          <div id={`channel-card-epg-progress-track-${channel.id}`} className="flex-1 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                            <div id={`channel-card-epg-progress-bar-${channel.id}`} className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full" style={{ width: '42%' }} />
                          </div>
                          <span>{currentShow?.end}</span>
                        </div>

                        <div id={`channel-card-epg-next-${channel.id}`} className="flex items-center gap-1 text-[9px] text-slate-500 truncate font-sans">
                          <span className="font-semibold text-slate-500 shrink-0">{t.nextUp}</span>
                          <span className="truncate text-slate-400">{nextShow?.start} - {nextShow?.title}</span>
                        </div>
                      </div>

                      <div id={`channel-card-actions-${channel.id}`} className="absolute top-3.5 right-3.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div
                          id={`channel-card-fav-btn-${channel.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(channel.id);
                          }}
                          className={`p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                            isFavorite 
                              ? 'bg-amber-500 border-amber-500 text-slate-950 font-sans' 
                              : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                          title={t.favoriteTooltip}
                        >
                          <Heart className="w-3.5 h-3.5 fill-current animate-none" />
                        </div>

                        <div
                          id={`channel-card-play-btn-${channel.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectChannel(channel);
                          }}
                          className="p-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 border border-sky-400/20 transition-all duration-200 cursor-pointer"
                          title={t.playTooltip}
                        >
                          <Play className="w-3.5 h-3.5 fill-current stroke-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
