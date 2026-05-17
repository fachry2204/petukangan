'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapComponent({
  points = [],
  center = [-6.2088, 106.8456], // Jakarta center
  zoom = 12,
  showPopup = true,
}: {
  points?: any[];
  center?: [number, number];
  zoom?: number;
  showPopup?: boolean;
}) {
  // Mount flag to avoid SSR issues
  const [isMounted, setIsMounted] = useState(false);
  // Reference to the Leaflet map instance for cleanup
  const mapRef = useRef<any>(null);

  // Set mounted after first client render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Configure Leaflet icon assets (client‑only)
  useEffect(() => {
    try {
      const L = require('leaflet');
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    } catch (err) {
      console.error('Failed to configure Leaflet icons:', err);
    }
  }, []);

  // Robust cleanup of Leaflet map on component unmount to prevent removeChild errors
  useEffect(() => {
    // Wait until mapRef is set
    if (!mapRef.current) return;
    const map = mapRef.current;
    return () => {
      if (map && typeof map.remove === 'function') {
        try {
          map.remove();
        } catch (e) {
          console.warn('Leaflet map cleanup error (ignored):', e);
        }
      }
    };
  }, []);

  if (!isMounted) return <div className="h-full w-full bg-zinc-100 animate-pulse" />;

  return (
    <div className="h-full w-full z-0">
      <MapContainer
        {...({
          ref: mapRef,
          center,
          zoom,
          scrollWheelZoom: true,
          attributionControl: false,
          zoomControl: false,
        } as any)}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          {...({
            url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          } as any)}
        />
        {points.map((point, idx) => (
          <Marker key={idx} position={[point.lat, point.lng]}>
            {showPopup && (
              <Popup>
                <div className="p-2">
                  <p className="font-bold text-sm">{point.name}</p>
                  <p className="text-xs text-zinc-500">{point.status}</p>
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
