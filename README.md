# 🚚 Logistic Map Pro - Optimizador de Última Milla

Logistic Map Pro es una aplicación de frontend diseñada para transportistas y repartidores que necesitan organizar múltiples paradas de forma inteligente. A diferencia de un planeador de rutas convencional, este sistema agrupa los pedidos por proximidad geográfica (sectores de 200m) para optimizar el tiempo de parqueo y facilitar entregas a pie.

## ✨ Características Principales

- **Smart Input de 7 Líneas**: Sistema de entrada de datos rápido mediante copiado y pegado de bloques de texto (Nombre, Dirección, Barrio, Celular, Paquetes, Lat, Lng).
- **Agrupamiento Inteligente (Clustering)**: Implementación del algoritmo **DBSCAN** para detectar sectores de entrega en un radio de 200 metros.
- **Optimización de Paradas**: Reordenamiento automático de la lista para completar sectores enteros antes de movilizar el vehículo a la siguiente zona.
- **Gestión de Paquetería**: Control visible del número de paquetes por cliente en la lista de carga, mapa y hoja de ruta activa.
- **Navegación Integrada**: Enlace directo a Google Maps con coordenadas precisas para cada parada.
- **Persistencia Local**: Guardado de rutas completas en `localStorage` para consulta sin conexión o uso posterior.

## 🛠️ Tecnologías Utilizadas

- **React.js**: Biblioteca principal para la interfaz de usuario.
- **Leaflet & React-Leaflet**: Renderizado de mapas interactivos y gestión de capas geográficas.
- **Turf.js**: Motor de análisis espacial utilizado para el clustering (DBSCAN) y cálculos geoespaciales.
- **Lucide React / CSS Custom Properties**: Diseño responsive y componentes visuales.
- **GitHub Pages**: Despliegue automatizado del build de producción.

## 🚀 Instalación y Uso Local

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/Sebas-Henao/logistic-map.git](https://github.com/Sebas-Henao/logistic-map.git)
   cd logistic-map

2. **Instalar dependencias:**
   ```bash
   npm install

3. **Ejecutar en modo desarrollo:**
   ```bash
   npm run dev


## 📋 Formato de Entrada de Datos

Para que el **Smart Input** procese correctamente los pedidos, cada bloque debe contener exactamente **7 líneas** en el siguiente orden. Es fundamental respetar este orden para que la latitud y longitud sean detectadas:

1. **Nombre del Cliente** (Ej: Juan Perez)
2. **Dirección** (Ej: Calle 10 # 20-30)
3. **Barrio** (Ej: Belén)
4. **Celular** (Ej: 3001234567)
5. **Cantidad de Paquetes** (Ej: 3)
6. **Latitud** (Ej: 6.2442)
7. **Longitud** (Ej: -75.5912)

> **Tip:** Puedes copiar estos bloques directamente desde un Excel o un chat de WhatsApp y pegarlos en el cuadro de texto. Pulsa "Agregar a la Lista" después de cada bloque.

---

## 🧠 Lógica de Optimización (Clustering)

La aplicación utiliza el algoritmo **DBSCAN** (Density-Based Spatial Clustering) a través de la librería **Turf.js** para agrupar las entregas:

- **Radio de Acción ($\epsilon$):** 0.2 km (200 metros).
- **Objetivo:** Identificar grupos de entregas que pueden realizarse estacionando el vehículo en un solo punto y completando el resto del trayecto a pie.
- **Resultado:** El sistema reordena la lista de carga automáticamente, asignando a cada parada un identificador de **Sector**.

---

## 🛠️ Notas Técnicas y Capacidades

1. **Sin API Key Externa:** La aplicación funciona totalmente en el lado del cliente (Frontend) y no requiere llaves de Google Maps o Mapbox para el renderizado básico.
2. **Navegación:** Los enlaces de GPS utilizan el protocolo universal de Google Maps para garantizar compatibilidad en dispositivos Android e iOS.
3. **Persistencia:** Los datos se guardan en el localStorage del navegador. Si limpias el historial/caché del navegador, las rutas guardadas se eliminarán.

---

## ⚖️ Licencia

Este proyecto está bajo la **Licencia MIT**. Esto significa que puedes usar, copiar, modificar y distribuir el software libremente, siempre y cuando se incluya el aviso de copyright original.

Consulta el archivo `LICENSE` para más detalles.

---

