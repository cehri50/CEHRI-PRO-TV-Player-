/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IPTVPlaylistItem {
  id: string;
  name: string;
  logo?: string;
  url: string;
  group: string;
  epgId?: string;
  playlistId: string;
  isFavorite?: boolean;
  urlTvg?: string;
}

export interface EPGProgram {
  id: string;
  title: string;
  start: string; // HH:mm
  end: string;   // HH:mm
  description?: string;
}

export type PlaylistType = 'm3u' | 'xtream' | 'local';

export interface IPTVPlaylist {
  id: string;
  name: string;
  type: PlaylistType;
  url?: string;
  username?: string;
  password?: string;
  serverUrl?: string;
  itemsCount: number;
  addedAt: number;
}

export interface IPTVHistoryItem {
  id: string;
  channelId: string;
  channelName: string;
  logo?: string;
  url: string;
  group: string;
  playlistId: string;
  watchedAt: number;
}

export type IPTVTheme = 'classic-dark' | 'tivimate-teal' | 'netflix-red' | 'golden-royal';
export type IPTVLanguage = 'tr' | 'en';
export type IPTVBufferSize = 'low' | 'medium' | 'high'; // low: 2s, medium: 5s, high: 15s
export type IPTVEngine = 'exoplayer' | 'media3' | 'vlc';

export interface IPTVAppSettings {
  theme: IPTVTheme;
  language: IPTVLanguage;
  bufferSize: IPTVBufferSize;
  hardwareAcceleration: boolean;
  autoPlayLast: boolean;
  aspectRatio: 'auto' | '16-9' | '4-3' | 'stretch' | 'zoom';
  playerEngine: IPTVEngine;
  userAgent: string;
  portalUrl: string;
  leanbackBannerEnabled: boolean;
  leanbackRecommendationsEnabled: boolean;
  gatewayUrl?: string;
  streamProxyEnabled?: boolean;
}

export interface CrashLog {
  id: string;
  timestamp: number;
  channelName?: string;
  type: 'network' | 'decoder' | 'system';
  message: string;
  details: string;
}

