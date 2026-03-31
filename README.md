# Logistic Map - Planeador de Rutas (Frontend)

App de planificación de entregas multi-parada (React + Leaflet) desplegable en GitHub Pages.

## Características

- Registro de paradas ilimitadas
- Cálculo de ruta con OpenRouteService (opcional) o OSRM (fallback gratuito)
- Guardado en localStorage (persistencia local)
- Manejo de rutas: crear, finalizar, siguiente, completa
- UI responsive para desktop y mobile

## Cómo usar

1. Instala dependencias:
   - `npm install`
2. Ejecuta en local:
   - `npm run dev`
3. API key:
   - Opcional: pega tu OpenRouteService API key (mejor precisión y robustez)
   - Si no tienes, usa `OSRM` public fallback (limitado a una sola ruta a la vez pero funcional)
4. Agrega direcciones y calcula ruta.
5. Finaliza ruta para guardarla y vaciar espacio de trabajo.
6. Pulsa "Siguiente ruta" para cargar la siguiente ruta pendiente.

## Despliegue en GitHub Pages

1. Crea un repositorio y sube todo.
2. En `Settings > Pages`, elige rama `main` y carpeta `/`.
3. URL: `https://<tu-usuario>.github.io/<repo>`

## Notas

- Para usar OpenRouteService pide una clave gratis en https://openrouteservice.org/sign-up/
- Geocoding usa Nominatim (OpenStreetMap). Respeta límites de uso (1 rps, uso responsable).
- Si necesitas soporte para más de 100 rutas, el app está pensado para usar `localStorage` y JSON.
