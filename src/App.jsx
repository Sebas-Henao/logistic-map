import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import React, { useEffect, useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';
import L from 'leaflet';
import './styles.css'; 

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
  const [stops, setStops]                       = useState([]);
  const [routes, setRoutes]                     = useState([]);
  const [activeRouteId, setActiveRouteId]       = useState(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [message, setMessage]                   = useState('');
  const [routeName, setRouteName]               = useState('Mi Nueva Ruta');
  const [mode, setMode]                         = useState('plan');
  const [smartInput, setSmartInput]             = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('logistic_routes');
    if (saved) setRoutes(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('logistic_routes', JSON.stringify(routes));
  }, [routes]);

  const currentStopsList = useMemo(() => {
    if (mode === 'active' && activeRouteId) {
      const route = routes.find((r) => r.id === activeRouteId);
      return route?.stops || [];
    }
    return stops;
  }, [mode, activeRouteId, stops, routes]);

  const currentStop = currentStopsList[currentStopIndex] || null;
  const nextStop = currentStopsList[currentStopIndex + 1] || null;

  const mapCenter = useMemo(() => {
    if (currentStop) return [currentStop.lat, currentStop.lng];
    return [6.1537, -75.3739];
  }, [currentStop]);

  const openGoogleMaps = (lat, lng) => {
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  const parseSmartInput = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== "");
    if (lines.length < 7) return null;
    return {
      nombre: lines[0],
      direccion: lines[1],
      barrio: lines[2],
      celular: lines[3],
      Numpaq: lines[4],
      lat: parseFloat(lines[5]),
      lng: parseFloat(lines[6])
    };
  };

  const confirmManualStop = () => {
    const cliente = parseSmartInput(smartInput);
    if (!cliente || isNaN(cliente.lat) || isNaN(cliente.lng)) {
      setMessage('⚠️ Error: El formato debe tener 7 líneas exactas.');
      return;
    }
    const newStop = {
      id: `${Date.now()}`,
      address: cliente.direccion,
      fullDetails: cliente,
      lat: cliente.lat, 
      lng: cliente.lng,
      status: 'pending',
      sector: 'S/D'
    };
    setStops((prev) => [...prev, newStop]);
    setSmartInput('');
    setMessage(`✅ Agregado: ${cliente.nombre}`);
  };

  const optimizeBySectors = () => {
    if (stops.length < 2) return;
    
    const points = stops.map(s => turf.point([s.lng, s.lat], { originalId: s.id }));
    const collection = turf.featureCollection(points);
    const clustered = turf.clustersDbscan(collection, 0.2, { units: 'kilometers', minPoints: 1 });

    const grouped = {};
    clustered.features.forEach(f => {
      
      const clusterId = f.properties.cluster !== null ? f.properties.cluster : 'R';
      if (!grouped[clusterId]) grouped[clusterId] = [];
      const stop = stops.find(s => s.id === f.properties.originalId);
      
      
      grouped[clusterId].push({
        ...stop, 
        sector: clusterId === 'R' ? 'Aislado' : `Sector ${clusterId + 1}`
      });
    });

    let optimizedList = [];
    Object.keys(grouped).sort().forEach(key => {
      optimizedList = [...optimizedList, ...grouped[key]];
    });

    setStops(optimizedList);
    setMessage(`🎯 Sectores listos: ${Object.keys(grouped).length} zonas.`);
  };

  const startDelivery = () => {
    if (stops.length < 1) return;
    setMode('active');
    setCurrentStopIndex(0);
    setActiveRouteId(null); 
    openGoogleMaps(stops[0].lat, stops[0].lng);
  };

  const completeStop = () => {
    if (currentStopIndex < currentStopsList.length - 1) {
      const nextIdx = currentStopIndex + 1;
      setCurrentStopIndex(nextIdx);
      openGoogleMaps(currentStopsList[nextIdx].lat, currentStopsList[nextIdx].lng);
    } else {
      setMessage('🏁 ¡Entrega finalizada!');
      setMode('plan'); 
      setStops([]); 
      setActiveRouteId(null);
      setCurrentStopIndex(0);
    }
  };

  const saveRoute = () => {
    if (stops.length < 1) return;
    const newRoute = { id: Date.now().toString(), name: routeName, stops: [...stops], status: 'pending' };
    setRoutes(prev => [...prev, newRoute]);
    setStops([]); 
    setRouteName('Mi Nueva Ruta');
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
    if (activeRouteId === id) setMode('plan');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🚚 Logistic Map Pro</h1>
        <p>{mode === 'active' ? '⚡ Ruta en curso' : '⚙️ Planificación'}</p>
      </header>

      <main className="main-layout">
        <section className="side-panel">
          
          {mode === 'active' ? (
            <div className="active-card">
              <div className="sector-tag" style={{background: '#6c5ce7', color: 'white', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '10px'}}>
                {currentStop?.sector}
              </div>
              <h2>📍 Parada {currentStopIndex + 1} de {currentStopsList.length}</h2>
              
              {currentStop && (
                <div className="client-info">
                  <p><strong>👤 Cliente:</strong> {currentStop.fullDetails?.nombre}</p>
                  <p><strong>🏠 Dirección:</strong> {currentStop.fullDetails?.direccion}</p>
                  <p><strong>🏘️ Barrio:</strong> {currentStop.fullDetails?.barrio}</p>
                  <p><strong>📱 Celular:</strong> {currentStop.fullDetails?.celular}</p>
                  <p><strong>📦 Cant paq:</strong> {currentStop.fullDetails?.Numpaq}</p>
                  <div className="btn-group">
                    <button onClick={() => openGoogleMaps(currentStop.lat, currentStop.lng)} className="btn-gps">Abrir GPS</button>
                    <button onClick={completeStop} className="btn-next">
                      {currentStopIndex === currentStopsList.length - 1 ? 'Finalizar' : 'Siguiente'}
                    </button>
                  </div>
                </div>
              )}
              <button onClick={() => {setMode('plan'); setCurrentStopIndex(0);}} className="btn-cancel">Salir de la Ruta</button>
            </div>
          ) : (
            <div className="plan-section">
              <div className="form-group">
                <h3>📝 Nueva Parada</h3>
                <p style={{fontSize: '0.9rem', color: '#555'}}>Formato ingreso: Nombre, dirección, barrio, celular, cantidad, latitud, longitud</p>
                <textarea
                  className="smart-input"
                  value={smartInput}
                  onChange={(e) => setSmartInput(e.target.value)}
                  placeholder={"Nombre\nDirección\nBarrio\nCelular\nCantidad\nLatitud\nLongitud"}
                  rows="8"
                />
                <button onClick={confirmManualStop} className="btn-add">➕ Agregar a la Lista</button>
              </div>

              <div className="route-controls">
                <h3>⚙️ Controles de Ruta</h3>
                <input 
                  className="route-name-input" 
                  value={routeName} 
                  onChange={(e) => setRouteName(e.target.value)} 
                />
                <div className="btn-group" style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  <button 
                    onClick={optimizeBySectors} 
                    disabled={stops.length < 2} 
                    className="btn-start" 
                    style={{background: '#6c5ce7'}}>
                      🎯 Agrupar por Sectores
                  </button>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <button 
                      onClick={startDelivery} 
                      disabled={stops.length === 0} 
                      className="btn-start" 
                      style={{flex: 1}}>
                        🚀 Iniciar
                    </button>
                    <button 
                      onClick={saveRoute} 
                      disabled={stops.length === 0} 
                      className="btn-save" 
                      style={{flex: 1}}>
                        💾 Guardar
                    </button>
                  </div>
                </div>
              </div>

              <div className="stops-list-mini">
                 <strong>Lista de carga ({stops.length}):</strong>
                 <div className="mini-scroll" style={{maxHeight: '200px', overflowY: 'auto', background: '#f9f9f9', padding: '10px', borderRadius: '8px', border: '1px solid #ddd'}}>
                  {stops.map((s, i) => (
                    <div key={i} className="mini-item" style={{borderBottom: '1px solid #eee', padding: '5px 0', fontSize: '0.9rem'}}>
                      <strong>{i+1}.</strong> {s.fullDetails.nombre} | 📦 {s.fullDetails.Numpaq} | <span style={{color: '#6c5ce7', fontWeight: 'bold'}}>{s.sector}</span>
                    </div>
                  ))}
                 </div>
              </div>
            </div>
          )}

          <div className="saved-routes-section">
            <h3>📚 Historial de Rutas</h3>
            <div className="routes-scroll">
              {routes.map(r => (
                <div key={r.id} className="route-item">
                  <div className="route-text"><strong>{r.name}</strong><span>{r.stops.length} envíos</span></div>
                  <div className="route-btns">
                    <button 
                      onClick={() => activateRoute(r)} 
                      className="btn-load">
                        Cargar
                    </button>
                    <button 
                      onClick={() => deleteRoute(r.id)} 
                      className="btn-delete">
                        ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {message && <div className="status-message" style={{position: 'fixed', bottom: '20px', left: '20px', background: '#333', color: '#fff', padding: '10px 20px', borderRadius: '30px', zIndex: 1000}}>{message}</div>}
        </section>

        <section className="map-container-wrapper">
          <MapContainer center={mapCenter} zoom={15} className="leaflet-map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {currentStopsList.map((stop, idx) => (
              <Marker key={stop.id} position={[stop.lat, stop.lng]}>
                <Popup>
                  <strong>{idx + 1}. {stop.fullDetails?.nombre}</strong><br/>
                  Sector: {stop.sector}<br/>
                  Paquetes: {stop.fullDetails?.Numpaq}
                </Popup>
              </Marker>
            ))}
            {currentStop && nextStop && (
              <Polyline positions={[[currentStop.lat, currentStop.lng], [nextStop.lat, nextStop.lng]]} color="#3498db" dashArray="10, 10" />
            )}
            <FlyToPoint lat={currentStop?.lat} lng={currentStop?.lng} />
          </MapContainer>
        </section>
      </main>
    </div>
  );
}