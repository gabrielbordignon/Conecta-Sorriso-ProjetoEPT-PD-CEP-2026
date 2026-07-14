(() => {
  'use strict';

  const CURITIBA_CENTER = [-25.4284, -49.2733];
  const OPENFREEMAP_POSITRON_STYLE = 'https://tiles.openfreemap.org/styles/positron';
  const MAP_ATTRIBUTION = [
    '<a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>',
    '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a>',
    'dados <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>'
  ].join(' | ');
  const CATEGORY_CLASS = {
    'Clínica-escola pública': 'public-school',
    'Clínica-escola privada': 'private-school'
  };

  function createMarkerIcon(category, label = '') {
    const categoryClass = CATEGORY_CLASS[category] || '';
    const safeLabel = String(label).replace(/[^0-9]/g, '').slice(0, 2);
    return window.L.divIcon({
      className: '',
      html: `<div class="category-marker ${categoryClass}"><span>${safeLabel || '•'}</span></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 32],
      popupAnchor: [0, -30]
    });
  }

  function createUserIcon() {
    return window.L.divIcon({
      className: '',
      html: '<div class="user-marker"><span>●</span></div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  }

  function createPopup(institution) {
    const wrapper = document.createElement('div');
    wrapper.className = 'map-popup';

    const name = document.createElement('strong');
    name.textContent = institution.nome_instituicao;

    const category = document.createElement('span');
    category.textContent = institution.categoria_label;

    const link = document.createElement('a');
    link.href = `detalhes.html?id=${encodeURIComponent(institution.id)}`;
    link.textContent = 'Ver detalhes';

    wrapper.append(name, category, link);
    return wrapper;
  }

  function supportsWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch (_error) {
      return false;
    }
  }

  function createMap(elementId, options = {}) {
    const element = document.getElementById(elementId);
    if (!element || !window.L) return null;

    try {
      const map = window.L.map(element, {
        center: options.center || CURITIBA_CENTER,
        zoom: options.zoom || 12,
        scrollWheelZoom: false
      });

      try {
        if (!window.maplibregl || !window.L.maplibreGL || !supportsWebGL()) {
          throw new Error('MapLibre ou WebGL indisponível');
        }

        // O OpenFreeMap entrega tiles vetoriais. O adaptador oficial mantém os
        // controles, marcadores e pop-ups do Leaflet sobre o estilo Positron.
        window.L.maplibreGL({
          style: OPENFREEMAP_POSITRON_STYLE,
          attributionControl: { customAttribution: MAP_ATTRIBUTION }
        }).addTo(map);
      } catch (styleError) {
        // Navegadores sem WebGL continuam recebendo um mapa funcional.
        console.warn('O estilo Positron não pôde ser carregado; usando mapa de compatibilidade.', styleError);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a>'
        }).addTo(map);
      }

      const markerLayer = window.L.layerGroup().addTo(map);
      let userMarker = null;
      let resizeFrame = null;

      function refreshSize() {
        if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
        resizeFrame = window.requestAnimationFrame(() => {
          resizeFrame = window.requestAnimationFrame(() => {
            map.invalidateSize({ animate: false, pan: false });
            resizeFrame = null;
          });
        });
      }

      // O mapa pode ser criado enquanto sua coluna ainda está sendo exibida ou
      // redimensionada. O observador evita blocos vazios entre os tiles.
      const resizeObserver = 'ResizeObserver' in window
        ? new ResizeObserver(refreshSize)
        : null;
      resizeObserver?.observe(element);
      window.addEventListener('resize', refreshSize, { passive: true });
      window.addEventListener('orientationchange', refreshSize, { passive: true });

      refreshSize();
      window.setTimeout(refreshSize, 150);
      window.setTimeout(refreshSize, 500);

      function updateInstitutions(institutions) {
        markerLayer.clearLayers();
        const bounds = [];

        institutions.forEach((institution, index) => {
          const position = [institution.latitude, institution.longitude];
          const marker = window.L.marker(position, {
            icon: createMarkerIcon(institution.categoria, String(index + 1)),
            title: institution.nome_instituicao
          });
          marker.bindPopup(createPopup(institution));
          marker.addTo(markerLayer);
          bounds.push(position);
        });

        if (userMarker) bounds.push(userMarker.getLatLng());

        if (bounds.length === 1) {
          map.setView(bounds[0], 14);
        } else if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
        } else {
          map.setView(CURITIBA_CENTER, 12);
        }

        refreshSize();
      }

      function setUserLocation(location, label = 'Sua localização aproximada') {
        const position = [location.latitude, location.longitude];
        if (userMarker) userMarker.remove();
        userMarker = window.L.marker(position, {
          icon: createUserIcon(),
          title: label
        }).addTo(map).bindPopup(label);
      }

      function clearUserLocation() {
        if (!userMarker) return;
        userMarker.remove();
        userMarker = null;
      }

      return Object.freeze({ map, updateInstitutions, setUserLocation, clearUserLocation, refreshSize });
    } catch (error) {
      console.error('Não foi possível inicializar o mapa.', error);
      return null;
    }
  }

  window.ConectaMapa = Object.freeze({ createMap });
})();
