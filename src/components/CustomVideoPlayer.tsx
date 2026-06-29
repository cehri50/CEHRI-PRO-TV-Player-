/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  ChevronLeft, RefreshCw, AlertCircle, Tv,
  Loader2, Info, ArrowLeft, Heart, Layers, PictureInPicture
} from 'lucide-react';
import { IPTVPlaylistItem, IPTVAppSettings } from '../types';
import { getDynamicEPG } from '../demoData';
import { getCleanLogoUrl, getApiUrl } from '../utils';

interface CustomVideoPlayerProps {
  channel: IPTVPlaylistItem;
  onClose: () => void;
  onNextChannel: () => void;
  onPrevChannel: () => void;
  settings: IPTVAppSettings;
  favorites: string[];
  onToggleFavorite: (channelId: string) => void;
  language: 'tr' | 'en';
  onAddCrashLog?: (type: 'network' | 'decoder' | 'system', message: string, details: string, channelName?: string) => void;
}

export default function CustomVideoPlayer({
  channel,
  onClose,
  onNextChannel,
  onPrevChannel,
  settings,
  favorites,
  onToggleFavorite,
  language,
  onAddCrashLog
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80); // 0 to 100
  const [isBuffering, setIsBuffering] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Custom states
  const [aspectRatio, setAspectRatio] = useState<'auto' | '16-9' | '4-3' | 'stretch' | 'zoom'>(settings.aspectRatio);
  const [showControls, setShowControls] = useState(true);
  const [osdFocusedIndex, setOsdFocusedIndex] = useState<number>(2); // Default to Play/Pause button
  const [resolutionInfo, setResolutionInfo] = useState('HD 1080p');
  const [fpsInfo, setFpsInfo] = useState(60);
  const [reconnectCount, setReconnectCount] = useState(0);

  const controlsTimeoutRef = useRef<number | null>(null);

  const isFavorite = favorites.includes(channel.id);
  const epg = getDynamicEPG(channel.id);
  const currentShow = epg[2]; // Active show
  const nextShow = epg[3]; // Next show

  const t = {
    tr: {
      nowPlaying: 'Şu An Canlı:',
      next: 'Sıradaki Program:',
      reconnecting: 'Yeniden bağlanılıyor...',
      buffering: `Kanal Arabelleğe Alınıyor (${settings.playerEngine === 'vlc' ? 'VLC Player Core' : settings.playerEngine === 'media3' ? 'Media3 Core' : 'ExoPlayer Core'})...`,
      aspectRatio: 'Ekran Oranı:',
      errorLoading: 'Kanal yüklenemedi. Yayın adresi veya internet bağlantınızı kontrol edin.',
      stats: 'Yayın İstatistikleri:',
      hardware: 'Donanım Hızlandırma',
      active: 'Aktif',
      back: 'Geri Dön',
      pip: 'PiP Modu'
    },
    en: {
      nowPlaying: 'Now Live:',
      next: 'Next Up:',
      reconnecting: 'Reconnecting...',
      buffering: `Buffering Stream (${settings.playerEngine === 'vlc' ? 'VLC Player Core' : settings.playerEngine === 'media3' ? 'Media3 Core' : 'ExoPlayer Core'})...`,
      aspectRatio: 'Aspect Ratio:',
      errorLoading: 'Failed to load stream. Check link validity or internet connection.',
      stats: 'Stream Stats:',
      hardware: 'Hardware Decoding',
      active: 'Enabled',
      back: 'Go Back',
      pip: 'PiP Mode'
    }
  }[language];

  // OSD auto-hide handler
  const triggerShowControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying && !isBuffering) {
        setShowControls(false);
      }
    }, 3500);
  };

  // Setup Hls.js or Native Video Player
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsBuffering(true);
    setErrorMsg(null);

    // Destroy previous instances
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (mpegtsRef.current) {
      mpegtsRef.current.destroy();
      mpegtsRef.current = null;
    }

    const originalUrl = channel.url;
    let streamUrl = originalUrl;

    // Detect if this is an Xtream Codes live stream or standard .ts stream
    const isXtreamLive = originalUrl.includes('/live/') && !originalUrl.includes('player_api.php');
    
    // Determine if proxying is needed/active:
    // 1. Browsers cannot load HTTP streams when the origin is HTTPS (Mixed Content error). So we force proxying for HTTP URLs in HTTPS environments.
    // 2. Or if the user explicitly enabled stream proxy in settings and the stream is HTTP.
    const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
    const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isHttpStream = originalUrl.startsWith('http://');
    // On native platforms like Android TV via Capacitor, there is no express server to host the stream proxy.
    // However, Capacitor WebView permits HTTP streams via mixed content configuration (allowMixedContent).
    const shouldProxyStream = !isCapacitor && ((settings.streamProxyEnabled && isHttpStream) || (isHttpsOrigin && isHttpStream));

    if (shouldProxyStream) {
      const relativeProxyPath = `/api/stream/proxy?url=${encodeURIComponent(originalUrl)}`;
      streamUrl = getApiUrl(relativeProxyPath, settings.gatewayUrl);
      console.log(`[Stream Proxy] Routing stream via proxy: ${streamUrl}`);
    } else {
      console.log(`[Stream Direct] Playing stream directly: ${streamUrl}`);
    }

    // We can try to play it with Hls.js first if it's an .m3u8 or if we rewrite Xtream .ts to .m3u8
    const isHls = originalUrl.includes('.m3u8') || (isXtreamLive && (originalUrl.endsWith('.ts') || !originalUrl.includes('.')));
    
    // If we classified as HLS and it is an Xtream stream with .ts, rewrite the URL to .m3u8 for Hls.js
    let activeUrl = streamUrl;
    if (isHls && isXtreamLive) {
      if (shouldProxyStream) {
        let rewrittenOriginal = originalUrl;
        if (rewrittenOriginal.endsWith('.ts')) {
          rewrittenOriginal = rewrittenOriginal.replace(/\.ts$/, '.m3u8');
        } else if (!rewrittenOriginal.includes('.') && !rewrittenOriginal.endsWith('/')) {
          rewrittenOriginal = rewrittenOriginal + '.m3u8';
        }
        const relativeProxyPath = `/api/stream/proxy?url=${encodeURIComponent(rewrittenOriginal)}`;
        activeUrl = getApiUrl(relativeProxyPath, settings.gatewayUrl);
      } else {
        if (activeUrl.endsWith('.ts')) {
          activeUrl = activeUrl.replace(/\.ts$/, '.m3u8');
        } else if (!activeUrl.includes('.') && !activeUrl.endsWith('/')) {
          activeUrl = activeUrl + '.m3u8';
        }
      }
    }

    // Buffer parameters based on user settings
    const maxBufferLength = settings.bufferSize === 'low' ? 2 : settings.bufferSize === 'medium' ? 6 : 15;

    // Track active MediaSource instance for deep diagnostics
    if (typeof window !== 'undefined' && (window as any).MediaSource) {
      const MS = (window as any).MediaSource;
      
      // Wrap URL.createObjectURL to detect and track when MediaSource is created & bound
      if (!(window as any)._wrapped_createObjectURL) {
        (window as any)._wrapped_createObjectURL = true;
        const originalCreateObjectURL = URL.createObjectURL;
        URL.createObjectURL = function (obj: any) {
          if (obj instanceof MS) {
            console.log('[DIAGNOSTIC LOG - MediaSource Created] Captured via URL.createObjectURL tracking.');
            (window as any)._activeMediaSource = obj;
          }
          return originalCreateObjectURL.call(this, obj);
        };
      }

      if (!MS._wrapped_log) {
        MS._wrapped_log = true;
        const originalAdd = MS.prototype.addEventListener;
        MS.prototype.addEventListener = function (type: string, listener: any, options: any) {
          if (type === 'sourceopen' || type === 'sourceended' || type === 'sourceclose') {
            const wrappedListener = function (this: any, ev: any) {
              console.log(`[DIAGNOSTIC LOG - MSE EVENT] ${type}: MediaSource readyState =`, this.readyState);
              (window as any)._activeMediaSource = this;
              if (listener) listener.call(this, ev);
            };
            return originalAdd.call(this, type, wrappedListener, options);
          }
          return originalAdd.call(this, type, listener, options);
        };
      }
    }

    function playMpegTs(url: string) {
      try {
        if (mpegtsRef.current) {
          try {
            mpegtsRef.current.pause();
            mpegtsRef.current.unload();
            mpegtsRef.current.detachMediaElement();
          } catch (_) {}
          mpegtsRef.current.destroy();
          mpegtsRef.current = null;
        }

        // Validate support details as requested
        const isMpegTsSupported = mpegts.isSupported();
        const features = mpegts.getFeatureList();
        console.log('[MPEGTS SUPPORT CHECK]', {
          isSupported: isMpegTsSupported,
          mseLivePlayback: features.mseLivePlayback
        });

        // Use 'mpegts' or 'm2ts' for raw TS stream payload types
        const mpegtsPlayer = mpegts.createPlayer({
          type: 'mpegts',
          isLive: true,
          url: url
        }, {
          enableWorker: true,
          enableStashBuffer: false,
          stashInitialSize: 128,
          liveBufferLatencyChasing: true
        });

        mpegtsRef.current = mpegtsPlayer;
        mpegtsPlayer.attachMediaElement(video);
        mpegtsPlayer.load();
        
        const playPromise = mpegtsPlayer.play() as any;
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setIsBuffering(false);
            })
            .catch((playErr: any) => {
              console.error('[MPEGTS PLAY ERROR] play() rejected:', playErr);
              setIsPlaying(false);
              setIsBuffering(false); // CRITICAL FIX: Stops the infinite spinner when play() fails/rejects
            });
        } else {
          setIsPlaying(true);
          setIsBuffering(false);
        }

        // Log required events: error, statistics_info, media_info, loading_complete
        mpegtsPlayer.on(mpegts.Events.ERROR, (type, detail, info) => {
          console.error('[MPEGTS EVENT] error | Type:', type, 'Detail:', detail, 'Info:', JSON.stringify(info || {}));
          if (onAddCrashLog) {
            onAddCrashLog(
              'decoder',
              `mpegts.js decoder exception: ${type}`,
              `Detail: ${detail} - Info: ${JSON.stringify(info || {})}`,
              channel.name
            );
          }
          setErrorMsg(t.errorLoading);
          setIsBuffering(false); // CRITICAL FIX: Stops the infinite spinner on error
        });

        mpegtsPlayer.on(mpegts.Events.STATISTICS_INFO, (stats) => {
          console.log('[MPEGTS EVENT] statistics_info:', JSON.stringify(stats));
        });

        mpegtsPlayer.on(mpegts.Events.MEDIA_INFO, (mediaInfo) => {
          console.log('[MPEGTS EVENT] media_info:', JSON.stringify(mediaInfo));
          setResolutionInfo(`MPEG-TS Live Stream (${mediaInfo.width || '1080'}p)`);
        });

        mpegtsPlayer.on(mpegts.Events.LOADING_COMPLETE, () => {
          console.log('[MPEGTS EVENT] loading_complete');
        });

        mpegtsPlayer.on(mpegts.Events.METADATA_ARRIVED, () => {
          console.log('[MPEGTS EVENT] metadata_arrived');
          setResolutionInfo(`MPEG-TS Live Stream (1080p)`);
        });
      } catch (err: any) {
        console.error('Failed to init mpegts.js:', err);
        setErrorMsg(t.errorLoading);
        setIsBuffering(false); // CRITICAL FIX: Stops the infinite spinner on init exception
      }
    }

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false, // Disabling low latency prevents aggressive live-edge seeking
        backBufferLength: maxBufferLength,
        maxBufferLength: maxBufferLength,
        maxMaxBufferLength: maxBufferLength * 2, // Give the buffer extra headroom
        maxBufferSize: 30 * 1000 * 1000, // 30MB max
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        liveSyncDurationCount: 3, // Target playing 3 segments behind live edge for a stable buffer
        liveMaxLatencyDurationCount: 6, // Maximum latency allowed before resync
        enableSoftwareAES: true, // Safeguard for encrypted feeds
        // Force gap controller parameters to jump over small timeline discrepancies
        maxStarvationDelay: 2,
        highBufferWatchdogPeriod: 2,
        nudgeMaxRetry: 5
      });

      hlsRef.current = hls;

      // Debug Mode: Log all HLS.js events and capture specific ones for telemetry
      Object.keys(Hls.Events).forEach((key) => {
        const eventName = Hls.Events[key as keyof typeof Hls.Events];
        hls.on(eventName, (event, data) => {
          console.log(`[HLS.JS EVENT] ${eventName}:`, data);
          
          // Custom highly visible telemetry logs for specific buffer / stall events
          const lowerName = eventName.toLowerCase();
          if (lowerName.includes('stall') || lowerName.includes('buffer')) {
            console.warn(`[TELEMETRY - HLS EVENT - ${eventName.toUpperCase()}]`, data);
          }
        });
      });

      // Precise Diagnostic Listeners for Hls.js Events
      hls.on(Hls.Events.BUFFER_APPENDED, (event, data) => {
        let bufferedRangesStr = '';
        if (video.buffered && video.buffered.length > 0) {
          const ranges = [];
          for (let i = 0; i < video.buffered.length; i++) {
            ranges.push(`[${video.buffered.start(i).toFixed(3)}, ${video.buffered.end(i).toFixed(3)}]`);
          }
          bufferedRangesStr = ranges.join(', ');

          // Bulletproof playhead starvation recovery mechanism:
          // If we have buffered data but current playhead is at 0 (or before the first buffered range),
          // nudge the playhead to the start of the first buffered range to kickstart decoding.
          const firstStart = video.buffered.start(0);
          if (video.currentTime < firstStart && (firstStart - video.currentTime) > 0.5) {
            console.warn(`[DIAGNOSTIC & RECOVERY] Playhead starvation detected! currentTime is ${video.currentTime.toFixed(3)}s, but buffer starts at ${firstStart.toFixed(3)}s. Nudging playhead to buffer start...`);
            video.currentTime = firstStart + 0.1;
          }
        } else {
          bufferedRangesStr = 'none';
        }
        console.log('[DIAGNOSTIC LOG - HLS.Events.BUFFER_APPENDED]', {
          bufferedLength: video.buffered ? video.buffered.length : 0,
          bufferedRanges: bufferedRangesStr,
          readyState: video.readyState,
          currentTime: video.currentTime,
          mediaSourceReadyState: (window as any)._activeMediaSource ? (window as any)._activeMediaSource.readyState : 'unknown'
        });
      });

      hls.on(Hls.Events.BUFFER_CODECS, (event, data) => {
        console.log('[DIAGNOSTIC LOG - HLS.Events.BUFFER_CODECS]', {
          audioCodec: data.audio?.codec,
          videoCodec: data.video?.codec,
          audioContainer: data.audio?.container,
          videoContainer: data.video?.container,
          tracks: Object.keys(data.tracks || {}).reduce((acc: any, key) => {
            const track = (data.tracks as any)[key];
            acc[key] = {
              codec: track?.codec,
              container: track?.container,
              metadata: track?.metadata
            };
            return acc;
          }, {})
        });
      });

      hls.on(Hls.Events.FRAG_PARSING_INIT_SEGMENT, (event, data: any) => {
        console.log('[DIAGNOSTIC LOG - HLS.Events.FRAG_PARSING_INIT_SEGMENT]', {
          id: data.id,
          tracks: Object.keys(data.tracks || {}).reduce((acc: any, key) => {
            const track = (data.tracks as any)[key];
            acc[key] = {
              codec: track?.codec,
              container: track?.container,
              timescale: track?.timescale,
              width: track?.width,
              height: track?.height,
              audioSampleRate: track?.audioSampleRate
            };
            return acc;
          }, {})
        });
      });

      hls.loadSource(activeUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[HLS EVENT] MANIFEST_PARSED. Initiating play()...');
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('[DIAGNOSTIC LOG - play() RESOLVED] Playback successfully started.');
              setIsPlaying(true);
            })
            .catch((playErr) => {
              console.error('[DIAGNOSTIC LOG - play() REJECTED] Detailed play error:', {
                name: playErr?.name,
                message: playErr?.message,
                code: playErr?.code,
                stack: playErr?.stack,
                videoReadyState: video.readyState,
                videoNetworkState: video.networkState
              });
              setIsPlaying(false);
              setIsBuffering(false);
            });
        } else {
          console.log('[DIAGNOSTIC LOG - play()] play() returned undefined synchronously (no promise).');
          setIsPlaying(true);
        }
        setIsBuffering(false);
      });

      hls.on(Hls.Events.LEVEL_LOADED, () => {
        console.log('[HLS EVENT] LEVEL_LOADED');
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        console.log('[HLS EVENT] FRAG_LOADED');
      });

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log('[HLS EVENT] MEDIA_ATTACHED');
      });

      hls.on(Hls.Events.FRAG_BUFFERED, (event, data) => {
        // Retrieve resolution details
        if (hls.levels && hls.levels[hls.currentLevel]) {
          const level = hls.levels[hls.currentLevel];
          setResolutionInfo(`${level.width}x${level.height} @ ${Math.round(level.bitrate / 1000)}kbps`);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('[TELEMETRY - HLS EVENT - ERROR]', {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          error: data.error?.message || data.error,
          videoReadyState: video.readyState,
          videoPaused: video.paused,
          videoNetworkState: video.networkState
        });
        if (onAddCrashLog) {
          onAddCrashLog(
            data.type === Hls.ErrorTypes.NETWORK_ERROR ? 'network' : 'decoder',
            `HLS Decoder Exception: ${data.details || 'unknown details'}`,
            `Fatal: ${data.fatal} - type: ${data.type} - response: ${data.response?.code || 'no status'}`,
            channel.name
          );
        }
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('Network stream error, retrying...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('Media decoding error, recovering...');
              hls.recoverMediaError();
              break;
            default:
              // If HLS fails and it was an Xtream stream, fall back to playing original raw .ts stream via mpegts.js!
              if (isXtreamLive && mpegts.isSupported()) {
                console.log('HLS failed. Falling back to MPEG-TS decoder.');
                playMpegTs(streamUrl);
              } else {
                setErrorMsg(t.errorLoading);
                setIsBuffering(false);
              }
              break;
          }
        }
      });

    } else if ((streamUrl.includes('.ts') || streamUrl.includes('.mpegts') || isXtreamLive) && mpegts.isSupported()) {
      playMpegTs(streamUrl);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari or devices with native HLS playback support
      video.src = activeUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            setIsPlaying(false);
            setIsBuffering(false);
          });
        setIsBuffering(false);
      });
      video.addEventListener('error', () => {
        if (onAddCrashLog) {
          onAddCrashLog(
            'decoder',
            `Native video error: code ${video.error?.code || 'unknown'}`,
            `Message: ${video.error?.message || 'none'}`,
            channel.name
          );
        }
        setErrorMsg(t.errorLoading);
        setIsBuffering(false);
      });
    } else {
      // Raw mp4, mkv or direct formats
      video.src = streamUrl;
      video.addEventListener('canplay', () => {
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            setIsPlaying(false);
            setIsBuffering(false);
          });
        setIsBuffering(false);
      });
      video.addEventListener('error', () => {
        if (onAddCrashLog) {
          onAddCrashLog(
            'decoder',
            `Native direct player error: code ${video.error?.code || 'unknown'}`,
            `Message: ${video.error?.message || 'none'}`,
            channel.name
          );
        }
        setErrorMsg(t.errorLoading);
        setIsBuffering(false);
      });
    }

    triggerShowControls();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (mpegtsRef.current) {
        try {
          mpegtsRef.current.pause();
          mpegtsRef.current.unload();
          mpegtsRef.current.detachMediaElement();
        } catch (_) {}
        mpegtsRef.current.destroy();
        mpegtsRef.current = null;
      }
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [channel.id, settings.bufferSize, reconnectCount]);

  // Video buffering / event state observers and HTML5 state logger
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setErrorMsg(null);
    };
    const onPause = () => setIsPlaying(false);

    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);

    // Debug: Monitor and log video readyState & error transitions
    let lastReadyState = video.readyState;
    let lastErrorCode = video.error?.code || null;
    let lastTimeupdateLogTime = 0;

    const logStateChange = (eventName: string) => {
      if (eventName === 'timeupdate') {
        const now = Date.now();
        if (now - lastTimeupdateLogTime < 500) {
          return;
        }
        lastTimeupdateLogTime = now;
      }

      const currentReadyState = video.readyState;
      const currentNetworkState = video.networkState;
      const currentSrc = video.currentSrc;
      const currentErrorCode = video.error?.code || null;
      const currentErrorMessage = video.error?.message || '';
      const isPaused = video.paused;
      const hasEnded = video.ended;

      console.log(`[HTML5 VIDEO STATE] Event: ${eventName} | readyState: ${currentReadyState} (was ${lastReadyState}) | networkState: ${currentNetworkState} | currentSrc: ${currentSrc} | error.code: ${currentErrorCode} (${currentErrorMessage}) | paused: ${isPaused} | ended: ${hasEnded}`);
      
      // Analyze timeline gaps / playhead starvation
      let isPlayheadBuffered = false;
      let bufferedRangesStr = '';
      if (video.buffered && video.buffered.length > 0) {
        const ranges = [];
        for (let i = 0; i < video.buffered.length; i++) {
          const start = video.buffered.start(i);
          const end = video.buffered.end(i);
          ranges.push(`[${start.toFixed(3)}, ${end.toFixed(3)}]`);
          if (video.currentTime >= start && video.currentTime <= end) {
            isPlayheadBuffered = true;
          }
        }
        bufferedRangesStr = ranges.join(', ');
      } else {
        bufferedRangesStr = 'none';
      }

      if (!isPlayheadBuffered && video.buffered && video.buffered.length > 0) {
        console.warn(`[DIAGNOSTIC LOG - PLAYHEAD STARVATION DETECTED] Playhead is at ${video.currentTime.toFixed(3)}s, but buffered ranges are: ${bufferedRangesStr}. The decoder has no segment loaded for the current playhead time. readyState is ${currentReadyState}.`);
      }

      // High-precision diagnostic logs on loadedmetadata or important readyState updates
      if (eventName === 'loadedmetadata' || eventName === 'loadeddata' || eventName === 'canplay' || eventName === 'playing') {
        console.log(`[DIAGNOSTIC LOG - HTML5 VIDEO STATE & METRICS] Event: ${eventName}`, {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          currentTime: video.currentTime,
          readyState: currentReadyState,
          networkState: currentNetworkState,
          bufferedLength: video.buffered ? video.buffered.length : 0,
          bufferedRanges: bufferedRangesStr,
          bufferedEnd0: video.buffered && video.buffered.length > 0 ? video.buffered.end(0) : 'N/A',
          error: video.error ? { code: video.error.code, message: video.error.message } : null,
          mediaSourceReadyState: (window as any)._activeMediaSource ? (window as any)._activeMediaSource.readyState : 'unknown (not captured)'
        });
      }

      lastReadyState = currentReadyState;
      lastErrorCode = currentErrorCode;
    };

    const monitorEvents = [
      'loadstart', 'suspend', 'abort', 'error', 'emptied', 'stalled',
      'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
      'playing', 'waiting', 'seeking', 'seeked', 'ratechange',
      'durationchange', 'progress', 'timeupdate'
    ];

    const handlers: { [key: string]: () => void } = {};
    monitorEvents.forEach((evt) => {
      handlers[evt] = () => logStateChange(evt);
      video.addEventListener(evt, handlers[evt]);
    });

    // requestVideoFrameCallback setup for first frame verification
    let frameCallbackId: number | null = null;
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      console.log('[DIAGNOSTIC LOG] requestVideoFrameCallback IS supported on this browser.');
      const onFrame = (now: DOMHighResTimeStamp, metadata: any) => {
        console.log('[DIAGNOSTIC LOG - requestVideoFrameCallback FRAME GENERATED]', {
          now,
          metadata,
          presentationTime: metadata.presentationTime,
          expectedDisplayTime: metadata.expectedDisplayTime,
          width: video.videoWidth,
          height: video.videoHeight,
          presentedFrames: metadata.presentedFrames
        });
        frameCallbackId = (video as any).requestVideoFrameCallback(onFrame);
      };
      frameCallbackId = (video as any).requestVideoFrameCallback(onFrame);
    } else {
      console.log('[DIAGNOSTIC LOG] requestVideoFrameCallback is NOT supported on this browser.');
    }

    // Run a fast poller to make sure we don't miss any intermediate readyState/error transitions
    const poller = setInterval(() => {
      if (video.readyState !== lastReadyState || (video.error?.code || null) !== lastErrorCode) {
        logStateChange('poll_interval');
      }
    }, 200);

    // Telemetry Poller: runs every 500 ms to capture performance metrics
    const telemetryInterval = setInterval(() => {
      const hlsInstance = hlsRef.current as any;
      
      const bufferedStart0 = video.buffered && video.buffered.length > 0 ? video.buffered.start(0).toFixed(3) : 'N/A';
      const bufferedEnd0 = video.buffered && video.buffered.length > 0 ? video.buffered.end(0).toFixed(3) : 'N/A';
      
      const quality = (video as any).getVideoPlaybackQuality ? (video as any).getVideoPlaybackQuality() : null;
      const droppedFrames = quality ? quality.droppedVideoFrames : ((video as any).webkitDroppedFrameCount || 0);
      const decodedFrames = quality ? quality.totalVideoFrames : ((video as any).webkitDecodedFrameCount || 0);
      
      const currentLevel = hlsInstance ? hlsInstance.currentLevel : 'N/A';
      const bandwidthEstimate = hlsInstance ? hlsInstance.bandwidthEstimate : 'N/A';
      const latency = hlsInstance ? hlsInstance.latency : 'N/A';
      const liveSyncPosition = hlsInstance ? hlsInstance.liveSyncPosition : 'N/A';
      
      console.log(`[PLAYBACK TELEMETRY] t: ${video.currentTime.toFixed(3)}s | buf: [${bufferedStart0}, ${bufferedEnd0}] | rate: ${video.playbackRate} | dropped: ${droppedFrames} | decoded: ${decodedFrames} | level: ${currentLevel} | bw: ${bandwidthEstimate} | lat: ${latency} | liveSync: ${liveSyncPosition}`);
    }, 500);

    // Initial state log
    logStateChange('init_observer');

    return () => {
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      
      monitorEvents.forEach((evt) => {
        video.removeEventListener(evt, handlers[evt]);
      });
      clearInterval(poller);
      clearInterval(telemetryInterval);

      if (frameCallbackId !== null && 'cancelVideoFrameCallback' in HTMLVideoElement.prototype) {
        (video as any).cancelVideoFrameCallback(frameCallbackId);
      }
    };
  }, [channel.id]);

  // Remote D-pad layout navigation keyboard handlers
  useEffect(() => {
    const handlePlayerKeys = (e: KeyboardEvent) => {
      // Waking up controls on any key press
      const wasHidden = !showControls;
      triggerShowControls();

      // TV Channel Up/Down buttons (often PageUp/PageDown on many web views)
      if (e.key === 'PageUp' || e.key === 'ChannelUp') {
        e.preventDefault();
        onNextChannel();
        return;
      }
      if (e.key === 'PageDown' || e.key === 'ChannelDown') {
        e.preventDefault();
        onPrevChannel();
        return;
      }

      // If controls were hidden, the first press of Arrow Keys/Enter/Space just wakes them up
      if (wasHidden && (e.key.startsWith('Arrow') || e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        setOsdFocusedIndex(2); // Default to Play/Pause on wake-up
        return;
      }

      // If controls are hidden and they press Up/Down, zap channels immediately
      if (!showControls) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          onNextChannel();
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          onPrevChannel();
          return;
        }
      }

      // If controls are visible, handle full OSD key navigation
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setOsdFocusedIndex((prev) => {
            if (prev >= 5 && prev <= 9) {
              // Move from Row 2 to Row 1
              if (prev === 5) return 1; // Mute -> Prev
              if (prev === 6) return 2; // Volume Slider -> Play
              if (prev === 7) return 3; // PiP -> Next
              if (prev === 8) return 4; // Aspect -> Favorite
              if (prev === 9) return 4; // Fullscreen -> Favorite
            }
            if (prev >= 1 && prev <= 4) {
              // Move from Row 1 to Row 0
              return 0; // OSD Back button
            }
            return prev; // Stay on Row 0
          });
          break;

        case 'ArrowDown':
          e.preventDefault();
          setOsdFocusedIndex((prev) => {
            if (prev === 0) {
              // Move from Row 0 to Row 1 (Play/Pause)
              return 2;
            }
            if (prev >= 1 && prev <= 4) {
              // Move from Row 1 to Row 2
              if (prev === 1) return 5; // Prev -> Mute
              if (prev === 2) return 6; // Play -> Volume Slider
              if (prev === 3) return 7; // Next -> PiP
              if (prev === 4) return 8; // Favorite -> Aspect
            }
            return prev; // Stay on Row 2
          });
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (osdFocusedIndex === 6) {
            // Volume slider adjustments
            setVolume((prev) => {
              const v = Math.max(0, prev - 10);
              if (videoRef.current) videoRef.current.volume = v / 100;
              return v;
            });
          } else {
            setOsdFocusedIndex((prev) => {
              if (prev >= 1 && prev <= 4) {
                return Math.max(1, prev - 1); // Row 1 limits
              }
              if (prev >= 5 && prev <= 9) {
                return Math.max(5, prev - 1); // Row 2 limits
              }
              return prev;
            });
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (osdFocusedIndex === 6) {
            // Volume slider adjustments
            setVolume((prev) => {
              const v = Math.min(100, prev + 10);
              if (videoRef.current) videoRef.current.volume = v / 100;
              return v;
            });
          } else {
            setOsdFocusedIndex((prev) => {
              if (prev >= 1 && prev <= 4) {
                return Math.min(4, prev + 1); // Row 1 limits
              }
              if (prev >= 5 && prev <= 9) {
                return Math.min(9, prev + 1); // Row 2 limits
              }
              return prev;
            });
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          // Trigger OSD focus element's direct action
          switch (osdFocusedIndex) {
            case 0: // Close
              if (isFullscreen) handleToggleFullscreen();
              else onClose();
              break;
            case 1: // Prev Channel
              onPrevChannel();
              break;
            case 2: // Play/Pause
              togglePlay();
              break;
            case 3: // Next Channel
              onNextChannel();
              break;
            case 4: // Favorite
              onToggleFavorite(channel.id);
              break;
            case 5: // Mute
              toggleMute();
              break;
            case 6: // Enter on Volume Slider mutes/unmutes
              toggleMute();
              break;
            case 7: // PiP
              handlePiP();
              break;
            case 8: // Aspect Ratio
              cycleAspectRatio();
              break;
            case 9: // Fullscreen
              handleToggleFullscreen();
              break;
            default:
              togglePlay();
              break;
          }
          break;

        case 'Backspace':
        case 'Escape':
          e.preventDefault();
          if (isFullscreen) {
            handleToggleFullscreen();
          } else {
            onClose();
          }
          break;

        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          handleToggleFullscreen();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handlePlayerKeys);
    return () => {
      window.removeEventListener('keydown', handlePlayerKeys);
    };
  }, [showControls, osdFocusedIndex, onNextChannel, onPrevChannel, onClose, isFullscreen, volume, isMuted, isBuffering, isPlaying, channel.id]);

  // Keep DOM focus synchronized with OSD focus index for better accessibility and native support
  useEffect(() => {
    if (showControls && osdFocusedIndex >= 0) {
      const elementsMap: { [key: number]: string } = {
        0: 'btn-osd-back',
        1: 'btn-player-prev',
        2: 'btn-player-play-pause',
        3: 'btn-player-next',
        4: 'btn-player-fav',
        5: 'btn-player-mute',
        6: 'slider-player-volume',
        7: 'btn-player-pip',
        8: 'btn-player-aspect',
        9: 'btn-player-fullscreen'
      };
      const id = elementsMap[osdFocusedIndex];
      if (id) {
        const el = document.getElementById(id);
        if (el) {
          try {
            el.focus();
          } catch (_) {}
        }
      }
    }
  }, [osdFocusedIndex, showControls]);

  // Handle focus & visibility changes to prevent Android TV BufferQueue disconnect issues
  useEffect(() => {
    const handleFocus = () => {
      console.log('[WINDOW FOCUS] Webview focused, restoring stream graphics bindings...');
      const video = videoRef.current;
      const hls = hlsRef.current;
      if (video && hls) {
        try {
          console.log('[RECOVERY] Recovering HLS media error after window focus regained...');
          hls.recoverMediaError();
          if (isPlaying) {
            video.play().catch(() => {});
          }
        } catch (e) {
          console.error('[RECOVERY] Failed to recover HLS media error on focus', e);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[VISIBILITY CHANGE] Document visible, recovering stream graphics...');
        const video = videoRef.current;
        const hls = hlsRef.current;
        if (video && hls) {
          try {
            hls.recoverMediaError();
            if (isPlaying) {
              video.play().catch(() => {});
            }
          } catch (e) {
            console.error('[RECOVERY] Failed to recover HLS media error on visibility change', e);
          }
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying]);

  // Handle Play/Pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
    triggerShowControls();
  };

  // Handle Mute
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
    triggerShowControls();
  };

  // Adjust volume manually
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v / 100;
      videoRef.current.muted = v === 0;
      setIsMuted(v === 0);
    }
    triggerShowControls();
  };

  // Handle Fullscreen
  const handleToggleFullscreen = () => {
    const container = document.getElementById('video-player-root');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
    triggerShowControls();
  };

  // Handle aspect ratios using Tailwind objects-fit styles
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '16-9':
        return 'aspect-[16/9] object-contain w-full h-full';
      case '4-3':
        return 'aspect-[4/3] object-contain h-full mx-auto';
      case 'stretch':
        return 'object-fill w-full h-full';
      case 'zoom':
        return 'object-cover w-full h-full';
      case 'auto':
      default:
        return 'object-contain w-full h-full';
    }
  };

  const cycleAspectRatio = () => {
    const ratios: ('auto' | '16-9' | '4-3' | 'stretch' | 'zoom')[] = ['auto', '16-9', '4-3', 'stretch', 'zoom'];
    const currentIdx = ratios.indexOf(aspectRatio);
    const nextIdx = (currentIdx + 1) % ratios.length;
    setAspectRatio(ratios[nextIdx]);
    triggerShowControls();
  };

  const handlePiP = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div 
      id="video-player-root"
      onMouseMove={triggerShowControls}
      onClick={triggerShowControls}
      className="fixed inset-0 bg-black flex items-center justify-center text-white z-40 overflow-hidden font-sans group select-none"
    >
      {/* HTML5 Video Element */}
      <video
        id="iptv-html5-video"
        ref={videoRef}
        referrerPolicy="no-referrer"
        playsInline
        className={`w-full h-full transition-all duration-300 ${getAspectRatioClass()}`}
      />

      {/* Buffering Screen Overlay */}
      {isBuffering && (
        <div id="player-buffering-overlay" className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
          <Loader2 className="w-14 h-14 text-sky-400 animate-spin mb-4" />
          <p id="player-buffering-txt" className="text-xs tracking-wider text-slate-300 font-medium font-sans">
            {t.buffering}
          </p>
        </div>
      )}

      {/* Connection Failure Error Overlay */}
      {errorMsg && (
        <div id="player-error-overlay" className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-10 px-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4 stroke-[1.5]" />
          <p id="player-error-title" className="text-sm font-semibold text-slate-100 mb-2 max-w-md">{errorMsg}</p>
          <div id="player-error-actions" className="flex items-center gap-3 mt-4">
            <button
              id="btn-player-retry"
              onClick={() => {
                setReconnectCount(prev => prev + 1);
                setIsBuffering(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 animate-none" />
              <span>Tekrar Dene (Retry)</span>
            </button>
            <button
              id="btn-player-close"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {t.back}
            </button>
          </div>
        </div>
      )}

      {/* Glassmorphic OSD TV Controls Dashboard (Fades Out Automatically) */}
      <div 
        id="player-osd-dashboard"
        className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/80 flex flex-col justify-between p-6 z-20 transition-opacity duration-500 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* TOP PANEL: Channel Logo, Name, Stats */}
        <div id="player-osd-top" className="flex items-start justify-between">
          <div id="player-osd-channel-meta" className="flex items-center gap-4">
            <button
              id="btn-osd-back"
              onClick={onClose}
              onFocus={() => setOsdFocusedIndex(0)}
              className={`p-3 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md rounded-xl border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-4 focus:ring-sky-400 focus:border-sky-400 focus:scale-105 ${
                osdFocusedIndex === 0 ? 'ring-4 ring-sky-400 border-sky-400 bg-sky-500/20 text-white scale-105' : ''
              }`}
              title={t.back}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            {/* Logo */}
            <div id="player-osd-logo-bg" className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex items-center justify-center shrink-0">
              <img
                id="player-osd-logo-img"
                src={getCleanLogoUrl(channel.logo)}
                alt={channel.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542204172-e7052809a8a7?w=128&auto=format&fit=crop&q=60';
                }}
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>

            {/* Title / EPG Details */}
            <div>
              <div id="player-osd-channel-badge-row" className="flex items-center gap-2 mb-1">
                <span className="text-[9px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded tracking-widest uppercase">
                  LIVE
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                  {channel.group}
                </span>
              </div>
              <h1 id="player-osd-channel-name" className="text-xl font-bold tracking-wide text-slate-100">
                {channel.name}
              </h1>
            </div>
          </div>

          {/* STREAM DECODING SPECIFICATIONS */}
          <div id="player-osd-stats" className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 text-right text-xs font-mono text-slate-400 flex flex-col gap-1 shadow-xl">
            <div id="player-osd-stat-dec" className="flex items-center gap-1.5 justify-end">
              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold">{t.hardware}: {t.active}</span>
            </div>
            <div id="player-osd-stat-res" className="text-[10px]">
              <span className="text-slate-500">{t.stats}</span> {resolutionInfo}
            </div>
          </div>
        </div>

        {/* MIDDLE PANEL: Dynamic Channel Switch Zapper info & Real Native TV Core Launcher */}
        <div id="player-osd-middle" className="flex flex-col items-center justify-center gap-4 py-2 select-none">
          {(settings.playerEngine === 'vlc' || settings.playerEngine === 'media3') && (
            <div className="bg-slate-950/95 border border-sky-500/40 rounded-2xl p-5 max-w-sm text-center shadow-[0_0_20px_rgba(56,189,248,0.2)] animate-fadeIn">
              <Tv className="w-8 h-8 text-sky-400 mx-auto mb-2.5 animate-pulse" />
              <h2 className="text-xs font-bold text-slate-100 mb-1 uppercase tracking-wider">
                {settings.playerEngine === 'vlc' ? 'VLC Player Core Active' : 'Media3 Player Core Active'}
              </h2>
              <p className="text-[10px] text-slate-400 mb-4 font-sans leading-relaxed px-1">
                {language === 'tr' 
                  ? 'Yayını Android TV veya mobil cihazınızdaki yerel oynatıcıda çalıştırmak için aşağıdaki butonu kullanabilirsiniz.'
                  : 'You can launch this live stream directly inside your native Android TV or phone player app.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <a
                  href={
                    settings.playerEngine === 'vlc'
                      ? `intent://${channel.url.replace(/^https?:\/\//, '')}#Intent;scheme=http;package=org.videolan.vlc;S.title=${encodeURIComponent(channel.name)};end`
                      : `intent://${channel.url.replace(/^https?:\/\//, '')}#Intent;scheme=http;type=video/*;package=com.google.android.exoplayer2.demo;S.title=${encodeURIComponent(channel.name)};end`
                  }
                  id="btn-launch-native-player"
                  onClick={(e) => {
                    // Try direct custom protocol fallback first for better cross-platform compatibility
                    if (settings.playerEngine === 'vlc') {
                      window.location.href = `vlc://${channel.url}`;
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-450 text-slate-950 font-extrabold rounded-lg text-[10px] tracking-wide transition-all duration-200 cursor-pointer shadow-md shadow-sky-500/10 active:scale-95"
                >
                  <span>{language === 'tr' ? 'UYGULAMAYI BAŞLAT' : 'LAUNCH PLAYER APP'}</span>
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(channel.url);
                    alert(language === 'tr' ? 'Yayın adresi panoya kopyalandı!' : 'Stream URL copied to clipboard!');
                  }}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                >
                  {language === 'tr' ? 'Adresi Kopyala' : 'Copy URL'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM PANEL: Audio progress & Navigation Control bar */}
        <div id="player-osd-bottom" className="space-y-4">
          
          {/* EPG Live Show Timeline Slider */}
          <div id="player-osd-epg-card" className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/40 p-4">
            <div id="player-osd-epg-now" className="flex items-center justify-between text-xs mb-1.5">
              <div id="player-osd-epg-now-text" className="flex items-baseline gap-2">
                <span className="text-sky-400 font-bold tracking-wide text-[10px] uppercase">{t.nowPlaying}</span>
                <span className="font-semibold text-slate-200">{currentShow?.title}</span>
              </div>
              <span id="player-osd-epg-now-span" className="text-slate-500 font-mono text-[10px]">{currentShow?.start} - {currentShow?.end}</span>
            </div>

            {/* Time progress simulation */}
            <div id="player-osd-progress-bar" className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mb-2 border border-slate-900">
              <div 
                id="player-osd-progress-indicator" 
                className="h-full bg-gradient-to-r from-sky-500 via-sky-400 to-emerald-400 transition-all duration-1000 shadow-[0_0_8px_rgba(56,189,248,0.5)]" 
                style={{ 
                  width: `${(() => {
                    if (!currentShow) return 45;
                    const now = new Date();
                    const currentMinutes = now.getHours() * 60 + now.getMinutes();
                    const [sh, sm] = currentShow.start.split(':').map(Number);
                    const [eh, em] = currentShow.end.split(':').map(Number);
                    const startMin = sh * 60 + sm;
                    const endMin = eh * 60 + em;
                    if (currentMinutes < startMin) return 0;
                    if (currentMinutes > endMin) return 100;
                    const total = endMin - startMin;
                    const elapsed = currentMinutes - startMin;
                    return Math.max(5, Math.min(100, Math.round((elapsed / (total || 1)) * 100)));
                  })()}%` 
                }} 
              />
            </div>

            <div id="player-osd-epg-next" className="flex items-baseline gap-2 text-[10px] text-slate-500 font-sans">
              <span className="font-semibold uppercase text-slate-600 text-[9px]">{t.next}</span>
              <span>{nextShow?.start} - {nextShow?.title}</span>
            </div>
          </div>

          {/* CONTROL SWITCH BAR */}
          <div id="player-controls-bar" className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Player Buttons (Play/Pause, Zap Prev, Zap Next, Favorite) */}
            <div id="player-buttons-group" className="flex items-center gap-3">
              <button
                id="btn-player-prev"
                onClick={(e) => { e.stopPropagation(); onPrevChannel(); }}
                onFocus={() => setOsdFocusedIndex(1)}
                className={`p-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-slate-300 hover:text-white transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-sky-400 focus:border-sky-400 focus:scale-105 ${
                  osdFocusedIndex === 1 ? 'ring-4 ring-sky-400 border-sky-400 bg-sky-500/20 text-white scale-105' : ''
                }`}
                title="Önceki Kanal (Previous Channel)"
              >
                <ChevronLeft className="w-5 h-5 rotate-180" />
              </button>

              <button
                id="btn-player-play-pause"
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                onFocus={() => setOsdFocusedIndex(2)}
                className={`p-3.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl shadow-lg shadow-sky-500/10 transition-transform duration-100 active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-sky-300 focus:scale-110 ${
                  osdFocusedIndex === 2 ? 'ring-4 ring-sky-300 bg-sky-400 text-slate-950 scale-110 shadow-lg shadow-sky-500/30' : ''
                }`}
                title={isPlaying ? 'Durdur' : 'Oynat'}
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current stroke-none" />}
              </button>

              <button
                id="btn-player-next"
                onClick={(e) => { e.stopPropagation(); onNextChannel(); }}
                onFocus={() => setOsdFocusedIndex(3)}
                className={`p-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-slate-300 hover:text-white transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-sky-400 focus:border-sky-400 focus:scale-105 ${
                  osdFocusedIndex === 3 ? 'ring-4 ring-sky-400 border-sky-400 bg-sky-500/20 text-white scale-105' : ''
                }`}
                title="Sonraki Kanal (Next Channel)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                id="btn-player-fav"
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(channel.id); }}
                onFocus={() => setOsdFocusedIndex(4)}
                className={`p-3 border rounded-xl transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-sky-400 focus:scale-105 ${
                  isFavorite 
                    ? 'bg-amber-500 border-amber-500 text-slate-950' 
                    : 'bg-slate-950/80 border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white'
                } ${osdFocusedIndex === 4 ? 'ring-4 ring-sky-400 border-sky-400 bg-sky-500/20 text-white scale-105' : ''}`}
                title="Favorilere Ekle"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current animate-none' : ''}`} />
              </button>
            </div>

            {/* Volume slider & PIP */}
            <div id="player-volume-group" className="flex items-center gap-4 bg-slate-950/80 border border-slate-850/60 p-2.5 px-4 rounded-xl max-w-sm w-full">
              <button
                id="btn-player-mute"
                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                onFocus={() => setOsdFocusedIndex(5)}
                className={`text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                  osdFocusedIndex === 5 ? 'ring-2 ring-sky-400 scale-105 text-white' : ''
                }`}
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-sky-400" />}
              </button>
              <input
                id="slider-player-volume"
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => setOsdFocusedIndex(6)}
                className={`h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 flex-1 transition-all focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                  osdFocusedIndex === 6 ? 'ring-2 ring-sky-400 bg-slate-750 scale-102' : ''
                }`}
              />
              <span id="player-volume-percent" className="text-xs font-mono text-slate-400 w-8 text-right">{volume}%</span>
            </div>

            {/* Aspect Ratio & PiP & Fullscreen controls */}
            <div id="player-extra-controls-group" className="flex items-center gap-3">
              {/* Picture in Picture */}
              <button
                id="btn-player-pip"
                onClick={(e) => { e.stopPropagation(); handlePiP(); }}
                onFocus={() => setOsdFocusedIndex(7)}
                className={`flex items-center gap-2 p-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors text-xs font-semibold cursor-pointer focus:outline-none focus:ring-4 focus:ring-sky-400 focus:border-sky-400 focus:scale-105 ${
                  osdFocusedIndex === 7 ? 'ring-4 ring-sky-400 border-sky-400 bg-sky-500/20 text-white scale-105' : ''
                }`}
                title={t.pip}
              >
                <PictureInPicture className="w-4 h-4 text-sky-400" />
                <span className="hidden md:inline">{t.pip}</span>
              </button>

              {/* Aspect Ratio cycling */}
              <button
                id="btn-player-aspect"
                onClick={(e) => { e.stopPropagation(); cycleAspectRatio(); }}
                onFocus={() => setOsdFocusedIndex(8)}
                className={`flex items-center gap-2 p-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors text-xs font-semibold cursor-pointer focus:outline-none focus:ring-4 focus:ring-sky-400 focus:border-sky-400 focus:scale-105 ${
                  osdFocusedIndex === 8 ? 'ring-4 ring-sky-400 border-sky-400 bg-sky-500/20 text-white scale-105' : ''
                }`}
              >
                <Layers className="w-4 h-4 text-sky-400" />
                <span className="hidden md:inline">{t.aspectRatio} <span className="uppercase text-sky-400 font-bold font-mono">{aspectRatio}</span></span>
              </button>

              {/* Fullscreen */}
              <button
                id="btn-player-fullscreen"
                onClick={(e) => { e.stopPropagation(); handleToggleFullscreen(); }}
                onFocus={() => setOsdFocusedIndex(9)}
                className={`p-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 rounded-xl text-slate-300 hover:text-white transition-all duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-sky-400 focus:border-sky-400 focus:scale-105 ${
                  osdFocusedIndex === 9 ? 'ring-4 ring-sky-400 border-sky-400 bg-sky-500/20 text-white scale-105' : ''
                }`}
                title={isFullscreen ? 'Küçült' : 'Tam Ekran'}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
