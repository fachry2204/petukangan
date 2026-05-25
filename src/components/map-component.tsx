'use client';

import { useEffect, useRef } from 'react';

export default function MapComponent({
  points = [],
  center = [-6.2088, 106.8456],
  zoom = 12,
  showPopup = true,
  onMapClick
}: {
  points?: any[];
  center?: [number, number];
  zoom?: number;
  showPopup?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current) return;
    if (mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      // Remove default icon resolver so it never falls back to blue pin
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      if (!containerRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: true,
      });

      if (onMapClick) {
        map.on('click', (e: any) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const currentKeys = new Set<string>();

      // Group points with identical coordinates to prevent perfect overlap
      const coordGroups: Record<string, any[]> = {};
      points.forEach(point => {
        if (point.lat == null || point.lng == null) return;

        const latNum = Number(point.lat);
        const lngNum = Number(point.lng);
        if (isNaN(latNum) || isNaN(lngNum)) return;

        // Use 5 decimal places for grouping (approx 1 meter precision)
        const coordKey = `${latNum.toFixed(5)},${lngNum.toFixed(5)}`;
        if (!coordGroups[coordKey]) coordGroups[coordKey] = [];
        coordGroups[coordKey].push({ ...point, lat: latNum, lng: lngNum });
      });

      // Render markers
      Object.values(coordGroups).forEach(group => {
        group.forEach((point, index) => {
          const key = point.id || point.name || `${point.lat},${point.lng}`;
          currentKeys.add(key);

          // If multiple markers share the same location, arrange them in a circle
          let finalLat = point.lat;
          let finalLng = point.lng;
          if (group.length > 1) {
            const radius = 0.0002; // Roughly 20 meters
            const angle = (index / group.length) * Math.PI * 2;
            finalLat = point.lat + Math.cos(angle) * radius;
            finalLng = point.lng + Math.sin(angle) * radius;
          }

          const buildIcon = (p: any): L.DivIcon => {
            // ── SOS icon ──────────────────────────────────────────────────────
            if (p.isSOS) {
              const photoHtml = p.photoUrl
                ? `<img src="${p.photoUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3135/3135715.png'" />`
                : `<span style="color:#dc2626;font-weight:900;font-size:11px;">SOS</span>`;
              const html = `
                <div style="position:relative;width:60px;height:60px;display:flex;align-items:center;justify-content:center;">
                  <div style="position:absolute;inset:0;border-radius:50%;background:#ef4444;opacity:0.75;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;"></div>
                  <div style="position:relative;width:48px;height:48px;border-radius:50%;border:3px solid #dc2626;background:white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(239,68,68,0.8);overflow:hidden;z-index:10;">
                    ${photoHtml}
                  </div>
                </div>`;
              return L.divIcon({ className: 'custom-sos-icon', html, iconSize: [60, 60], iconAnchor: [30, 30], popupAnchor: [0, -30] });
            }

            // ── Status pulse colour ───────────────────────────────────────────
            const sl = (p.status || '').toLowerCase();
            let pulseColor = '#38bdf8'; // blue  = Online
            if (sl.includes('absen'))      pulseColor = '#22c55e'; // green  = Absen
            if (sl.includes('istirahat'))  pulseColor = '#fbbf24'; // yellow = Istirahat

            // ── Inner content: photo or initials ──────────────────────────────
            const innerHtml = p.photoUrl
              ? `<img src="${p.photoUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3135/3135715.png'" />`
              : `<span style="color:white;font-weight:700;font-size:16px;line-height:1;">${(p.fullName || p.name || 'P')[0].toUpperCase()}</span>`;

            const html = `
              <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
                <div style="position:absolute;inset:0;border-radius:50%;background:${pulseColor};opacity:0.4;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;"></div>
                <div style="position:relative;width:44px;height:44px;border-radius:50%;border:2.5px solid white;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#374151;z-index:10;">
                  ${innerHtml}
                </div>
              </div>`;

            return L.divIcon({ className: 'custom-photo-icon', html, iconSize: [52, 52], iconAnchor: [26, 26], popupAnchor: [0, -26] });
          };

          const existingMarker = markersRef.current[key];

          if (existingMarker) {
            existingMarker.setLatLng([finalLat, finalLng]);
            // Update icon so status-changes re-render
            existingMarker.setIcon(buildIcon(point));
            if (showPopup && existingMarker.getPopup()) {
              const addrHtml = point.address ? `<div style="font-size:10px;margin-top:4px;color:#ef4444;font-weight:bold;max-width:150px">${point.address}</div>` : '';
              existingMarker.getPopup().setContent(
                `<div style="min-width:120px"><b>${point.name || ''}</b><br/><span style="color:${point.isSOS ? '#ef4444' : '#888'};font-weight:${point.isSOS ? 'bold' : 'normal'}">${point.status || ''}</span>${addrHtml}</div>`
              );
            }
          } else {
            const marker = L.marker([finalLat, finalLng], { icon: buildIcon(point) }).addTo(map);
            if (showPopup && (point.name || point.status)) {
              const addrHtml = point.address ? `<div style="font-size:10px;margin-top:4px;color:#ef4444;font-weight:bold;max-width:150px">${point.address}</div>` : '';
              marker.bindPopup(
                `<div style="min-width:120px"><b>${point.name || ''}</b><br/><span style="color:${point.isSOS ? '#ef4444' : '#888'};font-weight:${point.isSOS ? 'bold' : 'normal'}">${point.status || ''}</span>${addrHtml}</div>`
              );
            }
            markersRef.current[key] = marker;
          }
        });
      });

      // Remove stale markers
      Object.keys(markersRef.current).forEach((key) => {
        if (!currentKeys.has(key)) {
          map.removeLayer(markersRef.current[key]);
          delete markersRef.current[key];
        }
      });
    });
  }, [points, showPopup]);

  // Fly to new centre when it changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.flyTo(center, zoom, { animate: true, duration: 1.5 });
    }
  }, [center, zoom]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
      {/* Inline keyframes so the ping animation works inside Leaflet's shadow DOM */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .custom-photo-icon, .custom-sos-icon { background: transparent !important; border: none !important; }
      `}</style>
      <div ref={containerRef} style={{ height: '100%', width: '100%', minHeight: '300px' }} />
    </>
  );
}
