(() => {
  'use strict';

  function setText(id, value, fallback = 'Informação não disponível') {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = value || fallback;
  }

  function setLinkState(link, href, unavailableLabel) {
    if (!link) return;
    if (href) {
      link.href = href;
      link.removeAttribute('aria-disabled');
      return;
    }
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
    link.textContent = unavailableLabel;
  }

  function renderServices(services) {
    const list = document.getElementById('detail-services');
    list.replaceChildren();
    services.forEach((service) => {
      const item = document.createElement('li');
      item.textContent = service;
      list.append(item);
    });
  }

  function renderValidation(institution) {
    const badge = document.getElementById('detail-validation');
    badge.textContent = institution.validado ? '✓ Informação validada' : '⌛ Confirmação pendente';
    badge.classList.toggle('pending', !institution.validado);
    setText('detail-date', `Última validação: ${window.ConectaSorriso.formatDate(institution.data_validacao)}`);
  }

  function renderContactActions(institution) {
    const callButton = document.getElementById('call-button');
    const siteButton = document.getElementById('site-button');
    const routeButton = document.getElementById('route-button');

    const safePhone = /^\+?[0-9]+$/.test(institution.telefone_link) ? institution.telefone_link : '';
    const safeSite = /^https?:\/\//i.test(institution.site) ? institution.site : '';

    setLinkState(callButton, safePhone ? `tel:${safePhone}` : '', 'Telefone não disponível');
    setLinkState(siteButton, safeSite, 'Site oficial não disponível');
    routeButton.href = window.ConectaSorriso.createRouteUrl(institution);
    routeButton.setAttribute('aria-label', `Como chegar a ${institution.nome_instituicao}`);
  }

  function renderInstitution(institution) {
    document.title = `${institution.nome_instituicao} — Conecta Sorriso`;
    setText('detail-category', institution.categoria_label);
    setText('detail-name', institution.nome_instituicao);
    setText('detail-address', institution.endereco);
    setText('detail-neighborhood', institution.bairro);
    setText('detail-city-state', `${institution.cidade}/${institution.estado}`);
    setText('detail-cep', institution.cep);
    setText('detail-phone', institution.telefone, 'Informação de telefone não disponível');
    setText('detail-hours', institution.horario);
    setText('detail-access', institution.forma_acesso);
    setText('detail-referral', institution.precisa_encaminhamento ? 'Sim, é necessário encaminhamento.' : 'Não é necessário encaminhamento.');
    setText('detail-appointment', institution.precisa_agendamento ? 'Sim, é necessário agendamento.' : 'Não é necessário agendamento prévio.');
    setText('detail-description', institution.descricao_atendimento);
    setText('detail-notes', institution.observacoes);
    setText('detail-source', institution.fonte);
    setText('detail-validation-date', window.ConectaSorriso.formatDate(institution.data_validacao));
    renderServices(institution.tipo_atendimento);
    renderValidation(institution);
    renderContactActions(institution);

    const details = document.getElementById('institution-details');
    details.hidden = false;

    const mapController = window.ConectaMapa?.createMap('details-map', {
      center: [institution.latitude, institution.longitude],
      zoom: 15
    });
    if (mapController) {
      mapController.updateInstitutions([institution]);
    } else {
      document.getElementById('details-map').hidden = true;
      document.getElementById('details-map-fallback').hidden = false;
    }
  }

  function showError(title, message) {
    const errorSection = document.getElementById('details-error');
    errorSection.hidden = false;
    errorSection.querySelector('h1').textContent = title;
    errorSection.querySelector('p').textContent = message;
  }

  function getInstitutionId() {
    const rawId = new URLSearchParams(window.location.search).get('id');
    if (!rawId || !/^\d+$/.test(rawId)) return null;
    const id = Number(rawId);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }

  function configureBackLink() {
    const parameters = new URLSearchParams(window.location.search);
    const query = parameters.get('q') || '';
    const category = parameters.get('categoria') || '';
    const safeQuery = query.replace(/\s+/g, ' ').trim().slice(0, 160);
    const allowedCategories = ['', 'CEO', 'Clínica-escola pública', 'Clínica-escola privada'];
    const safeCategory = allowedCategories.includes(category) ? category : '';
    const backLink = document.getElementById('back-results');
    backLink.href = window.ConectaSorriso.createResultsUrl(safeQuery, safeCategory);

    // Voltar pelo histórico preserva o ponto pesquisado, as distâncias, os
    // filtros e a posição do mapa. O href acima continua sendo um fallback
    // seguro para acesso direto à página de detalhes.
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      const cameFromResults = referrer?.origin === window.location.origin
        && referrer.pathname.endsWith('/resultados.html');
      if (cameFromResults) {
        backLink.addEventListener('click', (event) => {
          event.preventDefault();
          window.history.back();
        });
      }
    } catch (_error) {
      // Mantém o link de fallback quando o referenciador não puder ser lido.
    }
  }

  async function initializeDetails() {
    configureBackLink();
    const id = getInstitutionId();
    if (!id) {
      showError('Parâmetro inválido na URL', 'Selecione uma instituição a partir da página de resultados para consultar os detalhes.');
      return;
    }

    window.ConectaSorriso.setStatus(document.getElementById('details-status'), 'Carregando informações da instituição…');

    try {
      const institutions = await window.ConectaSorriso.loadInstitutions();
      const institution = institutions.find((item) => item.id === id);
      if (!institution) {
        showError('Instituição não encontrada', 'O registro solicitado não existe na base de demonstração.');
        return;
      }

      renderInstitution(institution);
      window.ConectaSorriso.setStatus(document.getElementById('details-status'), '');
    } catch (error) {
      console.error('Erro ao carregar os detalhes.', error);
      showError('Não foi possível carregar os dados', 'Execute o projeto em um servidor local (como o Live Server) e tente novamente.');
      window.ConectaSorriso.setStatus(document.getElementById('details-status'), 'Erro ao carregar o arquivo de instituições.', true);
    }
  }

  document.addEventListener('DOMContentLoaded', initializeDetails);
})();
