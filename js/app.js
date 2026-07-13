(() => {
  'use strict';

  const DATA_PATH = 'dados/instituicoes.json';

  function normalizeText(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function validateInstitution(item) {
    if (!item || typeof item !== 'object') return null;

    const requiredStrings = [
      'nome_instituicao', 'categoria', 'categoria_label', 'endereco', 'bairro',
      'cep', 'cidade', 'estado', 'horario', 'descricao_atendimento',
      'forma_acesso', 'observacoes', 'fonte', 'data_validacao'
    ];

    const validStrings = requiredStrings.every((field) => isNonEmptyString(item[field]));
    const validCoordinates = Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude));
    const validServices = Array.isArray(item.tipo_atendimento) && item.tipo_atendimento.every(isNonEmptyString);
    const validId = Number.isInteger(Number(item.id)) && Number(item.id) > 0;

    if (!validStrings || !validCoordinates || !validServices || !validId) return null;

    return {
      ...item,
      id: Number(item.id),
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      telefone: typeof item.telefone === 'string' ? item.telefone : '',
      telefone_link: typeof item.telefone_link === 'string' ? item.telefone_link : '',
      site: typeof item.site === 'string' ? item.site : '',
      precisa_encaminhamento: Boolean(item.precisa_encaminhamento),
      precisa_agendamento: Boolean(item.precisa_agendamento),
      validado: Boolean(item.validado)
    };
  }

  async function loadInstitutions() {
    const response = await fetch(DATA_PATH, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Falha HTTP ${response.status}`);

    const payload = await response.json();
    if (!Array.isArray(payload)) throw new Error('Formato de dados inválido');

    const validItems = payload.map(validateInstitution).filter(Boolean);
    if (!validItems.length) throw new Error('Nenhum registro válido');
    return validItems;
  }

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return 'Data não informada';
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }

  function haversineDistance(origin, destination) {
    const earthRadiusKm = 6371;
    const toRadians = (degrees) => degrees * (Math.PI / 180);
    const latitudeDelta = toRadians(destination.latitude - origin.latitude);
    const longitudeDelta = toRadians(destination.longitude - origin.longitude);
    const originLatitude = toRadians(origin.latitude);
    const destinationLatitude = toRadians(destination.latitude);

    const haversine = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(originLatitude) * Math.cos(destinationLatitude)
      * Math.sin(longitudeDelta / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  function extractCep(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits.length === 8 ? digits : '';
  }

  async function requestJson(url, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'Accept-Language': 'pt-BR' },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Falha HTTP ${response.status}`);
      return await response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function geocodeWithNominatim(query, restrictToCuritiba = true) {
    const parameters = new URLSearchParams({
      q: restrictToCuritiba ? `${query}, Curitiba, Paraná, Brasil` : query,
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'br',
      addressdetails: '1'
    });
    if (restrictToCuritiba) {
      parameters.set('bounded', '1');
      parameters.set('viewbox', '-49.389,-25.346,-49.173,-25.650');
    }

    const results = await requestJson(`https://nominatim.openstreetmap.org/search?${parameters.toString()}`);
    const first = Array.isArray(results) ? results[0] : null;
    const latitude = Number(first?.lat);
    const longitude = Number(first?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return {
      latitude,
      longitude,
      label: typeof first.display_name === 'string' ? first.display_name : query
    };
  }

  async function geocodeCep(cep) {
    const data = await requestJson(`https://viacep.com.br/ws/${encodeURIComponent(cep)}/json/`);
    if (!data || data.erro) throw new Error('CEP não encontrado');

    const formattedCep = `${cep.slice(0, 5)}-${cep.slice(5)}`;
    const fullAddress = [data.logradouro, data.bairro, data.localidade, data.uf, formattedCep, 'Brasil']
      .filter(Boolean)
      .join(', ');
    const neighborhoodAddress = [data.bairro, data.localidade, data.uf, formattedCep, 'Brasil']
      .filter(Boolean)
      .join(', ');

    const location = await geocodeWithNominatim(fullAddress, false)
      || await geocodeWithNominatim(neighborhoodAddress, false)
      || await geocodeWithNominatim(`${formattedCep}, Brasil`, false);
    if (!location) throw new Error('Coordenadas do CEP não encontradas');
    return { ...location, label: fullAddress, cep: formattedCep };
  }

  async function geocodeLocation(value) {
    const query = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 160);
    if (!query) throw new Error('Endereço vazio');

    const cep = extractCep(query);
    if (cep) return geocodeCep(cep);

    const location = await geocodeWithNominatim(query, true);
    if (!location) throw new Error('Endereço não localizado');
    return location;
  }

  function getGeolocationErrorMessage(error) {
    if (!error) return 'Não foi possível obter sua localização.';
    if (error.code === error.PERMISSION_DENIED) return 'Permissão de localização negada. Você pode continuar pesquisando sem usar sua posição.';
    if (error.code === error.POSITION_UNAVAILABLE) return 'Sua localização está indisponível no momento.';
    if (error.code === error.TIMEOUT) return 'O tempo de espera para obter sua localização foi excedido.';
    return 'Não foi possível obter sua localização.';
  }

  function requestLocation(onSuccess, onError) {
    if (!('geolocation' in navigator)) {
      onError('Este navegador não oferece suporte à geolocalização.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSuccess({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => onError(getGeolocationErrorMessage(error)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function createResultsUrl(query = '', category = '', useLocation = false) {
    const parameters = new URLSearchParams();
    const cleanQuery = String(query).replace(/\s+/g, ' ').trim().slice(0, 160);
    if (cleanQuery) parameters.set('q', cleanQuery);
    if (category) parameters.set('categoria', category);
    if (useLocation) parameters.set('localizar', '1');
    const suffix = parameters.toString();
    return `resultados.html${suffix ? `?${suffix}` : ''}`;
  }

  function createRouteUrl(institution, userLocation = null) {
    const destination = `${institution.latitude},${institution.longitude}`;
    if (userLocation) {
      const origin = `${userLocation.latitude},${userLocation.longitude}`;
      return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(origin)}%3B${encodeURIComponent(destination)}`;
    }
    return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(institution.latitude)}&mlon=${encodeURIComponent(institution.longitude)}#map=17/${encodeURIComponent(institution.latitude)}/${encodeURIComponent(institution.longitude)}`;
  }

  function setStatus(element, message = '', isError = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('error', isError);
  }

  function initializeMenu() {
    const menuButton = document.querySelector('.menu-toggle');
    const navigation = document.querySelector('.main-nav');
    if (!menuButton || !navigation) return;

    menuButton.addEventListener('click', () => {
      const isOpen = navigation.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
      menuButton.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    });
  }

  function initializeHomePage() {
    const form = document.getElementById('home-search-form');
    if (!form) return;

    const input = document.getElementById('home-search-input');
    const locationButton = document.getElementById('home-location-button');
    const status = document.getElementById('home-status');
    const categoryButtons = [...document.querySelectorAll('[data-category]')];
    let selectedCategory = '';

    categoryButtons.forEach((button) => {
      button.addEventListener('click', () => {
        selectedCategory = button.dataset.category || '';
        categoryButtons.forEach((item) => {
          const selected = item === button;
          item.classList.toggle('active', selected);
          item.setAttribute('aria-pressed', String(selected));
        });
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      window.location.href = createResultsUrl(input.value, selectedCategory);
    });

    locationButton?.addEventListener('click', () => {
      locationButton.disabled = true;
      setStatus(status, 'Solicitando sua localização…');
      requestLocation(
        () => {
          setStatus(status, 'Localização obtida. Abrindo os resultados por proximidade…');
          window.location.href = createResultsUrl(input.value, selectedCategory, true);
        },
        (message) => {
          locationButton.disabled = false;
          setStatus(status, message, true);
        }
      );
    });
  }

  window.ConectaSorriso = Object.freeze({
    normalizeText,
    loadInstitutions,
    formatDate,
    haversineDistance,
    extractCep,
    geocodeLocation,
    requestLocation,
    createResultsUrl,
    createRouteUrl,
    setStatus
  });

  document.addEventListener('DOMContentLoaded', () => {
    initializeMenu();
    initializeHomePage();
  });
})();
