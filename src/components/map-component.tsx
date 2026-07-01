'use client';

import { useEffect, useRef, useMemo } from 'react';

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
  const markersRef = useRef<Record<string, any>>({});
  const polylinesRef = useRef<any[]>([]);
  const LRef = useRef<any>(null);

  // Memoize points to avoid unnecessary re-renders
  const memoizedPoints = useMemo(() => points, [JSON.stringify(points)]);
  const memoizedPaths = useMemo(() => paths, [JSON.stringify(paths)]);

  const buildIcon = (L: any, p: any) => {
    const sl = (p.status || '').toLowerCase();
    const type = (p.type || '').toUpperCase();
    let pulseColor = '#38bdf8';
    
    if (type === 'IN' || sl.includes('masuk')) pulseColor = '#22c55e';
    if (type === 'BREAK' || type === 'END_BREAK' || sl.includes('istirahat')) pulseColor = '#fbbf24';
    if (type === 'OUT' || sl.includes('pulang')) pulseColor = '#ef4444';
    
    if (p.isStart) pulseColor = '#22c55e';
    if (p.isEnd) pulseColor = '#ef4444';

    if (p.isWaypoint) {
      const color = p.pathColor || '#6b7280';
      const html = `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:1.5px solid white;box-shadow:0 0 3px rgba(0,0,0,0.3);"></div>`;
      return L.divIcon({ className: 'waypoint-icon', html, iconSize: [10, 10], iconAnchor: [5, 5], popupAnchor: [0, -5] });
    }

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

    const markerStyle = String(p.markerStyle || '');
    const useStatusDot = markerStyle === 'statusDot' || markerStyle === 'status-dot' || p.useStatusDot === true;
    if (useStatusDot) {
      const html = `
        <div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;inset:0;border-radius:50%;background:${pulseColor};opacity:0.55;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative;width:12px;height:12px;border-radius:50%;background:${pulseColor};border:2px solid white;box-shadow:0 0 10px rgba(0,0,0,0.25);z-index:10;"></div>
        </div>`;
      return L.divIcon({ className: 'attendance-dot-icon', html, iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -11] });
    }

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

  const buildPopupContent = (p: any) => {
    const sl = (p.status || '').toLowerCase();
    const type = (p.type || '').toUpperCase();
    let statusColor = '#38bdf8';
    
    if (type === 'IN' || sl.includes('masuk')) statusColor = '#22c55e';
    if (type === 'BREAK' || type === 'END_BREAK' || sl.includes('istirahat')) statusColor = '#fbbf24';
    if (type === 'OUT' || sl.includes('pulang')) statusColor = '#ef4444';
    
    if (p.isSOS) statusColor = '#ef4444';

    const gmapsLink = p.lat && p.lng ?
      `<a href="https://www.google.com/maps?q=${p.lat},${p.lng}" target="_blank" style="color:#3b82f6;text-decoration:underline;font-size:11px;">📍 Buka di Google Maps</a>` : '';

    return `
      <div style="min-width:220px;font-family:system-ui,sans-serif;padding:4px;">
        <div style="font-weight:700;font-size:14px;color:#111;margin-bottom:6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">
          ${p.fullName || p.name || 'Petugas'}
        </div>
        <div style="display:grid;gap:3px;font-size:12px;color:#374151;">
          <div style="display:flex;align-items:center;gap:4px;">
            <span style="color:#6b7280;font-size:10px;width:70px;">Status</span>
            <span style="font-weight:600;color:${statusColor};">${p.status || 'Online'}</span>
          </div>
          ${(p.deviceInfo || p.device || p.os) ? `<div style="display:flex;align-items:center;gap:4px;">
            <span style="color:#6b7280;font-size:10px;width:70px;">Device</span>
            <span style="font-weight:600;color:#374151;">${p.deviceInfo || `${p.device || ''} ${p.os || ''}`.trim()}</span>
          </div>` : ''}
          ${p.ipAddress ? `<div style="display:flex;align-items:center;gap:4px;">
            <span style="color:#6b7280;font-size:10px;width:70px;">IP Address</span>
            <span style="font-weight:600;color:#374151;">${p.ipAddress}</span>
          </div>` : ''}
          ${p.provider ? `<div style="display:flex;align-items:center;gap:4px;">
            <span style="color:#6b7280;font-size:10px;width:70px;">Provider</span>
            <span style="font-weight:600;color:#374151;">${p.provider}</span>
          </div>` : ''}
          ${(p.wifiName && p.wifiName !== 'Tidak Terhubung WiFi') ? `<div style="display:flex;align-items:center;gap:4px;">
            <span style="color:#6b7280;font-size:10px;width:70px;">WiFi</span>
            <span style="font-weight:600;color:#374151;">${p.wifiName}</span>
          </div>` : ''}
          ${p.address ? `<div style="margin-top:4px;padding-top:4px;border-top:1px dashed #e5e7eb;font-size:10px;color:#ef4444;font-weight:500;">
            📍 ${p.address}
          </div>` : ''}
        </div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;display:flex;justify-content:center;">
          <button 
            onclick="window.openCallOfficerModal(${p.userId || (p.id ? p.id.toString().replace('officer-','') : '0')}, '${(p.fullName || p.name || 'Petugas').replace(/'/g, "\\'")}')"
            style="width:100%;padding:6px;background:#f97316;color:white;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;"
            onmouseover="this.style.backgroundColor='#ea580c'"
            onmouseout="this.style.backgroundColor='#f97316'"
          >
            🔔 Panggil Petugas
          </button>
        </div>
      </div>
    `;
  };

  // Function to render markers and paths
  const renderMapContent = useMemo(() => async () => {
    if (!mapInstanceRef.current || !LRef.current) return;
    
    const L = LRef.current;
    const map = mapInstanceRef.current;

    // Update polylines
    // First remove old polylines
    polylinesRef.current.forEach(poly => {
      try { map.removeLayer(poly); } catch (_) {}
    });
    polylinesRef.current = [];

    // Add new polylines
    memoizedPaths.forEach((path) => {
      if (path.coords.length >= 2) {
        const polyline = L.polyline(path.coords, {
          color: path.color || '#3b82f6',
          weight: 5,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
        polylinesRef.current.push(polyline);
      }
    });

    // Process markers: group coordinates to handle overlapping
    const coordGroups: Record<string, any[]> = {};
    memoizedPoints.forEach(point => {
      if (point.lat == null || point.lng == null) return;

      const latNum = Number(point.lat);
      const lngNum = Number(point.lng);
      if (isNaN(latNum) || isNaN(lngNum)) return;

      const coordKey = `${latNum.toFixed(5)},${lngNum.toFixed(5)}`;
      if (!coordGroups[coordKey]) coordGroups[coordKey] = [];
      coordGroups[coordKey].push({ ...point, lat: latNum, lng: lngNum });
    });

    // Collect all current marker IDs
    const currentMarkerIds = new Set<string>();

    // Process each point
    Object.values(coordGroups).forEach(group => {
      group.forEach((point, index) => {
        const id = String(point.id ?? point.name ?? `${point.lat},${point.lng}`);
        currentMarkerIds.add(id);

        // Calculate offset if multiple markers at same location
        let finalLat = point.lat;
        let finalLng = point.lng;
        if (group.length > 1) {
          const radius = 0.0002;
          const angle = (index / group.length) * Math.PI * 2;
          finalLat = point.lat + Math.cos(angle) * radius;
          finalLng = point.lng + Math.sin(angle) * radius;
        }

        // Check if marker already exists
        const existingMarker = markersRef.current[id];
        if (existingMarker) {
          // Update existing marker's position
          existingMarker.setLatLng([finalLat, finalLng]);
          // Update icon and popup if needed
          existingMarker.setIcon(buildIcon(L, point));
          if (showPopup && (point.name || point.status)) {
            existingMarker.setPopupContent(buildPopupContent(point));
          }
        } else {
          // Create new marker
          const marker = L.marker([finalLat, finalLng], { icon: buildIcon(L, point) }).addTo(map);
          if (showPopup && (point.name || point.status)) {
            marker.bindPopup(buildPopupContent(point));
          }
          markersRef.current[id] = marker;
        }
      });
    });

    // Remove markers that are no longer in the points array
    Object.keys(markersRef.current).forEach(id => {
      if (!currentMarkerIds.has(id)) {
        try { map.removeLayer(markersRef.current[id]); } catch (_) {}
        delete markersRef.current[id];
      }
    });
  }, [memoizedPoints, memoizedPaths, showPopup]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current) return;
    if (mapInstanceRef.current) return;

    import('leaflet').then(async (L) => {
      LRef.current = L;
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

      L.tileLayer('http://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxZoom: 20,
      }).addTo(map);

      mapInstanceRef.current = map;
      await renderMapContent();
    });

    return () => {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    renderMapContent();
  }, [renderMapContent, flyTrigger]);

  useEffect(() => {
    if (mapInstanceRef.current && center && flyToCenter) {
      mapInstanceRef.current.flyTo(center, zoom, { animate: true, duration: 1.5 });
    }
  }, [center, zoom, flyToCenter, flyTrigger]);

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
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .custom-photo-icon, .custom-sos-icon, .attendance-dot-icon { background: transparent !important; border: none !important; }
      `}</style>
      <div ref={containerRef} style={{ height: '100%', width: '100%', minHeight: '300px' }} />
    </>
  );
}
