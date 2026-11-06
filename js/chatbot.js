/* HACKTECH: widget sem dependências; nenhuma alteração no estado do site. */
(() => {
  'use strict';
  const core = window.ConectaChatCore;
  if (!core || document.getElementById('cs-chat')) return;
  const el = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value) node.textContent = value;
    return node;
  };
  const button = (text, className, action) => {
    const node = el('button', className, text);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  };
  const launcher = button('Duvidas?', 'cs-chat-launcher', open);
  // Ícone fixo do próprio projeto; mensagens sempre usam textContent.
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M5 3h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-6 4V5a2 2 0 0 1 2-2ZM7 8h10M7 12h7');
  path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.7');
  icon.append(path); launcher.prepend(icon);
  launcher.setAttribute('aria-controls', 'cs-chat'); launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-expanded', 'false');
  const dialog = el('dialog', 'cs-chat'); dialog.id = 'cs-chat';
  dialog.setAttribute('aria-labelledby', 'cs-chat-title');
  const header = el('header', 'cs-chat-header');
  const heading = el('div'); const title = el('h2', '', 'Assistente Conecta Sorriso'); title.id = 'cs-chat-title';
  const modeText = el('p', 'cs-chat-mode', 'Orientação para encontrar atendimento');
  heading.append(title, modeText);
  const close = button('×', 'cs-chat-close', () => dialog.close()); close.setAttribute('aria-label', 'Fechar conversa');
  header.append(heading, close);
  const log = el('div', 'cs-chat-log'); log.setAttribute('role', 'log'); log.setAttribute('aria-label', 'Mensagens da conversa'); log.setAttribute('aria-live', 'polite'); log.setAttribute('aria-relevant', 'additions');
  const options = el('div', 'cs-chat-options'); options.setAttribute('aria-label', 'Respostas sugeridas');
  const form = el('form', 'cs-chat-form');
  const label = el('label', '', 'Conte o que você precisa'); label.htmlFor = 'cs-chat-input';
  const compose = el('div', 'cs-chat-compose');
  const input = el('textarea', 'cs-chat-input'); input.id = 'cs-chat-input'; input.rows = 2; input.maxLength = 1500; input.placeholder = 'Escreva sua mensagem…'; input.autocomplete = 'off';
  const send = el('button', 'cs-chat-send', 'Enviar'); send.type = 'submit';
  const status = el('p', 'cs-chat-status'); status.setAttribute('role', 'status');
  input.setAttribute('aria-describedby', 'cs-chat-privacy');
  const aiConsent = el('label');
  aiConsent.hidden = true;
  const aiCheckbox = el('input'); aiCheckbox.type = 'checkbox';
  aiConsent.append(aiCheckbox, document.createTextNode(' Permitir envio das minhas mensagens à OpenAI para usar IA. Evite dados pessoais.'));
  compose.append(input, send); form.append(aiConsent, label, compose, status);
  const footer = el('div', 'cs-chat-footer');
  const note = el('p', '', 'Sou um assistente virtual, não sou especialista. Uma avaliação profissional é importante.'); note.id = 'cs-chat-privacy';
  footer.append(note, button('Nova conversa', 'cs-chat-reset', reset));
  dialog.append(header, log, options, form, footer); document.body.append(launcher, dialog);
  let messages = [], institutions = [], mode = '', busy = false, generation = 0, controller = null, initialized = false;
  const endpoint = new URL('api/chat', document.baseURI);
  const configEndpoint = new URL('api/chat/config', document.baseURI);

  function setBusy(value) {
    busy = value;
    aiCheckbox.disabled = value;
    input.disabled = send.disabled = !mode || value;
    options.querySelectorAll('button').forEach((b) => { b.disabled = value; });
    form.setAttribute('aria-busy', String(value));
  }
  function scroll(node = null) {
    log.scrollTop = node ? log.scrollTop + node.getBoundingClientRect().top - log.getBoundingClientRect().top - 16 : log.scrollHeight;
  }
  function link(text, href, external = false) {
    const a = el('a', 'cs-chat-link', text); a.href = href;
    if (external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  }
  function appendMessage(role, text, result = null) {
    const node = el('article', `cs-chat-message${role === 'user' ? ' cs-chat-user' : ''}${result?.urgency !== 'normal' && result ? ' cs-chat-alert' : ''}`);
    node.append(el('strong', 'cs-chat-speaker', role === 'user' ? 'Você' : 'Conecta Sorriso'), el('p', '', text));
    if (result?.urgency === 'emergency') node.append(link('Ligar para o SAMU 192', 'tel:192'));
    for (const c of result?.clinics || []) {
      const card = el('section', 'cs-chat-card');
      card.append(el('h3', '', c.name), el('p', '', c.category), el('p', '', c.reason), el('p', '', c.address), el('p', '', c.access), el('p', '', c.referral ? 'O cadastro informa necessidade de encaminhamento.' : 'O cadastro informa acesso sem encaminhamento.'));
      const actions = el('div', 'cs-chat-links');
      // Não coloca sintomas, bairro ou transcrição na URL, apenas o ID público.
      actions.append(link('Ver instituição', `detalhes.html?id=${encodeURIComponent(c.id)}`));
      if (c.phoneLink) actions.append(link(`Ligar: ${c.phone}`, `tel:${c.phoneLink}`));
      card.append(actions); node.append(card);
    }
    if (result?.source) node.append(link('Fonte: Saúde de Curitiba', result.source, true));
    log.append(node); scroll(role === 'assistant' ? node : null);
  }
  function choices(items, action = submitMessage) {
    options.replaceChildren(...items.map((text) => button(text, 'cs-chat-option', () => action(text))));
  }
  function setMode(next) {
    mode = next;
    modeText.textContent = mode === 'ai' ? 'IA • compreensão de linguagem natural' : 'Orientação local • sem IA generativa';
    setBusy(false); status.textContent = '';
    appendMessage('assistant', 'Oi! Que bom ter você por aqui. Sou o assistente virtual do Conecta Sorriso e não sou especialista. Estou aqui para ouvir você e ajudar a encontrar orientação e atendimento para sua prótese dentária. Vamos com calma: como posso ajudar hoje?');
    choices(['Preciso de uma prótese', 'Cuidados com a prótese', 'Minha prótese está machucando']);
    input.focus();
  }
  async function initialize() {
    const current = ++generation;
    initialized = true; mode = ''; setBusy(true);
    log.replaceChildren(); options.replaceChildren();
    aiConsent.hidden = true; aiCheckbox.checked = false;
    status.textContent = 'Carregando opções de atendimento…';
    let aiAvailable = false;
    try {
      const data = await fetch(new URL('dados/instituicoes.json', document.baseURI), { cache: 'no-store' });
      if (!data.ok) throw new Error('data');
      const payload = await data.json();
      if (!Array.isArray(payload) || !payload.length) throw new Error('data');
      if (current !== generation) return;
      institutions = payload;
      setMode('local');
      status.textContent = 'Conversa apenas nesta página. Evite dados pessoais. Modo por regras, sem IA generativa.';
      try {
        const config = await fetch(configEndpoint, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
        if (config.ok && config.headers.get('content-type')?.includes('application/json')) aiAvailable = (await config.json()).aiAvailable === true;
      } catch { /* Hospedagem estática: orientação local continua disponível. */ }
      if (current !== generation) return;
      aiConsent.hidden = !aiAvailable;
    } catch {
      if (current !== generation) return;
      status.textContent = 'Não foi possível carregar as clínicas. Use um servidor HTTP e tente novamente.';
      busy = false; choices(['Tentar novamente'], initialize);
    }
  }
  async function open() {
    if (!dialog.open) dialog.showModal();
    launcher.setAttribute('aria-expanded', 'true');
    if (!initialized) await initialize();
    else if (mode && !busy) input.focus();
  }
  function reset() {
    generation++; controller?.abort(); messages = []; institutions = []; input.value = '';
    modeText.textContent = 'Orientação para encontrar atendimento';
    initialize();
  }
  async function submitMessage(value) {
    const content = String(value).trim();
    if (!content || !mode || busy) return;
    if (content.length > 1500) { status.textContent = 'Use até 1.500 caracteres por mensagem.'; return; }
    if (messages.length >= 40 || messages.reduce((n, m) => n + m.content.length, 0) + content.length > 14000) {
      status.textContent = 'Esta conversa atingiu o limite. Use “Nova conversa” para continuar.'; return;
    }
    messages.push({ role: 'user', content }); appendMessage('user', content); input.value = ''; options.replaceChildren();
    const current = generation;
    setBusy(true); status.textContent = mode === 'ai' ? 'Interpretando sua mensagem…' : 'Consultando as orientações e o cadastro…';
    let result = core.reply(messages, institutions);
    // Sinais reconhecidos de urgência são apresentados imediatamente, sem esperar a IA.
    if (mode === 'ai' && result.urgency === 'normal') {
      const requestController = new AbortController(); controller = requestController;
      const timer = setTimeout(() => requestController.abort(), 25000);
      try {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, consent: true }), signal: requestController.signal });
        if (!response.ok) throw new Error('api');
        const payload = await response.json();
        if (!payload.result || typeof payload.result.text !== 'string' || !Array.isArray(payload.result.clinics)) throw new Error('schema');
        result = payload.result;
        if (current !== generation) return;
        if (payload.mode !== 'ai') { mode = 'local'; modeText.textContent = 'Orientação local • IA indisponível'; }
      } catch {
        if (current !== generation) return;
        mode = 'local'; modeText.textContent = 'Orientação local • IA indisponível';
      } finally { clearTimeout(timer); }
    }
    if (current !== generation) return;
    messages.push({ role: 'assistant', content: result.text }); appendMessage('assistant', result.text, result);
    choices(result.suggestions || []); setBusy(false);
    status.textContent = result.urgency !== 'normal' ? 'Orientação de segurança por regras. Procure avaliação presencial.' : mode === 'local' ? 'Modo local: respostas por regras, sem IA generativa.' : 'IA interpreta o relato; orientações e clínicas usam regras e o cadastro.';
    input.focus();
  }
  aiCheckbox.addEventListener('change', () => {
    mode = aiCheckbox.checked ? 'ai' : 'local';
    modeText.textContent = aiCheckbox.checked ? 'IA • compreensão de linguagem natural' : 'Orientação local • sem IA generativa';
    status.textContent = aiCheckbox.checked ? 'Ao enviar, as mensagens desta conversa serão interpretadas pela OpenAI.' : 'Modo por regras: sem envio à IA.';
  });
  form.addEventListener('submit', (event) => { event.preventDefault(); submitMessage(input.value); });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); submitMessage(input.value); }
  });
  dialog.addEventListener('close', () => { launcher.setAttribute('aria-expanded', 'false'); launcher.focus(); });
  setBusy(false);
})();
