import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import './leaflet-local.css';
import axios from 'axios';
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
    if (lat && lng) {
      map.setView([lat, lng], 16);
    }
  }, [lat, lng, map]);
  return null;
}

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [stopAddress, setStopAddress] = useState('');
  const [stops, setStops] = useState([]);
  const [appVersion] = useState('v01');
  const [routes, setRoutes] = useState([]);
  const [activeRouteId, setActiveRouteId] = useState(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [routeName, setRouteName] = useState('Nombre de ruta');
  const [mode, setMode] = useState('plan');
  const [draggedItem, setDraggedItem] = useState(null);
  const [previewLat, setPreviewLat] = useState(null);
  const [previewLng, setPreviewLng] = useState(null);
  const [previewAddress, setPreviewAddress] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [city, setCity] = useState('Bogotá, Colombia');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');


  useEffect(() => {
    const savedRoutes = localStorage.getItem('logistic_routes');
    const savedApiKey = localStorage.getItem('logistic_api_key');
    const savedCity = localStorage.getItem('logistic_city');
    if (savedRoutes) setRoutes(JSON.parse(savedRoutes));
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedCity) setCity(savedCity);
  }, []);


  useEffect(() => {
    localStorage.setItem('logistic_routes', JSON.stringify(routes));
  }, [routes]);

  useEffect(() => {
    localStorage.setItem('logistic_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('logistic_city', city);
  }, [city]);


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
    if (currentStop) {
      return [currentStop.lat, currentStop.lng];
    }
    return [6.153731733114769, -75.37393800388567];
  }, [currentStop]);

  const openGoogleMaps = (lat, lng, label = '') => {
    if (!lat || !lng) {
      setMessage('Coordenadas inválidas para Google Maps.');
      return;
    }

    let url;
    if (label && !label.toLowerCase().includes('coordenadas manuales')) {
      const query = encodeURIComponent(`${label}, ${lat}, ${lng}`);
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    } else {
      const query = encodeURIComponent(`${lat},${lng}`);
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }

    window.open(url, '_blank');
  };

  
  const addStop = async () => {
    if (!stopAddress.trim()) {
      setMessage('Escribe una dirección para agregar la parada.');
      return;
    }

    setLoading(true);
    setMessage('Buscando dirección...');

    const isCoordinateInput = /^\s*([+-]?\d+(?:\.\d+)?)\s*[,.\s]\s*([+-]?\d+(?:\.\d+)?)\s*$/.exec(stopAddress);
    if (isCoordinateInput) {
      const lat = parseFloat(isCoordinateInput[1]);
      const lng = parseFloat(isCoordinateInput[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        const manualAddress = `Coordenadas manuales: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const newStop = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          address: manualAddress,
          lat,
          lng,
          status: 'pending'
        };

        setStops((prev) => [...prev, newStop]);
        setStopAddress('');
        setPreviewLat(lat);
        setPreviewLng(lng);
        setPreviewAddress(manualAddress);
        setMessage('Parada agregada con coordenadas manuales.');
        setLoading(false);
        return;
      }
    }

    try {
      const isStreetNotation = /\b(calle|cll|cra|carrera|av\.?|avenida|transversal|tvg\.?|#|n?o\.?|nro\.?|\d+)\b/i.test(stopAddress);
      const addressComponent = stopAddress.trim().replace(/\s*#\s*/g, ' #').replace(/\s+/g, ' ').trim();
      const normalizedCity = city && city.trim() ? city.trim() : 'Colombia';
      let query;

      if (isStreetNotation) {
        query = `${addressComponent}, ${normalizedCity}${normalizedCity.toLowerCase().includes('colombia') ? '' : ', Colombia'}`;
      } else {
        query = `${addressComponent}, ${normalizedCity}${normalizedCity.toLowerCase().includes('colombia') ? '' : ', Colombia'}`;
      }

      let results = [];

      if (apiKey && apiKey.trim()) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${apiKey}&limit=10&autocomplete=false&types=address&country=co`;
        console.log('Consultando Mapbox exacta:', url);
        const { data } = await axios.get(url);

        if (!data.features || data.features.length === 0) {
          setMessage('No se encontró con Mapbox. Verifica la dirección o el token.');
          setLoading(false);
          return;
        }

        results = data.features.map((f) => ({
          lat: f.center[1],
          lng: f.center[0],
          display_name: f.place_name
        }));
      } else {
        const url = `/nominatim/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1&accept-language=es&extratags=1&countrycodes=co`;
        console.log('Consultando Nominatim exacta:', url);
        const { data } = await axios.get(url, {
          headers: { 'User-Agent': 'logistic-map-app/1.0' }
        });

        if (!data || data.length === 0) {
          setMessage('No se encontró. Puedes ingresar coordenadas manualmente abajo o intenta con más detalles.');
          setLoading(false);
          return;
        }

        results = data.map((item) => ({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          display_name: item.display_name || query
        }));
      }
      if (!results || results.length === 0) {
          setSearchResults([]);
          setMessage('No se encontró ningún resultado. Ajusta la dirección o usa coordenadas manuales.');
          setLoading(false);
          return;
        }


      const limitedResults = results.slice(0, 10);
      setSearchResults(limitedResults);

      if (limitedResults.length === 1) {
        const first = limitedResults[0];
        const newStop = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          address: first.display_name,
          lat: first.lat,
          lng: first.lng,
          status: 'pending'
        };

        setStops((prev) => [...prev, newStop]);
        setStopAddress('');
        setPreviewLat(first.lat);
        setPreviewLng(first.lng);
        setPreviewAddress(first.display_name);
        setSearchResults([]);
        setMessage(`Parada agregada: ${first.display_name}`);
        openGoogleMaps(first.lat, first.lng, first.display_name);
      } else {
        setMessage(`Se encontraron ${limitedResults.length} coincidencias. Elige una para agregar.`);
      }

    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        setMessage('Demasiadas solicitudes de geocoding. Espera unos segundos e intenta de nuevo.');
      } else {
        setMessage('Error en geocoding. Revisa tu conexión o usa coordenadas manuales.');
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmStop = () => {
    if (!previewLat || !previewLng || !previewAddress) {
      setMessage('Completa la búsqueda primero.');
      return;
    }

    const newStop = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      address: previewAddress,
      lat: previewLat,
      lng: previewLng,
      status: 'pending'
    };

    setStops((prev) => [...prev, newStop]);
    setStopAddress('');
    setPreviewLat(null);
    setPreviewLng(null);
    setPreviewAddress('');
    setSearchResults([]);
    setMessage(`Parada agregada correctamente.`);
  };

    const selectSearchResult = (result) => {
      const newStop = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        address: result.display_name,
        lat: result.lat,
        lng: result.lng,
        status: 'pending'
      };

      setStops((prev) => [...prev, newStop]);
      setStopAddress('');
      setManualLat(result.lat.toFixed(5));
      setManualLng(result.lng.toFixed(5));
      setPreviewLat(result.lat);
      setPreviewLng(result.lng);
      setPreviewAddress(result.display_name);
      setSearchResults([]);
      setMessage(`Parada agregada: ${result.display_name}`);
      openGoogleMaps(result.lat, result.lng, result.display_name);
    };



  const confirmManualStop = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setMessage('Ingresa coordenadas válidas (lat: -90 a 90, lng: -180 a 180).');
      return;
    }

    const manualAddress = `Coordenadas manuales: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    const newStop = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      address: manualAddress,
      lat: lat,
      lng: lng,
      status: 'pending'
    };

    setStops((prev) => [...prev, newStop]);
    setStopAddress('');
    setManualLat('');
    setManualLng('');
    setMessage(`Parada agregada correctamente con coordenadas manuales.`);
    openGoogleMaps(lat, lng, manualAddress);
  };

  const handleAddressChange = (value) => {
    setStopAddress(value);
  };

  const cancelPreview = () => {
    setPreviewLat(null);
    setPreviewLng(null);
    setPreviewAddress('');
  };

  const removeStop = (id) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
    if (currentStopIndex >= stops.length - 1) {
      setCurrentStopIndex(Math.max(0, currentStopIndex - 1));
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === dropIndex) return;

    const newStops = [...stops];
    const [draggedStop] = newStops.splice(draggedItem, 1);
    newStops.splice(dropIndex, 0, draggedStop);
    setStops(newStops);
    setDraggedItem(null);
    setMessage('Orden de paradas actualizado.');
  };

  const startDelivery = () => {
    if (stops.length < 1) {
      setMessage('Agrega al menos 1 parada para iniciar entrega.');
      return;
    }

    setMode('active');
    setCurrentStopIndex(0);
    setMessage('Entrega iniciada. Abre Google Maps para dirigirte a la parada.');
    openGoogleMaps(stops[0].lat, stops[0].lng, stops[0].address);
  };

  const completeStop = () => {
    if (!currentStop) return;

    if (mode === 'active' && activeRouteId) {
      setRoutes((prev) =>
        prev.map((route) => {
          if (route.id === activeRouteId) {
            const updatedRoute = { ...route };
            updatedRoute.stops[currentStopIndex].status = 'done';
            return updatedRoute;
          }
          return route;
        })
      );

      if (nextStop) {
        setCurrentStopIndex((prev) => prev + 1);
        setMessage(`Parada completada. Dirigiéndose a: ${nextStop.address.substring(0, 40)}...`);
        openGoogleMaps(nextStop.lat, nextStop.lng, nextStop.address);
      } else {
        setMessage('¡Todas las paradas completadas! Ruta finalizada.');
        setRoutes((prev) =>
          prev.map((r) => (r.id === activeRouteId ? { ...r, status: 'done' } : r))
        );
        setMode('plan');
        setCurrentStopIndex(0);
        setActiveRouteId(null);
      }
    } else {
      const updatedStops = [...stops];
      updatedStops[currentStopIndex].status = 'done';
      setStops(updatedStops);

      if (nextStop) {
        setCurrentStopIndex((prev) => prev + 1);
        setMessage(`Parada completada. Dirigiéndose a: ${nextStop.address.substring(0, 40)}...`);
        openGoogleMaps(nextStop.lat, nextStop.lng, nextStop.address);
      } else {
        setMessage('¡Todas las paradas completadas!');
        setMode('plan');
        setCurrentStopIndex(0);
      }
    }
  };

  const saveRoute = () => {
    if (stops.length < 1) {
      setMessage('Agrega al menos 1 parada para guardar ruta.');
      return;
    }

    const newRoute = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: routeName || `Ruta ${routes.length + 1}`,
      stops: stops.map((s) => ({ ...s, status: 'pending' })),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setRoutes((prev) => [...prev, newRoute]);
    setStops([]);
    setCurrentStopIndex(0);
    setRouteName(`Ruta ${routes.length + 2}`);
    setMode('plan');
    setMessage(`Ruta guardada: ${newRoute.name}`);
  };

  const activateRoute = (routeId) => {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;

    setActiveRouteId(routeId);
    setCurrentStopIndex(0);
    setMode('active');
    setMessage(`Ruta activa: ${route.name}. Abre Google Maps para dirigirte a la primera parada.`);
    const firstStop = route.stops[0];
    openGoogleMaps(firstStop.lat, firstStop.lng, firstStop.address);
  };

  const deleteRoute = (routeId) => {
    setRoutes((prev) => prev.filter((r) => r.id !== routeId));
    if (activeRouteId === routeId) {
      setActiveRouteId(null);
      setMode('plan');
      setCurrentStopIndex(0);
    }
    setMessage('Ruta eliminada.');
  };

  const cancelDelivery = () => {
    setMode('plan');
    setCurrentStopIndex(0);
    setActiveRouteId(null);
    setMessage('Entrega cancelada.');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚚 Logistic Map</h1>
        <p>{mode === 'active' ? '🚚 Ruta en curso' : '📋 Planificar ruta'}</p>
        <small>Versión {appVersion} (exactitud de dirección mejorada)</small>
      </header>

      <main className="layout">
        <section className="panel">
          {mode === 'active' ? (

            <div className="mode-banner active-mode">
              <h2>Parada {currentStopIndex + 1}</h2>
              {currentStop ? (
                <>
                  <div className="current-stop">
                    <p className="stop-address">{currentStop.address}</p>
                    <p className="stop-coords">
                      {currentStop.lat.toFixed(5)}, {currentStop.lng.toFixed(5)}
                    </p>
                  </div>

                  {nextStop && (
                    <div className="next-stop">
                      <p className="label">📍 Siguiente parada:</p>
                      <p className="stop-address">{nextStop.address}</p>
                    </div>
                  )}

                  <div className="action-buttons">
                    <button
                      className="btn-primary"
                      onClick={() => openGoogleMaps(currentStop.lat, currentStop.lng, currentStop.address)}
                    >
                      📍 Abrir en Google Maps
                    </button>
                    <button className="btn-success" onClick={completeStop}>
                      ✓ Parada completada
                    </button>
                    <button className="btn-secondary" onClick={cancelDelivery}>
                      Cancelar ruta
                    </button>
                  </div>
                </>
              ) : (
                <p>No hay paradas disponibles.</p>
              )}
            </div>
          ) : (
            <div className="mode-banner plan-mode">
              <h2>Planificar nueva ruta</h2>

              <label>Ciudad / Región</label>
              <div className="city-selector">
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="Bogotá, Colombia">Bogotá, Colombia</option>
                  <option value="Medellín, Colombia">Medellín, Colombia</option>
                  <option value="Rionegro, Antioquia , Colombia">Rionegro, Colombia</option>
                  <option value="Cali, Colombia">Cali, Colombia</option>
                  <option value="Barranquilla, Colombia">Barranquilla, Colombia</option>
                  <option value="Cartagena, Colombia">Cartagena, Colombia</option>
                  <option value="Bucaramanga, Colombia">Bucaramanga, Colombia</option>
                  <option value="Guadalajara, México">Guadalajara, México</option>
                  <option value="México CDMX, México">México CDMX, México</option>
                  <option value="Custom">Personalizdo (escribe en la dirección)</option>
                </select>
              </div>

              <label>Nombre de ruta</label>
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="Ej: Ruta Centro"
              />

              <label>Dirección (Ej: Calle 10 #20-15)</label>
              <div className="address-input-container">
                <div className="inline-row">
                  <input
                    type="text"
                    value={stopAddress}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    placeholder="Ej: Calle 10 #20-15"
                    onKeyDown={(e) => e.key === 'Enter' && addStop()}
                    disabled={loading}
                  />
                  <button onClick={addStop} disabled={loading}>
                    {loading ? '🔍' : '+'}
                  </button>
                </div>

              </div>

              {searchResults.length > 0 && (
                <div className="search-results-box">
                  <h4>Elige una coincidencia (máx 10)</h4>
                  <ul>
                    {searchResults.map((result, idx) => (
                      <li key={`${result.lat}-${result.lon}-${idx}`}>
                        <button className="btn-small" onClick={() => selectSearchResult(result)}>
                          {result.display_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button className="btn-secondary" onClick={() => setSearchResults([])}>
                    ✕ Cancelar selección
                  </button>
                </div>
              )}

              <div className="manual-coords-box">
                <h4>O ingresa coordenadas manualmente:</h4>
                <div className="inline-row">
                  <input
                    type="number"
                    step="0.00001"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="Latitud"
                  />
                  <input
                    type="number"
                    step="0.00001"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    placeholder="Longitud"
                  />
                  <button onClick={confirmManualStop} disabled={!manualLat || !manualLng}>
                    ✓ Agregar
                  </button>
                </div>
              </div>

              {previewLat !== null && previewLng !== null && (
                <div className="preview-box">
                  <h4>Vista previa:</h4>
                  <div className="preview-content">
                    <p className="preview-address">{previewAddress}</p>
                    <div className="preview-coords">
                      <label>Lat:</label>
                      <input
                        type="number"
                        step="0.00001"
                        value={previewLat}
                        onChange={(e) => setPreviewLat(parseFloat(e.target.value))}
                      />
                      <label>Lng:</label>
                      <input
                        type="number"
                        step="0.00001"
                        value={previewLng}
                        onChange={(e) => setPreviewLng(parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="preview-actions">
                      <button className="btn-success" onClick={confirmStop}>
                        ✓ Confirmar
                      </button>
                      <button className="btn-secondary" onClick={cancelPreview}>
                        ✕ Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <h3>Paradas ({stops.length})</h3>
              <ul className="stop-list">
                {stops.map((stop, idx) => (
                  <li
                    key={stop.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, idx)}
                    className={draggedItem === idx ? 'dragging' : ''}
                  >
                    <span className="idx">{idx + 1}</span>
                    <span className="addr">{stop.address}</span>
                    <button className="btn-remove" onClick={() => removeStop(stop.id)}>
                      ✕
                    </button>
                  </li>
                ))}
              </ul>

              <div className="action-buttons">
                <button
                  className="btn-success"
                  onClick={startDelivery}
                  disabled={stops.length === 0 || loading}
                >
                  🚀 Iniciar entrega
                </button>
                <button className="btn-primary" onClick={saveRoute} disabled={stops.length === 0}>
                  💾 Guardar para después
                </button>
              </div>
            </div>
          )}

          <hr className="divider" />

          <h3>📚 Rutas guardadas ({routes.length})</h3>
          <ul className="route-list">
            {routes.map((route) => (
              <li key={route.id} className={route.status}>
                <div className="route-info">
                  <strong>{route.name}</strong>
                  <span className="badge">{route.stops.length} paradas</span>
                  <span className={`status ${route.status}`}>
                    {route.status === 'pending' ? '⏳ Pendiente' : '✓ Hecho'}
                  </span>
                </div>
                <div className="route-actions">
                  {route.status === 'pending' && mode !== 'active' && (
                    <button className="btn-small" onClick={() => activateRoute(route.id)}>
                      Entregar
                    </button>
                  )}
                  <button className="btn-small btn-remove" onClick={() => deleteRoute(route.id)}>
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {message && <p className="message">{message}</p>}
        </section>

        <section className="map-section">
          <MapContainer center={mapCenter} zoom={15} className="map" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {currentStop && (
              <Marker position={[currentStop.lat, currentStop.lng]}>
                <Popup>
                  <strong>📍 Parada actual</strong>
                  <br />
                  {currentStop.address}
                </Popup>
              </Marker>
            )}

            {nextStop && (
              <Marker position={[nextStop.lat, nextStop.lng]}>
                <Popup>
                  <strong>⏭️ Siguiente</strong>
                  <br />
                  {nextStop.address}
                </Popup>
              </Marker>
            )}

            {currentStop && nextStop && (
              <Polyline
                positions={[
                  [currentStop.lat, currentStop.lng],
                  [nextStop.lat, nextStop.lng]
                ]}
                color="blue"
                weight={3}
              />
            )}

            {currentStop && <FlyToPoint lat={currentStop.lat} lng={currentStop.lng} />}
          </MapContainer>
        </section>
      </main>

      <footer className="footer">
        <p>Logistic Map - Planificador de entregas simple y directo</p>
      </footer>
    </div>
  );
}
