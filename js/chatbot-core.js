/* HACKTECH: regras compartilhadas pelo navegador e pelo servidor. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ConectaChatCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SOURCE = 'https://saude.curitiba.pr.gov.br/images/APS/191%20-%20Protocolo_Saude_Bucal_APS_v03.pdf';
  const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const levels = ['normal', 'urgent', 'emergency'];
  const maxRisk = (a, b) => levels[Math.max(levels.indexOf(a), levels.indexOf(b), 0)];

  function affirmed(text, pattern) {
    const re = new RegExp(pattern.source, 'g');
    for (const match of text.matchAll(re)) {
      // “Sem prótese/dinheiro” nunca deve negar uma dificuldade respiratória.
      if (/^(?:(?:nao|mal) (?:consigo|consegue|estou conseguindo|to conseguindo)|nao para de sangrar)/.test(match[0])) return true;
      const before = text.slice(0, match.index).split(/[.!?;]|\bmas\b|\bporem\b|\bagora\b|\be (?:tenho|estou|com)\b/).pop();
      const denied = /(?:\bsem\b|\bnego\b|\bnao (?:tenho|sinto|apresento|estou com)\b)\s*(?:(?:dor|febre|inchaco|sangramento|falta de ar|dificuldade (?:para |de )?(?:respirar|engolir)|nem|ou|e|nenhum|nenhuma)\b[\s,]*)*$/;
      if (!denied.test(before)) return true;
    }
    return false;
  }

  function riskFor(text) {
    const t = normalize(text);
    if (affirmed(t, /(?:dificuldade|dificil) (?:para |pra |de |em )?(?:respirar|engolir)|(?:nao|mal) (?:consigo|consegue|estou conseguindo|to conseguindo) (?:respirar|engolir)|falta de ar|(?:estou |to |me )?sufocando|sangramento (?:intenso|incontrolavel|que nao para)|(?:sangue|sangramento).{0,12}nao para|nao para de sangrar|sangra(?:ndo)? (?:muito|sem parar)|hemorragia|inchaco.{0,35}(?:olho|pescoco)|(?:rosto|face).{0,25}inchad.{0,25}olho/)) return 'emergency';
    if (affirmed(t, /dor (?:muito )?(?:forte|intensa|insuportavel)|muita dor|febre|inchaco|inchad[oa]|pus\b|sangramento|trauma|(?:bati|quebrei).{0,20}dente|dente.{0,20}(?:caiu|quebrou).{0,15}(?:hoje|agora)/)) return 'urgent';
    return 'normal';
  }

  function inferProfile(messages, institutions) {
    const p = { need: 'unknown', urgency: 'normal', location: '', city: 'unknown', preference: 'unknown', symptomsAnswered: false, skipLocation: false, topic: 'care' };
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.role !== 'user') continue;
      const t = normalize(m.content);
      p.urgency = maxRisk(p.urgency, riskFor(t));
      if (/\b(protese|dentadura|ponte|implante|faltam? dentes?|perdi.{0,20}dent[es]|sem dentes?)\b/.test(t)) p.need = 'prosthesis';
      if (/(?:protese|dentadura|ponte).{0,40}(?:quebr|solt|machuc|ajust|folg)|(?:consert|ajust|repar).{0,30}(?:protese|dentadura|ponte)/.test(t)) p.need = 'repair';
      if (p.need === 'unknown' && /\b(dor|doendo|doi|gengiva|sangra|avaliacao|consulta|sensibilidade|carie|dente|boca)\b/.test(t)) p.need = 'evaluation';
      if (/\b(dor|doendo|doi|febre|inchaco|inchad[oa]|sangramento|sintomas?)\b/.test(t) || p.urgency !== 'normal') p.symptomsAnswered = true;
      if (/(?:public[oa]|\bsus\b|gratuit|sem (?:dinheiro|condicoes)|nao posso pagar)/.test(t)) p.preference = 'public';
      if (/(?:qualquer|tanto faz|pode ser (?:public[oa] ou )?particular|sem preferencia|aceito particular)/.test(t)) p.preference = 'any';
      if (/(?:nao (?:quero|vou|desejo) informar|prefiro nao|sem informar|mostrar (?:todas|opcoes)|pular bairro)/.test(t)) { p.skipLocation = true; p.location = ''; }
      if (/\b(curitiba)\b/.test(t)) p.city = 'curitiba';
      if (/\b(sao paulo|londrina|maringa|rio de janeiro|ponta grossa|cascavel|porto alegre|joinville|pinhais|colombo|sao jose dos pinhais)\b/.test(t)) p.city = 'other';
      const bairro = institutions.find((c) => new RegExp(`(?:^|[^a-z])${normalize(c.bairro)}(?:$|[^a-z])`).test(t));
      if (bairro) { p.location = bairro.bairro; p.skipLocation = false; }
      const captured = t.match(/(?:moro (?:em|no|na)|sou d[eo]|bairro(?: de)?|estou (?:em|no|na))\s+([a-z][a-z\s-]{1,70})/);
      if (!bairro && captured) p.location = captured[1].split(/[,.;]| e (?:tenho|quero|preciso|estou)/)[0].trim();
      const previous = normalize(messages[i - 1]?.content);
      if (/(?:dor, febre, inchaco ou sangramento agora)/.test(previous) && /^(?:nao|nao tenho|nenhum|nenhuma|nenhum deles|nada disso)[.!]?$/.test(t)) p.symptomsAnswered = true;
      if (!p.location && /qual (?:e )?seu bairro/.test(previous) && t.length <= 70 && !/(?:nao|qualquer|public|particular|obrigad|ola|oi\b|sim\b|dor|febre)/.test(t)) p.location = m.content.trim();
      p.topic = /\b(remedio|medicamento|antibiotico|dose|ibuprofeno|amoxicilina|dipirona)\b/.test(t) ? 'medication' : /\b(preco|valor|custa|gratuit|vagas?|horario)\b/.test(t) ? 'availability' : 'care';
    }
    return p;
  }

  function mergeProfile(local, ai) {
    if (!ai) return local;
    return {
      need: ai.need !== 'unknown' ? ai.need : local.need,
      urgency: maxRisk(local.urgency, ai.urgency),
      location: ai.skipLocation ? '' : ai.location.trim().slice(0, 80) || local.location,
      city: ai.city !== 'unknown' ? ai.city : local.city,
      preference: ai.preference !== 'unknown' ? ai.preference : local.preference,
      symptomsAnswered: local.symptomsAnswered || ai.symptomsAnswered,
      skipLocation: local.skipLocation || ai.skipLocation,
      topic: local.topic !== 'care' ? local.topic : ai.topic
    };
  }

  function recommend(profile, institutions) {
    const service = profile.need === 'evaluation' ? 'avaliacao' : 'protese';
    return institutions.filter((c) => Array.isArray(c.tipo_atendimento) && c.tipo_atendimento.some((s) => normalize(s).includes(service)))
      .filter((c) => profile.preference !== 'public' || /public|\bceo\b/.test(normalize(c.categoria)))
      .map((c) => ({ ...c, sameNeighborhood: Boolean(profile.location && normalize(c.bairro) === normalize(profile.location)) }))
      .sort((a, b) => Number(b.sameNeighborhood) - Number(a.sameNeighborhood) || a.id - b.id)
      .slice(0, 3)
      .map((c) => ({ id: c.id, name: c.nome_instituicao, category: c.categoria, address: `${c.endereco} — ${c.bairro}, ${c.cidade}/${c.estado}`, phone: c.telefone, phoneLink: /^\+?\d+$/.test(c.telefone_link || '') ? c.telefone_link : '', access: c.forma_acesso, referral: c.precisa_encaminhamento, date: c.data_validacao, reason: `${c.sameNeighborhood ? 'No bairro informado. ' : ''}${profile.need === 'evaluation' ? 'Oferece avaliação odontológica no cadastro.' : 'Oferece prótese odontológica no cadastro.'}${profile.need === 'repair' ? ' Confirme se realiza ajuste ou conserto de prótese.' : ''}` }));
  }

  function reply(messages, institutions, ai = null) {
    const p = mergeProfile(inferProfile(messages, institutions), ai);
    const latest = normalize(messages.filter((m) => m.role === 'user').at(-1)?.content);
    const asksCare = /cuidados|cuidar|higien|limpar|limpeza/.test(latest) && /protese|dentadura/.test(latest);
    const result = { text: '', clinics: [], suggestions: [], urgency: p.urgency, source: '' };
    if (p.urgency === 'emergency') {
      result.text = 'Houve relato de um possível sinal de emergência. Ligue para o SAMU 192 agora ou procure um serviço de emergência imediatamente. Não espere uma vaga de prótese ou uma resposta deste chat. A equipe de saúde precisa avaliar a situação presencialmente.';
      result.source = SOURCE;
      return result;
    }
    if (p.urgency === 'urgent') {
      result.text = 'Pelo relato, é importante procurar avaliação odontológica com prioridade, de preferência hoje. Em Curitiba, procure sua Unidade de Saúde; se estiver fechada, busque a rede de urgência. O cadastro de clínicas-escola não confirma atendimento de urgência. Se houver dificuldade para respirar ou engolir, sangramento intenso que não para ou inchaço atingindo os olhos, ligue 192. O chat não consegue determinar a gravidade nem fazer diagnóstico.';
      result.source = SOURCE;
      return result;
    }
    if (asksCare) {
      result.text = 'Claro, vamos conversar sobre os cuidados com sua prótese. Não sou especialista, e os cuidados variam conforme o tipo e o material da peça. Para começar, sua prótese é removível (você consegue tirar da boca) ou fixa? Se não souber, tudo bem: posso ajudar você a encontrar uma avaliação para receber orientações próprias para sua prótese.';
      result.suggestions = ['Minha prótese é removível', 'Minha prótese é fixa', 'Não sei o tipo, quero uma avaliação'];
      return result;
    }
    const previousReply = normalize(messages.filter((m) => m.role === 'assistant').at(-1)?.content);
    if (/sua protese e removivel/.test(previousReply) && /removivel|fixa/.test(latest)) {
      result.text = 'Obrigada por me contar. Para cuidar da sua prótese com segurança, siga as orientações de quem acompanha você: o material e o tipo da peça fazem diferença. Posso ajudar a encontrar uma clínica-escola para conversar sobre higiene, conservação e conforto. Você quer procurar esse atendimento ou sua prótese está machucando?';
      result.suggestions = ['Quero uma avaliação da prótese', 'Minha prótese está machucando'];
      return result;
    }
    const extra = p.topic === 'medication' ? 'Não posso indicar medicamentos, doses ou diagnóstico. Isso exige avaliação de um profissional. ' : p.topic === 'availability' ? 'Não temos preços, gratuidade ou vagas em tempo real. Esses dados precisam ser confirmados com a instituição. ' : '';
    if (p.need === 'unknown') {
      result.text = extra + 'Estou aqui para ouvir você. O que está acontecendo com sua prótese, ou o que você precisa neste momento? Pode contar com suas palavras, sem informar dados pessoais.';
      result.suggestions = ['Preciso de uma prótese', 'Cuidados com a prótese', 'Minha prótese está machucando'];
    } else if (!p.symptomsAnswered) {
      result.text = extra + (p.need === 'repair' ? 'Sinto muito que sua prótese esteja incomodando. Vamos buscar uma orientação para você. ' : 'Entendi, você está procurando ajuda com sua prótese. Vamos por partes. ') + 'Você está com dor, febre, inchaço ou sangramento agora? Se sim, pode me contar quais sintomas e há quanto tempo começaram?' ;
      result.suggestions = ['Sem dor, febre, inchaço ou sangramento', 'Estou com dor forte', 'Estou com inchaço'];
    } else if (p.city === 'other') {
      result.text = extra + 'Nossa base reúne instituições de Curitiba e não permite indicar uma clínica na sua cidade. Para atendimento público, procure a Unidade de Saúde do seu município. Se puder ir a Curitiba, posso mostrar as opções cadastradas lá.';
      result.suggestions = ['Pode mostrar opções em Curitiba, sem informar bairro'];
    } else if (!p.location && !p.skipLocation) {
      result.text = extra + 'Vamos procurar uma opção de atendimento para você. Qual é seu bairro em Curitiba? Só o bairro já ajuda, sem endereço completo. Se preferir não informar, tudo bem: posso mostrar opções gerais da cidade.';
      result.suggestions = ['Portão', 'Rebouças', 'Mostrar opções sem informar bairro'];
    } else if (p.preference === 'unknown') {
      result.text = extra + 'E o que funciona melhor para você: uma instituição pública ou também podemos considerar clínicas-escola privadas? Os valores e as vagas precisam ser confirmados, inclusive nas instituições públicas.';
      result.suggestions = ['Prefiro instituição pública', 'Qualquer uma, sem preferência'];
    } else {
      result.clinics = recommend(p, institutions);
      const service = p.need === 'evaluation' ? 'avaliação odontológica para entender sua queixa' : p.need === 'repair' ? 'avaliação da prótese e da boca para verificar o ajuste necessário' : 'avaliação odontológica para planejar a reabilitação e a prótese';
      result.text = extra + `O próximo passo é uma ${service}. A escolha do tratamento depende de um cirurgião-dentista. `;
      if (result.clinics.length) {
        const hasMatch = result.clinics.some((c) => normalize(c.address).includes(normalize(p.location)) && p.location);
        result.text += `Estas são opções compatíveis com o serviço cadastrado${hasMatch ? ', priorizando o mesmo bairro' : '. Sem correspondência exata de bairro, mostro opções gerais de Curitiba'}. Não é uma comparação de qualidade e não calculamos distância pelo chat. Confirme atendimento, valores, critérios e vagas antes de ir.`;
      } else result.text += 'Não encontrei instituições com esse serviço e preferência no cadastro. Para acesso pelo SUS, consulte a Unidade de Saúde do seu bairro. Não há garantia de gratuidade.';
      result.suggestions = ['Prefiro instituição pública', 'Qualquer uma, sem preferência'];
    }
    return result;
  }
  return Object.freeze({ normalize, riskFor, inferProfile, mergeProfile, recommend, reply });
});
