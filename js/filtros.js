(() => {
  'use strict';

  function includesNormalized(source, query) {
    return window.ConectaSorriso.normalizeText(source).includes(query);
  }

  function matchesSearch(institution, rawQuery) {
    const query = window.ConectaSorriso.normalizeText(rawQuery);
    if (!query) return true;

    const searchableValues = [
      institution.nome_instituicao,
      institution.bairro,
      institution.cep,
      institution.categoria,
      institution.categoria_label,
      institution.forma_acesso,
      ...institution.tipo_atendimento
    ];

    return searchableValues.some((value) => includesNormalized(value, query));
  }

  function matchesExact(value, expected) {
    if (!expected) return true;
    return window.ConectaSorriso.normalizeText(value) === window.ConectaSorriso.normalizeText(expected);
  }

  function matchesService(services, expected) {
    if (!expected) return true;
    return services.some((service) => matchesExact(service, expected));
  }

  function matchesReferral(institution, expected) {
    if (!expected) return true;
    return expected === 'sim' ? institution.precisa_encaminhamento : !institution.precisa_encaminhamento;
  }

  function filterInstitutions(institutions, criteria) {
    return institutions.filter((institution) => (
      matchesSearch(institution, criteria.query)
      && matchesExact(institution.categoria, criteria.category)
      && matchesExact(institution.bairro, criteria.neighborhood)
      && matchesService(institution.tipo_atendimento, criteria.service)
      && matchesReferral(institution, criteria.referral)
    ));
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))]
      .sort((first, second) => first.localeCompare(second, 'pt-BR'));
  }

  function getAvailableOptions(institutions) {
    return {
      neighborhoods: uniqueSorted(institutions.map((item) => item.bairro)),
      services: uniqueSorted(institutions.flatMap((item) => item.tipo_atendimento))
    };
  }

  window.ConectaFiltros = Object.freeze({ filterInstitutions, getAvailableOptions });
})();
