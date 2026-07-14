(() => {
  'use strict';

  const state = {
    institutions: [],
    filtered: [],
    query: '',
    category: '',
    userLocation: null,
    locationSource: null,
    locationLabel: '',
    mapController: null
  };

  const elements = {};

  function cacheElements() {
    elements.searchForm = document.getElementById('results-search-form');
    elements.searchInput = document.getElementById('results-search-input');
    elements.locationButton = document.getElementById('results-location-button');
    elements.status = document.getElementById('results-status');
    elements.count = document.getElementById('result-count');
    elements.countLabel = document.getElementById('result-count-label');
    elements.list = document.getElementById('institutions-list');
    elements.empty = document.getElementById('empty-results');
    elements.mapFallback = document.getElementById('map-fallback');
    elements.layout = document.querySelector('.results-layout');
    elements.filtersForm = document.getElementById('filters-form');
    elements.filterCategory = document.getElementById('filter-category');
    elements.filterNeighborhood = document.getElementById('filter-neighborhood');
    elements.filterService = document.getElementById('filter-service');
    elements.filterReferral = document.getElementById('filter-referral');
    elements.clearButtons = [
      document.getElementById('clear-search-top'),
      document.getElementById('clear-filters'),
      ...document.querySelectorAll('[data-clear-results]')
    ].filter(Boolean);
  }

  function parseInitialParameters() {
    const params = new URLSearchParams(window.location.search);
    const allowedCategories = ['', 'CEO', 'Clínica-escola pública', 'Clínica-escola privada'];
    const rawQuery = params.get('q') || '';
    const rawCategory = params.get('categoria') || '';

    state.query = rawQuery.replace(/\s+/g, ' ').trim().slice(0, 160);
    if (rawQuery.length > 160) {
      window.ConectaSorriso.setStatus(elements.status, 'O termo de busca era muito longo e foi ajustado.', true);
    }

    if (allowedCategories.includes(rawCategory)) {
      state.category = rawCategory;
    } else if (rawCategory) {
      window.ConectaSorriso.setStatus(elements.status, 'Um filtro inválido da URL foi ignorado.', true);
    }

    elements.searchInput.value = state.query;
    elements.filterCategory.value = state.category;
    return params.get('localizar') === '1';
  }

  function appendOptions(select, values) {
    values.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
  }

  function populateFilters() {
    const options = window.ConectaFiltros.getAvailableOptions(state.institutions);
    appendOptions(elements.filterNeighborhood, options.neighborhoods);
    appendOptions(elements.filterService, options.services);
  }

  function categorySymbol(category) {
    if (category === 'CEO') return '✚';
    return '▦';
  }

  function categoryClass(category) {
    if (category === 'Clínica-escola pública') return 'public-school';
    if (category === 'Clínica-escola privada') return 'private-school';
    return '';
  }

  function createTextElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }

  function createInstitutionCard(institution, index) {
    const card = document.createElement('article');
    card.className = 'institution-card';

    const symbol = createTextElement('div', `institution-symbol ${categoryClass(institution.categoria)}`, categorySymbol(institution.categoria));
    symbol.setAttribute('aria-hidden', 'true');

    const content = document.createElement('div');
    content.className = 'institution-content';

    const name = createTextElement('h3', 'institution-name', institution.nome_instituicao);
    const category = createTextElement('p', 'category-label', institution.categoria_label);
    const nearestBadge = index === 0 && state.userLocation
      ? createTextElement('span', 'nearest-badge', '★ Mais próxima')
      : null;

    const locationMeta = document.createElement('p');
    locationMeta.className = 'institution-meta';
    locationMeta.append(createTextElement('span', '', `⌖ ${institution.bairro}`));
    locationMeta.append(createTextElement('span', '', institution.endereco));
    if (Number.isFinite(institution.distance)) {
      locationMeta.append(createTextElement('span', '', `${institution.distance.toFixed(1).replace('.', ',')} km`));
    }

    const access = createTextElement('p', 'institution-meta', `Acesso: ${institution.forma_acesso}`);

    const tags = document.createElement('ul');
    tags.className = 'tag-list';
    institution.tipo_atendimento.slice(0, 3).forEach((service) => {
      const item = createTextElement('li', 'tag', service);
      tags.append(item);
    });

    const validationRow = document.createElement('div');
    validationRow.className = 'card-validation';
    const validation = createTextElement(
      'span',
      `validation-badge${institution.validado ? '' : ' pending'}`,
      institution.validado ? '✓ Informação validada' : '⌛ Confirmação pendente'
    );
    const date = createTextElement('time', '', `Validado em ${window.ConectaSorriso.formatDate(institution.data_validacao)}`);
    date.dateTime = institution.data_validacao;
    validationRow.append(validation, date);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const detailsLink = document.createElement('a');
    const detailsParams = new URLSearchParams({ id: String(institution.id) });
    if (state.query) detailsParams.set('q', state.query);
    if (state.category) detailsParams.set('categoria', state.category);
    detailsLink.href = `detalhes.html?${detailsParams.toString()}`;
    detailsLink.className = 'button button-primary';
    detailsLink.textContent = 'Ver detalhes';

    const routeLink = document.createElement('a');
    routeLink.href = window.ConectaSorriso.createRouteUrl(institution, state.userLocation);
    routeLink.className = 'button button-outline';
    routeLink.target = '_blank';
    routeLink.rel = 'noopener noreferrer';
    routeLink.textContent = '⌖ Como chegar';
    routeLink.setAttribute('aria-label', `Como chegar a ${institution.nome_instituicao}`);
    actions.append(detailsLink, routeLink);

    content.append(name);
    if (nearestBadge) content.append(nearestBadge);
    content.append(category, locationMeta, access, tags, validationRow, actions);
    card.append(symbol, content);
    return card;
  }

  function renderList() {
    elements.list.replaceChildren();
    elements.list.setAttribute('aria-busy', 'false');
    elements.empty.hidden = state.filtered.length !== 0;

    const fragment = document.createDocumentFragment();
    state.filtered.forEach((institution, index) => fragment.append(createInstitutionCard(institution, index)));
    elements.list.append(fragment);
  }

  function renderCount() {
    elements.count.textContent = String(state.filtered.length);
    elements.countLabel.textContent = state.filtered.length === 1 ? 'local encontrado' : 'locais encontrados';
  }

  function getCriteria() {
    return {
      query: state.locationSource === 'search' ? '' : state.query,
      category: elements.filterCategory.value,
      neighborhood: elements.filterNeighborhood.value,
      service: elements.filterService.value,
      referral: elements.filterReferral.value
    };
  }

  function applyCurrentFilters(announce = false) {
    state.category = elements.filterCategory.value;
    state.filtered = window.ConectaFiltros.filterInstitutions(state.institutions, getCriteria());

    if (state.userLocation) {
      state.filtered = state.filtered
        .map((institution) => ({
          ...institution,
          distance: window.ConectaSorriso.haversineDistance(state.userLocation, institution)
        }))
        .sort((first, second) => first.distance - second.distance);
    }

    renderCount();
    renderList();
    state.mapController?.updateInstitutions(state.filtered);

    if (announce) {
      const message = state.filtered.length
        ? `${state.filtered.length} ${state.filtered.length === 1 ? 'local encontrado' : 'locais encontrados'}.`
        : 'Nenhum local encontrado. Tente ajustar os filtros.';
      window.ConectaSorriso.setStatus(elements.status, message, state.filtered.length === 0);
    }
  }

  function clearSearchedLocation() {
    if (state.locationSource !== 'search') return;
    state.userLocation = null;
    state.locationSource = null;
    state.locationLabel = '';
    state.mapController?.clearUserLocation();
  }

  async function searchByTextOrLocation(announce = true) {
    clearSearchedLocation();
    const cep = window.ConectaSorriso.extractCep(state.query);

    if (cep) {
      state.filtered = [];
      renderCount();
      renderList();
      state.mapController?.updateInstitutions([]);
    } else {
      applyCurrentFilters(false);
    }

    if (!cep && (!state.query || state.filtered.length)) {
      if (announce) {
        const message = state.filtered.length
          ? `${state.filtered.length} ${state.filtered.length === 1 ? 'local encontrado' : 'locais encontrados'}.`
          : 'Nenhum local encontrado. Tente ajustar os filtros.';
        window.ConectaSorriso.setStatus(elements.status, message, state.filtered.length === 0);
      }
      return;
    }

    const formattedCep = cep ? `${cep.slice(0, 5)}-${cep.slice(5)}` : '';
    window.ConectaSorriso.setStatus(elements.status, cep
      ? `Consultando o CEP ${formattedCep} para buscar as clínicas mais próximas…`
      : 'Nenhuma instituição nesse endereço exato. Localizando o ponto para buscar as clínicas mais próximas…');

    try {
      const location = await window.ConectaSorriso.geocodeLocation(state.query);
      state.userLocation = location;
      state.locationSource = 'search';
      state.locationLabel = location.label;
      state.mapController?.setUserLocation(location, 'Endereço pesquisado');
      applyCurrentFilters(false);

      const reference = cep ? `CEP ${formattedCep}` : 'endereço pesquisado';
      const message = state.filtered.length
        ? `${state.filtered.length} clínicas ordenadas da mais próxima para a mais distante do ${reference}.`
        : 'O endereço foi localizado, mas os filtros atuais não retornaram clínicas.';
      window.ConectaSorriso.setStatus(elements.status, message, state.filtered.length === 0);
    } catch (error) {
      console.error('Não foi possível localizar o endereço informado.', error);
      applyCurrentFilters(false);
      window.ConectaSorriso.setStatus(
        elements.status,
        cep
          ? `O CEP ${formattedCep} não foi encontrado. Confira os 8 números e tente novamente.`
          : 'Não foi possível localizar esse endereço em Curitiba. Confira a escrita e tente novamente.',
        true
      );
    }
  }

  function updateUrl() {
    const params = new URLSearchParams();
    if (state.query) params.set('q', state.query);
    if (state.category) params.set('categoria', state.category);
    const suffix = params.toString();
    window.history.replaceState(null, '', `resultados.html${suffix ? `?${suffix}` : ''}`);
  }

  function clearSearch() {
    clearSearchedLocation();
    state.query = '';
    state.category = '';
    elements.searchInput.value = '';
    elements.filtersForm.reset();
    applyCurrentFilters(true);
    updateUrl();
    elements.searchInput.focus();
  }

  function activateView(view) {
    const showMap = view === 'map';
    elements.layout.classList.toggle('show-map', showMap);
    document.querySelectorAll('[data-view]').forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (showMap) {
      // O mapa é criado enquanto sua coluna está oculta no celular. Depois de
      // exibi-la, reaplica os resultados e recalcula o tamanho em dois quadros
      // para que Leaflet e a camada vetorial recebam a largura definitiva.
      window.requestAnimationFrame(() => {
        state.mapController?.updateInstitutions(state.filtered);
        state.mapController?.refreshSize();
      });
      window.setTimeout(() => state.mapController?.refreshSize(), 180);
      window.setTimeout(() => state.mapController?.refreshSize(), 420);
    }
  }

  function initializeMap() {
    state.mapController = window.ConectaMapa?.createMap('results-map');
    if (!state.mapController) {
      elements.mapFallback.hidden = false;
      document.getElementById('results-map').hidden = true;
      return;
    }
    state.mapController.updateInstitutions(state.filtered);
  }

  function locateUser() {
    elements.locationButton.disabled = true;
    window.ConectaSorriso.setStatus(elements.status, 'Obtendo sua localização…');
    window.ConectaSorriso.requestLocation(
      (location) => {
        state.userLocation = location;
        state.locationSource = 'device';
        state.locationLabel = 'Sua localização aproximada';
        elements.locationButton.disabled = false;
        elements.locationButton.textContent = '✓ Localização usada';
        state.mapController?.setUserLocation(location, state.locationLabel);
        applyCurrentFilters();
        window.ConectaSorriso.setStatus(elements.status, 'Resultados ordenados do mais próximo para o mais distante. Sua localização não foi armazenada.');
        updateUrl();
      },
      (message) => {
        elements.locationButton.disabled = false;
        window.ConectaSorriso.setStatus(elements.status, message, true);
        updateUrl();
      }
    );
  }

  function bindEvents() {
    elements.searchForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      state.query = elements.searchInput.value.replace(/\s+/g, ' ').trim().slice(0, 160);
      await searchByTextOrLocation(true);
      updateUrl();
    });

    elements.filtersForm.addEventListener('submit', (event) => {
      event.preventDefault();
      applyCurrentFilters(true);
      updateUrl();
    });

    elements.clearButtons.forEach((button) => button.addEventListener('click', clearSearch));
    elements.locationButton.addEventListener('click', locateUser);

    document.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => activateView(button.dataset.view));
    });

    const collapseButton = document.getElementById('filters-collapse');
    collapseButton?.addEventListener('click', () => {
      const collapsed = elements.filtersForm.classList.toggle('collapsed');
      collapseButton.setAttribute('aria-expanded', String(!collapsed));
      collapseButton.setAttribute('aria-label', collapsed ? 'Expandir filtros' : 'Recolher filtros');
      collapseButton.textContent = collapsed ? '⌄' : '⌃';
    });
  }

  async function initializeResults() {
    cacheElements();
    const shouldLocate = parseInitialParameters();
    bindEvents();

    try {
      state.institutions = await window.ConectaSorriso.loadInstitutions();
      populateFilters();
      elements.filterCategory.value = state.category;
      initializeMap();
      if (state.query) {
        await searchByTextOrLocation(false);
      } else {
        applyCurrentFilters();
      }
      if (!state.query) {
        window.ConectaSorriso.setStatus(elements.status, 'Dados de demonstração carregados. Confirme o atendimento com cada instituição.');
      }
      if (shouldLocate) locateUser();
    } catch (error) {
      console.error('Erro ao carregar instituições.', error);
      elements.list.setAttribute('aria-busy', 'false');
      elements.list.replaceChildren();
      elements.empty.hidden = false;
      elements.empty.querySelector('h3').textContent = 'Não foi possível carregar os dados';
      elements.empty.querySelector('p').textContent = 'Execute o projeto em um servidor local (como o Live Server) e tente novamente.';
      window.ConectaSorriso.setStatus(elements.status, 'Erro ao carregar o arquivo de instituições.', true);
    }
  }

  // Ao voltar da página de detalhes, o navegador pode restaurar esta tela pelo
  // cache de navegação. Reaplica os marcadores e recalcula o tamanho do mapa
  // para preservar o CEP, a ordenação por proximidade e o enquadramento.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted || !state.mapController) return;
    if (state.userLocation) {
      const label = state.locationSource === 'search' ? 'Endereço pesquisado' : state.locationLabel;
      state.mapController.setUserLocation(state.userLocation, label);
    }
    state.mapController.updateInstitutions(state.filtered);
    window.setTimeout(() => state.mapController?.refreshSize(), 80);
  });

  document.addEventListener('DOMContentLoaded', initializeResults);
})();
