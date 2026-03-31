import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import React, { useEffect, useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import './styles.css'; 
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
});

function FlyToPoint({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], 16);
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

  useEffect(() => {
    const saved = localStorage.getItem('logistic_routes');
    if (saved) setRoutes(JSON.parse(saved));
  }, []);

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
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
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
      id: `${Date.now()}`,
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
      if (activeRouteId && window.confirm("¿Eliminar esta ruta de guardados?")) deleteRoute(activeRouteId);
      setMessage('🏁 ¡Entrega finalizada!');
      setMode('plan'); setStops([]); setActiveRouteId(null);
    }
  };

  const saveRoute = () => {
    if (stops.length < 1) return;
    const newRoute = { id: Date.now().toString(), name: routeName, stops: [...stops], status: 'pending' };
    setRoutes(prev => [...prev, newRoute]);
    setStops([]); setRouteName('Nueva Ruta');
    setMessage('💾 Ruta guardada.');
  };

  const activateRoute = (route) => {
    setActiveRouteId(route.id);
    setMode('active');
    setCurrentStopIndex(0);
    openGoogleMaps(route.stops[0].lat, route.stops[0].lng);
  };

  const deleteRoute = (id) => {
    setRoutes(prev => prev.filter(r => r.id !== id));
    if (activeRouteId === id) { setMode('plan'); setActiveRouteId(null); }
    setMessage('🗑️ Ruta eliminada.');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🚚 Logistic Map</h1>
        <p>{mode === 'active' ? 'En ruta de entrega' : 'Planificación de despacho'}</p>
      </header>

      <main className="main-layout">
        <section className="side-panel">
          
          {mode === 'active' ? (
            <div className="active-card">
              <h2>📍 Parada {currentStopIndex + 1}</h2>
              {currentStop && (
                <div className="client-info">
                  <p><strong>👤 Cliente:</strong> {currentStop.fullDetails?.nombre}</p>
                  <p><strong>🏠 Dirección:</strong> {currentStop.fullDetails?.direccion}</p>
                  <p><strong>🏘️ Barrio:</strong> {currentStop.fullDetails?.barrio}</p>
                  <p><strong>📱 Celular:</strong> {currentStop.fullDetails?.celular}</p>
                  <div className="btn-group">
                    <button onClick={() => openGoogleMaps(currentStop.lat, currentStop.lng)} className="btn-gps">Abrir GPS</button>
                    <button onClick={completeStop} className="btn-next">Siguiente</button>
                  </div>
                </div>
              )}
              <button onClick={() => setMode('plan')} className="btn-cancel">Cancelar Entrega</button>
            </div>
          ) : (
            <div className="plan-section">
              <div className="form-group">
                <h3>📝 Nueva Parada</h3>
                <textarea
                  className="smart-input"
                  value={smartInput}
                  onChange={(e) => setSmartInput(e.target.value)}
                  placeholder="Nombre - Dirección sin guión - Barrio - Celular"
                  rows="3"
                />
                <div className="coords-inputs">
                  <input type="number" placeholder="Latitud" value={manualLat} onChange={(e) => setManualLat(e.target.value)} />
                  <input type="number" placeholder="Longitud" value={manualLng} onChange={(e) => setManualLng(e.target.value)} />
                </div>
                <button onClick={confirmManualStop} className="btn-add">➕ Agregar a la Lista</button>
              </div>

              <div className="route-controls">
                <input className="route-name-input" value={routeName} onChange={(e) => setRouteName(e.target.value)} />
                <div className="btn-group">
                  <button onClick={startDelivery} disabled={stops.length === 0} className="btn-start">🚀 Iniciar Ya</button>
                  <button onClick={saveRoute} disabled={stops.length === 0} className="btn-save">💾 Guardar Ruta</button>
                </div>
              </div>
            </div>
          )}

          <div className="saved-routes-section">
            <h3>📚 Rutas Guardadas</h3>
            {routes.length === 0 && <p className="empty-text">No hay rutas guardadas.</p>}
            <div className="routes-scroll">
              {routes.map(r => (
                <div key={r.id} className="route-item">
                  <div className="route-text">
                    <strong>{r.name}</strong>
                    <span>{r.stops.length} paquetes</span>
                  </div>
                  <div className="route-btns">
                    <button onClick={() => activateRoute(r)} className="btn-load">Cargar</button>
                    <button onClick={() => deleteRoute(r.id)} className="btn-delete">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {message && <div className="status-message">{message}</div>}
        </section>

        <section className="map-container-wrapper">
          <MapContainer center={mapCenter} zoom={15} className="leaflet-map">
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