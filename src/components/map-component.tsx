'use client';

import { useEffect, useRef } from 'react';

export default function MapComponent({
  points = [],
  center = [-6.2088, 106.8456],
  zoom = 12,
  showPopup = true,
}: {
  points?: any[];
  center?: [number, number];
  zoom?: number;
  showPopup?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;
    if (!containerRef.current) return;
    // Prevent double-init
    if (mapInstanceRef.current) return;

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Guard: container might have been removed already
      if (!containerRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add markers
      points.forEach((point) => {
        if (point.lat == null || point.lng == null) return;
        const marker = L.marker([point.lat, point.lng]).addTo(map);
        if (showPopup && (point.name || point.status)) {
          marker.bindPopup(`<div style="min-width:120px"><b>${point.name || ''}</b><br/><span style="color:#888">${point.status || ''}</span></div>`);
        }
      });

      mapInstanceRef.current = map;
    });

    // Cleanup: called when component unmounts
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ref to track existing markers by a unique identifier (use point.name as key for now)
  const markersRef = useRef<Record<string, any>>({});

  // Update markers smoothly when points change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;
      
      const currentKeys = new Set<string>();

      points.forEach((point) => {
        if (point.lat == null || point.lng == null) return;
        
        // Create a unique key for the marker (assuming name is unique, or combination of name+status)
        const key = point.id || point.name || `${point.lat},${point.lng}`;
        currentKeys.add(key);

        const getCustomIcon = (p: any) => {
          if (p.photoUrl) {
            const html = `
              <div style="width: 44px; height: 44px; border-radius: 50%; background-color: #38bdf8; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(56,189,248,0.7); border: 2.5px solid white; overflow: hidden; position: relative;">
                <img src="${p.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3135/3135715.png'" />
                <div style="position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; background-color: #22c55e; border-radius: 50%; border: 1.5px solid white;"></div>
              </div>
            `;
            return L.divIcon({
              className: 'custom-photo-icon',
              html,
              iconSize: [44, 44],
              iconAnchor: [22, 22],
              popupAnchor: [0, -22]
            });
          }
          return new L.Icon.Default();
        };

        const existingMarker = markersRef.current[key];

        if (existingMarker) {
          existingMarker.setLatLng([point.lat, point.lng]);
          
          if (showPopup && existingMarker.getPopup()) {
             existingMarker.getPopup().setContent(`<div style="min-width:120px"><b>${point.name || ''}</b><br/><span style="color:#888">${point.status || ''}</span></div>`);
          }
        } else {
          const marker = L.marker([point.lat, point.lng], { icon: getCustomIcon(point) }).addTo(map);
          if (showPopup && (point.name || point.status)) {
            marker.bindPopup(`<div style="min-width:120px"><b>${point.name || ''}</b><br/><span style="color:#888">${point.status || ''}</span></div>`);
          }
          markersRef.current[key] = marker;
        }
      });

      // Remove markers that are no longer in the points array
      Object.keys(markersRef.current).forEach((key) => {
        if (!currentKeys.has(key)) {
          map.removeLayer(markersRef.current[key]);
          delete markersRef.current[key];
        }
      });
    });
  }, [points, showPopup]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div
        ref={containerRef}
        style={{ height: '100%', width: '100%', minHeight: '300px' }}
      />
    </>
  );
}
