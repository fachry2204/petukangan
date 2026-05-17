'use client';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

interface YoutubeBackgroundProps {
  videoId: string;
  volume: number;
  onError?: () => void;
}

export default function YoutubeBackground({ videoId, volume, onError }: YoutubeBackgroundProps) {
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!videoId) return;

    // Load Youtube Iframe API script if not loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      playerRef.current = new window.YT.Player('youtube-bg-player', {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          loop: 1,
          playlist: videoId,
          showinfo: 0,
          rel: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
          suggestedQuality: 'hd1080', // Suggest highest resolution
        },
        events: {
          onReady: (event: any) => {
            event.target.mute(); // Mute first to bypass modern browser autoplay blocks
            event.target.setVolume(volume);
            if (volume > 0) {
              event.target.unMute();
            }
            
            // Suggest highest quality and let YouTube automatically downscale if connection is slow
            if (typeof event.target.setPlaybackQuality === 'function') {
              event.target.setPlaybackQuality('hd1080'); 
            }
            
            event.target.playVideo();
          },
          onStateChange: (event: any) => {
            // Loop manually if loop parameter fails to trigger in some environments
            if (event.data === window.YT.PlayerState.ENDED) {
              event.target.playVideo();
            }
            
            // Keep suggesting HD quality on playback changes
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (typeof event.target.setPlaybackQuality === 'function') {
                event.target.setPlaybackQuality('hd1080');
              }
            }
          },
          onError: (event: any) => {
            console.warn('YouTube Background Player Error (Code ' + event.data + '), falling back to image.');
            if (onError) onError();
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previousCallback) previousCallback();
        initPlayer();
      };
    }

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  // Handle dynamic volume updates in real-time
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(volume);
      if (volume > 0) {
        playerRef.current.unMute();
      } else {
        playerRef.current.mute();
      }
    }
  }, [volume]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0 bg-black">
      <div 
        id="youtube-bg-player" 
        className="absolute top-1/2 left-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] -translate-x-1/2 -translate-y-1/2 pointer-events-none scale-105"
      />
    </div>
  );
}
