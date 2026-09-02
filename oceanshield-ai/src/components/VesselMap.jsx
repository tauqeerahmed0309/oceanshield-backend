import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

export default function VesselMap({
  vessels,
  incidents,
  selectedVessel,
  onSelectVessel,
  activeIncidentId,
  onSelectIncident,
  simulationStep
}) {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const markersRef = useRef({});
  const polygonRef = useRef(null);
  const scanBoxRef = useRef(null);

  const createVesselIcon = (v) => {
    let color = '#0ea5e9'; // Sky blue for Normal
    let bg = 'rgba(255, 255, 255, 0.9)';
    let animationClass = '';

    if (v.status === 'ANOMALOUS' || v.status === 'CRITICAL') {
      color = '#ef4444'; // Red
      bg = 'rgba(254, 226, 226, 0.9)';
      animationClass = 'pulsing-red-glow';
    } else if (v.status === 'WARNING') {
      color = '#f97316'; // Orange
      bg = 'rgba(255, 237, 213, 0.9)';
      animationClass = 'pulsing-orange-glow';
    }

    const svgHtml = `
      <div class="${animationClass}" style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: ${bg}; border: 2px solid ${color}; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3" style="transform: rotate(${v.course}deg); transition: transform 0.3s ease;">
          <polygon points="12,2 22,22 12,17 2,22" fill="currentColor" fill-opacity="0.2"/>
        </svg>
      </div>
    `;

    return L.divIcon({
      html: svgHtml,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  };

  // Initialize Map
  useEffect(() => {
    let leafletMap = null;

    if (!map && mapContainerRef.current) {
      leafletMap = L.map(mapContainerRef.current, {
        center: [18.9, 72.8],
        zoom: 8,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'topright' }).addTo(leafletMap);

      // Light theme tiles - CartoDB Voyager
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(leafletMap);

      setMap(leafletMap);
    }

    return () => {
      if (leafletMap) {
        leafletMap.remove();
      }
      setMap(null);
      markersRef.current = {};
      polygonRef.current = null;
      scanBoxRef.current = null;
    };
  }, []);

  // Update Markers when vessels list updates
  useEffect(() => {
    if (!map) return;

    vessels.forEach(v => {
      const position = [v.latitude, v.longitude];

      if (markersRef.current[v.mmsi]) {
        const marker = markersRef.current[v.mmsi];
        marker.setLatLng(position);
        marker.setIcon(createVesselIcon(v));
      } else {
        const marker = L.marker(position, { icon: createVesselIcon(v) })
          .addTo(map)
          .on('click', () => {
            onSelectVessel(v);
          });
        markersRef.current[v.mmsi] = marker;
      }
    });

    Object.keys(markersRef.current).forEach(mmsi => {
      if (!vessels.find(v => v.mmsi === mmsi)) {
        map.removeLayer(markersRef.current[mmsi]);
        delete markersRef.current[mmsi];
      }
    });
  }, [map, vessels, onSelectVessel]);

  // Update Oil Spill and scan box based on activeIncident / simulationStep
  useEffect(() => {
    if (!map) return;

    if (simulationStep >= 4) {
      const scanCoords = [
        [26.1, -90.8],
        [26.1, -90.0],
        [25.4, -90.0],
        [25.4, -90.8]
      ];
      
      if (!scanBoxRef.current) {
        scanBoxRef.current = L.polygon(scanCoords, {
          color: '#0ea5e9',
          weight: 1,
          dashArray: '5, 5',
          fillColor: '#0ea5e9',
          fillOpacity: 0.08
        }).addTo(map);
      }
    } else {
      if (scanBoxRef.current) {
        map.removeLayer(scanBoxRef.current);
        scanBoxRef.current = null;
      }
    }

    if (simulationStep >= 6) {
      const spillCoords = [
        [25.795, -90.445],
        [25.805, -90.415],
        [25.785, -90.395],
        [25.765, -90.405],
        [25.755, -90.435],
        [25.775, -90.455]
      ];

      if (!polygonRef.current) {
        polygonRef.current = L.polygon(spillCoords, {
          color: '#ef4444',
          weight: 2,
          fillColor: '#b91c1c',
          fillOpacity: 0.4
        }).addTo(map);

        polygonRef.current.on('click', () => {
          if (onSelectIncident) {
            onSelectIncident("OS-2026-0104");
          }
        });
      }
    } else {
      if (polygonRef.current) {
        map.removeLayer(polygonRef.current);
        polygonRef.current = null;
      }
    }
  }, [map, simulationStep, onSelectIncident]);

  // Center Map on Selected Vessel
  useEffect(() => {
    if (map && selectedVessel) {
      map.setView([selectedVessel.latitude, selectedVessel.longitude], 8, {
        animate: true,
        duration: 0.8
      });
    }
  }, [map, selectedVessel]);

  return (
    <div className="relative w-full h-full rounded-lg border border-sky-200 overflow-hidden bg-slate-50">
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 border border-sky-200 px-3 py-2 rounded-lg text-xs font-mono text-slate-700 pointer-events-auto shadow-sm">
        <h4 className="text-slate-800 font-bold mb-1 border-b border-slate-200 pb-1 uppercase tracking-wider">Surveillance Legend</h4>
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 border border-sky-500 bg-sky-100 rounded-full"></span>
            <span>Normal Track</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 border border-orange-500 bg-orange-100 rounded-full pulsing-orange-glow"></span>
            <span>Warning / Dev.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 border border-red-500 bg-red-100 rounded-full pulsing-red-glow"></span>
            <span>Anomalous Track</span>
          </div>
          {simulationStep >= 4 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 border border-sky-400 border-dashed bg-sky-50"></span>
              <span>Sentinel-1 SAR Target Zone</span>
            </div>
          )}
          {simulationStep >= 6 && (
            <div className="flex items-center gap-2">
              <span className="w-4 h-2.5 border border-red-500 bg-red-200 rounded"></span>
              <span>Confirmed Oil Slick</span>
            </div>
          )}
        </div>
      </div>

      {/* Compass Rose Overlay */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none opacity-40">
        <svg width="48" height="48" viewBox="0 0 100 100" fill="none" stroke="#0ea5e9" strokeWidth="2">
          <circle cx="50" cy="50" r="45" strokeDasharray="3,3"/>
          <line x1="50" y1="5" x2="50" y2="95"/>
          <line x1="5" y1="50" x2="95" y2="50"/>
          <text x="47" y="16" fill="#0ea5e9" fontSize="12" fontWeight="bold">N</text>
        </svg>
      </div>
    </div>
  );
}
