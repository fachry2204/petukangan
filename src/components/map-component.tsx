'use client';

import { useEffect, useRef } from 'react';

export default function MapComponent({
  points = [],
  paths = [],
  center = [-6.2088, 106.8456],
  zoom = 12,
  showPopup = true,
  onMapClick,
  flyToCenter = true,
  flyTrigger = 0,
  focusMarker
}: {
  points?: any[];
  paths?: { userId?: number; name?: string; color?: string; coords: [number, number][] }[];
  center?: [number, number];
  zoom?: number;
  showPopup?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  flyToCenter?: boolean;
  flyTrigger?: number;
  focusMarker?: string | null;
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

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
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
  const polylinesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      // ── Render polylines (routes) ─────────────────────────────────────
      // Clear old polylines
      polylinesRef.current.forEach(poly => {
        try { map.removeLayer(poly); } catch (_) {}
      });
      polylinesRef.current = [];

      paths.forEach((path) => {
        if (path.coords.length >= 2) {
          const polyline = L.polyline(path.coords, {
            color: path.color || '#3b82f6',
            weight: 5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
          polylinesRef.current.push(polyline);

          // Start/end markers with photos are handled via the 'points' prop
        }
      });

      // ── Render markers ────────────────────────────────────────────────

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
            // ── Waypoint: small dot ───────────────────────────────────────────
            if (p.isWaypoint) {
              const color = p.pathColor || '#6b7280';
              const html = `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:1.5px solid white;box-shadow:0 0 3px rgba(0,0,0,0.3);"></div>`;
              return L.divIcon({ className: 'waypoint-icon', html, iconSize: [10, 10], iconAnchor: [5, 5], popupAnchor: [0, -5] });
            }

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

            // ── Start / End badge label ───────────────────────────────────────
            const labelBadge = p.isStart
              ? `<div style="position:absolute;top:-2px;left:50%;transform:translateX(-50%);background:#22c55e;color:white;font-size:9px;font-weight:700;padding:1px 5px;border-radius:8px;white-space:nowrap;z-index:20;border:1.5px solid white;">Awal</div>`
              : p.isEnd
              ? `<div style="position:absolute;top:-2px;left:50%;transform:translateX(-50%);background:#ef4444;color:white;font-size:9px;font-weight:700;padding:1px 5px;border-radius:8px;white-space:nowrap;z-index:20;border:1.5px solid white;">Akhir</div>`
              : '';

            // ── Status pulse colour ───────────────────────────────────────────
            const sl = (p.status || '').toLowerCase();
            let pulseColor = '#38bdf8'; // blue  = Online
            if (sl.includes('absen'))      pulseColor = '#22c55e'; // green  = Absen
            if (sl.includes('istirahat'))  pulseColor = '#fbbf24'; // yellow = Istirahat
            if (p.isStart)                 pulseColor = '#22c55e'; // green  = Start
            if (p.isEnd)                   pulseColor = '#ef4444'; // red    = End

            // ── Inner content: photo or initials ──────────────────────────────
            const innerHtml = p.photoUrl
              ? `<img src="${p.photoUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3135/3135715.png'" />`
              : `<span style="color:white;font-weight:700;font-size:16px;line-height:1;">${(p.fullName || p.name || 'P')[0].toUpperCase()}</span>`;

            const html = `
              <div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
                ${labelBadge}
                <div style="position:absolute;inset:0;border-radius:50%;background:${pulseColor};opacity:0.4;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;"></div>
                <div style="position:relative;width:44px;height:44px;border-radius:50%;border:2.5px solid white;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#374151;z-index:10;">
                  ${innerHtml}
                </div>
              </div>`;

            return L.divIcon({ className: 'custom-photo-icon', html, iconSize: [52, 52], iconAnchor: [26, 26], popupAnchor: [0, -26] });
          };

          // Build detailed popup content
          const buildPopupContent = (p: any) => {
            const statusColor = p.isSOS ? '#ef4444' :
              (p.status || '').toLowerCase().includes('istirahat') ? '#fbbf24' :
              (p.status || '').toLowerCase().includes('pulang') ? '#9ca3af' :
              (p.status || '').toLowerCase().includes('masuk') ? '#22c55e' : '#38bdf8';

            const gmapsLink = p.lat && p.lng ?
              `<a href="https://www.google.com/maps?q=${p.lat},${p.lng}" target="_blank" style="color:#3b82f6;text-decoration:underline;font-size:11px;">📍 Buka di Google Maps</a>` : '';

            const batteryHtml = p.batteryLevel != null ?
              `<div style="display:flex;align-items:center;gap:4px;">
                <span style="color:#6b7280;font-size:10px;width:70px;">Baterai</span>
                <span style="font-size:11px;">${p.batteryLevel}%</span>
              </div>` : '';

            const speedHtml = p.speed != null ?
              `<div style="display:flex;align-items:center;gap:4px;">
                <span style="color:#6b7280;font-size:10px;width:70px;">Kecepatan</span>
                <span style="font-size:11px;">${p.speed} km/h</span>
              </div>` : '';

            return `
              <div style="min-width:220px;font-family:system-ui,sans-serif;padding:4px;">
                <div style="font-weight:700;font-size:14px;color:#111;margin-bottom:6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">
                  ${p.name || 'Petugas'}
                </div>

                <div style="display:grid;gap:3px;font-size:12px;color:#374151;">
                  <div style="display:flex;align-items:center;gap:4px;">
                    <span style="color:#6b7280;font-size:10px;width:70px;">Status</span>
                    <span style="font-weight:600;color:${statusColor};">${p.status || 'Online'}</span>
                  </div>

                  ${p.statusAbsen ? `<div style="display:flex;align-items:center;gap:4px;">
                    <span style="color:#6b7280;font-size:10px;width:70px;">Status Absen</span>
                    <span style="font-weight:600;color:#22c55e;">${p.statusAbsen}</span>
                  </div>` : ''}

                  ${batteryHtml}
                  ${speedHtml}

                  ${p.device ? `<div style="display:flex;align-items:center;gap:4px;">
                    <span style="color:#6b7280;font-size:10px;width:70px;">Device</span>
                    <span>${p.device}</span>
                  </div>` : ''}

                  ${p.os ? `<div style="display:flex;align-items:center;gap:4px;">
                    <span style="color:#6b7280;font-size:10px;width:70px;">OS</span>
                    <span>${p.os}</span>
                  </div>` : ''}

                  ${p.ipAddress ? `<div style="display:flex;align-items:center;gap:4px;">
                    <span style="color:#6b7280;font-size:10px;width:70px;">IP Address</span>
                    <span style="font-family:monospace;font-size:11px;">${p.ipAddress}</span>
                  </div>` : ''}

                  ${p.provider ? `<div style="display:flex;align-items:center;gap:4px;">
                    <span style="color:#6b7280;font-size:10px;width:70px;">Provider</span>
                    <span>${p.provider}</span>
                  </div>` : ''}

                  ${p.wifiName ? `<div style="display:flex;align-items:center;gap:4px;">
                    <span style="color:#6b7280;font-size:10px;width:70px;">WiFi</span>
                    <span style="font-size:11px;color:#059669;">${p.wifiName}</span>
                  </div>` : ''}

                  <div style="display:flex;align-items:flex-start;gap:4px;margin-top:4px;padding-top:4px;border-top:1px dashed #e5e7eb;">
                    <span style="color:#6b7280;font-size:10px;width:70px;">GPS</span>
                    <div>
                      <div style="font-family:monospace;font-size:11px;color:#4b5563;">${p.lat?.toFixed(6)}, ${p.lng?.toFixed(6)}</div>
                      ${gmapsLink}
                    </div>
                  </div>

                  ${p.address ? `<div style="margin-top:4px;padding-top:4px;border-top:1px dashed #e5e7eb;font-size:10px;color:#ef4444;font-weight:500;">
                    📍 ${p.address}
                  </div>` : ''}
                </div>
              </div>
            `;
          };

          const existingMarker = markersRef.current[key];

          if (existingMarker) {
            existingMarker.setLatLng([finalLat, finalLng]);
            // Update icon so status-changes re-render
            existingMarker.setIcon(buildIcon(point));
            if (showPopup && existingMarker.getPopup()) {
              existingMarker.getPopup().setContent(buildPopupContent(point));
            }
          } else {
            const marker = L.marker([finalLat, finalLng], { icon: buildIcon(point) }).addTo(map);
            if (showPopup && (point.name || point.status)) {
              marker.bindPopup(buildPopupContent(point));
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
  }, [points, paths, showPopup]);

  // Fly to new centre when it changes (only if flyToCenter is enabled)
  useEffect(() => {
    if (mapInstanceRef.current && center && flyToCenter) {
      mapInstanceRef.current.flyTo(center, zoom, { animate: true, duration: 1.5 });
    }
  }, [center, zoom, flyToCenter, flyTrigger]);

  // Open popup when focusMarker changes (delay untuk tunggu marker render)
  useEffect(() => {
    if (!focusMarker) return;
    const timer = setTimeout(() => {
      const marker = markersRef.current[focusMarker];
      if (marker) {
        marker.openPopup();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [focusMarker]);

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
