import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import React, { useEffect, useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Configuración de iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

function FlyToPoint({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 16);
    }
  }, [lat, lng, map]);
  return null;
}

export default function App() {
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [activeRouteId, setActiveRouteId] = useState(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [routeName, setRouteName] = useState('Nombre de su nueva ruta');
  const [mode, setMode] = useState('plan');
  
  const [smartInput, setSmartInput] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  // Cargar rutas al iniciar
  useEffect(() => {
    const saved = localStorage.getItem('logistic_routes');
    if (saved) setRoutes(JSON.parse(saved));
  }, []);

  // Guardar rutas cuando cambian
  useEffect(() => {
    localStorage.setItem('logistic_routes', JSON.stringify(routes));
  }, [routes]);

  const currentStop = useMemo(() => {
    if (mode === 'active' && activeRouteId) {
      const route = routes.find((r) => r.id === activeRouteId);
      return route?.stops?.[currentStopIndex] || null;
    }
    return stops[currentStopIndex] || null;
  }, [mode, activeRouteId, currentStopIndex, stops, routes]);

  const nextStop = useMemo(() => {
    if (mode === 'active' && activeRouteId) {
      const route = routes.find((r) => r.id === activeRouteId);
      return route?.stops?.[currentStopIndex + 1] || null;
    }
    return stops[currentStopIndex + 1] || null;
  }, [mode, activeRouteId, currentStopIndex, stops, routes]);

  const mapCenter = useMemo(() => {
    if (currentStop) return [currentStop.lat, currentStop.lng];
    return [6.1537, -75.3739];
  }, [currentStop]);

  const openGoogleMaps = (lat, lng) => {
    if (!lat || !lng) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const parseSmartInput = (text) => {
    const parts = text.split(/[-,\n]/).map(p => p.trim());
    return {
      nombre: parts[0] || 'Cliente Desconocido',
      direccion: parts[1] || 'Dirección no especificada',
      barrio: parts[2] || 'Sin barrio',
      celular: parts[3] || 'Sin celular'
    };
  };

  const confirmManualStop = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      setMessage('⚠️ Coordenadas inválidas.');
      return;
    }
    const cliente = parseSmartInput(smartInput);
    const newStop = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      address: cliente.direccion,
      fullDetails: cliente,
      lat, lng,
      status: 'pending'
    };
    setStops((prev) => [...prev, newStop]);
    setSmartInput(''); setManualLat(''); setManualLng('');
    setMessage(`✅ Agregado: ${cliente.nombre}`);
  };

  const startDelivery = () => {
    if (stops.length < 1) return;
    setMode('active');
    setCurrentStopIndex(0);
    openGoogleMaps(stops[0].lat, stops[0].lng);
  };

  const completeStop = () => {
    if (nextStop) {
      setCurrentStopIndex(prev => prev + 1);
      openGoogleMaps(nextStop.lat, nextStop.lng);
    } else {
      // Al finalizar la ruta activa
      if (activeRouteId && window.confirm("¡Ruta completada! ¿Deseas eliminar esta ruta de la lista de guardados?")) {
        deleteRoute(activeRouteId);
      }
      setMessage('🏁 ¡Entrega finalizada!');
      setMode('plan');
      setStops([]);
      setActiveRouteId(null);
    }
  };

  const saveRoute = () => {
    if (stops.length < 1) return;
    const newRoute = {
      id: Date.now().toString(),
      name: routeName,
      stops: [...stops],
      status: 'pending'
    };
    setRoutes(prev => [...prev, newRoute]);
    setStops([]);
    setRouteName('Nueva Ruta');
    setMessage('💾 Ruta guardada.');
  };

  const activateRoute = (route) => {
    setActiveRouteId(route.id);
    setMode('active');
    setCurrentStopIndex(0);
    openGoogleMaps(route.stops[0].lat, route.stops[0].lng);
  };

  // NUEVA FUNCIÓN: Eliminar ruta de la lista
  const deleteRoute = (id) => {
    setRoutes(prev => prev.filter(r => r.id !== id));
    if (activeRouteId === id) {
      setMode('plan');
      setActiveRouteId(null);
    }
    setMessage('🗑️ Ruta eliminada.');
  };

  return (
    <div className="app" style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>🚚 Logistic Map</h1>
        <p style={{ color: '#666' }}>{mode === 'active' ? 'En ruta de entrega' : 'Planificación de despacho'}</p>
      </header>

      <main style={{ display: 'flex', gap: '20px' }}>
        <section style={{ flex: 1, minWidth: '350px' }}>
          
          {mode === 'active' ? (
            <div style={{ background: '#e8f6ef', padding: '20px', borderRadius: '10px', border: '1px solid #2ecc71' }}>
              <h2 style={{ marginTop: 0, color: '#27ae60' }}>📍 Parada {currentStopIndex + 1}</h2>
              {currentStop && (
                <div>
                  <p><strong>👤 Cliente:</strong> {currentStop.fullDetails?.nombre}</p>
                  <p><strong>🏠 Dirección:</strong> {currentStop.fullDetails?.direccion}</p>
                  <p><strong>🏘️ Barrio:</strong> {currentStop.fullDetails?.barrio}</p>
                  <p><strong>📱 Celular:</strong> {currentStop.fullDetails?.celular}</p>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button onClick={() => openGoogleMaps(currentStop.lat, currentStop.lng)} style={{ flex: 1, padding: '12px', cursor: 'pointer', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px' }}>Abrir GPS</button>
                    <button onClick={completeStop} style={{ flex: 1, padding: '12px', cursor: 'pointer', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px' }}>Siguiente</button>
                  </div>
                </div>
              )}
              <button onClick={() => setMode('plan')} style={{ marginTop: '15px', width: '100%', background: 'none', border: '1px solid #e74c3c', color: '#e74c3c', padding: '8px', cursor: 'pointer', borderRadius: '5px' }}>Cancelar Entrega</button>
            </div>
          ) : (
            <div>
              <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                <h3 style={{ marginTop: 0 }}>📝 Nueva Parada</h3>
                <textarea
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', marginBottom: '10px', boxSizing: 'border-box' }}
                  value={smartInput}
                  onChange={(e) => setSmartInput(e.target.value)}
                  placeholder="Nombre - Dirección sin guión - Barrio - Celular"
                  rows="3"
                />
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input type="number" placeholder="Latitud" value={manualLat} onChange={(e) => setManualLat(e.target.value)} style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                  <input type="number" placeholder="Longitud" value={manualLng} onChange={(e) => setManualLng(e.target.value)} style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                </div>
                <button onClick={confirmManualStop} style={{ width: '100%', padding: '12px', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>➕ Agregar a la Lista</button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <input value={routeName} onChange={(e) => setRouteName(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '5px' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={startDelivery} disabled={stops.length === 0} style={{ flex: 1, padding: '12px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: stops.length ? 1 : 0.5 }}>🚀 Iniciar Ya</button>
                  <button onClick={saveRoute} disabled={stops.length === 0} style={{ flex: 1, padding: '12px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: stops.length ? 1 : 0.5 }}>💾 Guardar Ruta</button>
                </div>
              </div>
            </div>
          )}

          <hr />
          <h3>📚 Rutas Guardadas</h3>
          {routes.length === 0 && <p style={{ color: '#999', fontSize: '14px' }}>No hay rutas guardadas.</p>}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {routes.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '10px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #eee', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{r.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{r.stops.length} paquetes</div>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => activateRoute(r)} style={{ padding: '6px 12px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cargar</button>
                  <button onClick={() => deleteRoute(r.id)} style={{ padding: '6px 12px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
          {message && <div style={{ marginTop: '10px', padding: '10px', background: '#fff9c4', borderRadius: '5px', fontSize: '14px' }}>{message}</div>}
        </section>

        <section style={{ flex: 2, height: '85vh', position: 'sticky', top: '20px' }}>
          <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {currentStop && (
              <Marker position={[currentStop.lat, currentStop.lng]}>
                <Popup>
                  <strong>{currentStop.fullDetails?.nombre}</strong><br/>
                  {currentStop.fullDetails?.direccion}
                </Popup>
              </Marker>
            )}
            {currentStop && nextStop && (
              <Polyline positions={[[currentStop.lat, currentStop.lng], [nextStop.lat, nextStop.lng]]} color="#3498db" dashArray="10, 10" />
            )}
            {currentStop && <FlyToPoint lat={currentStop.lat} lng={currentStop.lng} />}
          </MapContainer>
        </section>
      </main>
    </div>
  );
}