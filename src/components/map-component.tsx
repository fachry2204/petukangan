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

        const existingMarker = markersRef.current[key];

        if (existingMarker) {
          // Smoothly update position of existing marker
          existingMarker.setLatLng([point.lat, point.lng]);
          
          // Optionally update popup content if needed
          if (showPopup && existingMarker.getPopup()) {
             existingMarker.getPopup().setContent(`<div style="min-width:120px"><b>${point.name || ''}</b><br/><span style="color:#888">${point.status || ''}</span></div>`);
          }
        } else {
          // Create new marker
          const marker = L.marker([point.lat, point.lng]).addTo(map);
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
