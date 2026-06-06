'use client';

import { useEffect, useRef } from 'react';

interface GPSPoint {
  id: number;
  userId: number;
  lat: number;
  lng: number;
  timestamp: string;
  fullName?: string;
  photoUrl?: string;
}

interface Track {
  userId: number;
  color: string;
  fullName: string;
  photoUrl?: string;
  points: GPSPoint[];
}

export default function HistoryMap({ tracks }: { tracks: Track[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);

  // Init map once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then((L) => {
      if (!containerRef.current) return;
      const map = L.map(containerRef.current, {
        center: [-6.2088, 106.8456],
        zoom: 13,
        zoomControl: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (_) {}
        mapRef.current = null;
      }
    };
  }, []);

  // Re-render tracks whenever data changes
  useEffect(() => {
    if (!mapRef.current) return;
    import('leaflet').then((L) => {
      const map = mapRef.current;
      if (!map) return;

      // Clear previous layers
      for (const layer of layersRef.current) {
        try { map.removeLayer(layer); } catch (_) {}
      }
      layersRef.current = [];

      const allLatLngs: [number, number][] = [];

      for (const t of tracks) {
        if (!t.points.length) continue;

        const latlngs: [number, number][] = t.points
          .map((p) => [Number(p.lat), Number(p.lng)] as [number, number])
          .filter(([la, ln]) => !Number.isNaN(la) && !Number.isNaN(ln));

        if (!latlngs.length) continue;
        allLatLngs.push(...latlngs);

        // Polyline trail
        if (latlngs.length >= 2) {
          const poly = L.polyline(latlngs, {
            color: t.color,
            weight: 4,
            opacity: 0.85,
            lineJoin: 'round',
          }).addTo(map);
          layersRef.current.push(poly);
        }

        // Small dots for each historical point
        latlngs.forEach((ll, idx) => {
          const isLast = idx === latlngs.length - 1;
          if (isLast) return; // last point gets a richer marker below
          const dot = L.circleMarker(ll, {
            radius: 3,
            color: t.color,
            fillColor: t.color,
            fillOpacity: 0.9,
            weight: 1,
          }).addTo(map);
          layersRef.current.push(dot);
        });

        // Last point: officer marker with photo/initial
        const last = t.points[t.points.length - 1];
        const lastLatLng = latlngs[latlngs.length - 1];
        const initial = (t.fullName || 'P').charAt(0).toUpperCase();
        const innerHtml = t.photoUrl
          ? `<img src="${t.photoUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='/logodki.png'" />`
          : `<span style="color:white;font-weight:700;font-size:14px;">${initial}</span>`;

        const html = `
          <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;border-radius:50%;background:${t.color};opacity:0.35;animation:hist-ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="position:relative;width:36px;height:36px;border-radius:50%;border:2.5px solid ${t.color};overflow:hidden;display:flex;align-items:center;justify-content:center;background:#374151;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,0.25);">
              ${innerHtml}
            </div>
          </div>`;

        const icon = L.divIcon({
          className: 'history-photo-icon',
          html,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
          popupAnchor: [0, -22],
        });

        const marker = L.marker(lastLatLng, { icon }).addTo(map);
        const ts = new Date(last.timestamp).toLocaleTimeString('id-ID');
        marker.bindPopup(
          `<div style="min-width:140px"><b>${t.fullName}</b><br/>` +
          `<span style="font-size:11px;color:#666;">Titik terakhir</span><br/>` +
          `<span style="font-size:11px;">${ts}</span><br/>` +
          `<span style="font-size:10px;color:#888;">${lastLatLng[0].toFixed(5)}, ${lastLatLng[1].toFixed(5)}</span></div>`
        );
        layersRef.current.push(marker);
      }

      // Fit bounds if we have data
      if (allLatLngs.length > 0) {
        try {
          const bounds = L.latLngBounds(allLatLngs);
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
        } catch (boundsErr) {
          console.warn('[HistoryMap] Failed to fit map bounds:', boundsErr);
        }
      }
    });
  }, [tracks]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
      <style>{`
        @keyframes hist-ping {
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }
        .history-photo-icon { background: transparent !important; border: none !important; }
      `}</style>
      <div ref={containerRef} style={{ height: '100%', width: '100%', minHeight: '300px' }} />
    </>
  );
}
