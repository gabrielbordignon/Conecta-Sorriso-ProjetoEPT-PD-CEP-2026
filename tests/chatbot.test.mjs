import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import core from '../js/chatbot-core.js';
import { createAppServer } from '../server.mjs';

const institutions = JSON.parse(await readFile(new URL('../dados/instituicoes.json', import.meta.url)));
const user = (content) => ({ role: 'user', content });
function conversation(...texts) {
  const messages = [];
  for (const text of texts) { messages.push(user(text)); messages.push({ role: 'assistant', content: core.reply(messages, institutions).text }); }
  messages.pop(); return messages;
}
const profile = { need: 'prosthesis', urgency: 'normal', city: 'curitiba', location: 'Portão', preference: 'any', topic: 'care', symptomsAnswered: true, skipLocation: false };

for (const text of ['Não consigo respirar', 'Estou com dificuldade para engolir', 'O sangramento não para', 'Não estou conseguindo respirar', 'Minha face está inchada até o olho']) {
  test(`emergência: ${text}`, () => {
    const result = core.reply([user(text)], institutions);
    assert.equal(result.urgency, 'emergency'); assert.equal(result.clinics.length, 0); assert.match(result.text, /192/);
  });
}
for (const text of ['Estou com dor muito forte', 'Estou com febre e inchaço', 'Sai pus do dente']) {
  test(`prioridade: ${text}`, () => {
    const result = core.reply([user(text)], institutions);
    assert.equal(result.urgency, 'urgent'); assert.equal(result.clinics.length, 0); assert.match(result.text, /hoje/);
  });
}
test('negação não aciona urgência; mudança de oração preserva sinal positivo', () => {
  assert.equal(core.riskFor('Sem dor, febre, inchaço ou sangramento'), 'normal');
  assert.equal(core.riskFor('Não tenho falta de ar'), 'normal');
  assert.equal(core.riskFor('Não tenho dor, mas estou com febre'), 'urgent');
  assert.equal(core.riskFor('Sem dor e com rosto inchado'), 'urgent');
  assert.equal(core.riskFor('Não tenho dor mas não consigo respirar'), 'emergency');
});
test('negação de dinheiro ou prótese não oculta outro sintoma', () => {
  assert.equal(core.riskFor('Estou sem dentadura e não consigo respirar'), 'emergency');
  assert.equal(core.riskFor('Sem dor e não consigo respirar'), 'emergency');
  assert.equal(core.riskFor('Sem dinheiro e com inchaço'), 'urgent');
  assert.equal(core.riskFor('Sem prótese, estou com falta de ar'), 'emergency');
});
test('histórico preserva risco mesmo depois de pedir uma clínica', () => {
  const result = core.reply(conversation('Não consigo respirar', 'Mas quero uma clínica de prótese no Portão'), institutions, profile);
  assert.equal(result.urgency, 'emergency'); assert.deepEqual(result.clinics, []);
});
test('acolhimento faz perguntas progressivas sem encaminhar cedo', () => {
  const first = core.reply([user('Oi')], institutions); assert.match(first.text, /O que está acontecendo/);
  const second = core.reply([user('Preciso de dentadura')], institutions); assert.match(second.text, /febre/); assert.deepEqual(second.clinics, []);
  const third = core.reply(conversation('Preciso de dentadura', 'Sem dor, febre, inchaço ou sangramento'), institutions); assert.match(third.text, /Qual é seu bairro/);
});
test('resposta curta negativa à pergunta de sintomas permite prosseguir', () => {
  const result = core.reply(conversation('Preciso de dentadura', 'Não'), institutions);
  assert.match(result.text, /Qual é seu bairro/);
});
test('prótese no Portão prioriza bairro e somente IDs existentes', () => {
  const result = core.reply(conversation('Preciso de prótese sem dor, febre, inchaço ou sangramento', 'Moro no Portão', 'Qualquer uma, sem preferência'), institutions);
  assert.equal(result.clinics[0].id, 6); assert.equal(result.clinics.length, 3);
  assert.ok(result.clinics.every((c) => institutions.some((known) => known.id === c.id)));
  assert.match(result.text, /Não é uma comparação de qualidade/);
});
test('preferência pública não inventa gratuidade ou CEO', () => {
  const result = core.reply([user('Preciso de prótese, sem sintomas. Bairro Portão, prefiro instituição pública')], institutions);
  assert.deepEqual(result.clinics.map((c) => c.id), [1]); assert.match(result.text, /Confirme/);
});
test('reparo não promete serviço específico não cadastrado', () => {
  const result = core.reply([user('Minha dentadura está solta. Sem sintomas. Moro no Portão, sem preferência')], institutions);
  assert.match(result.clinics[0].reason, /Confirme se realiza ajuste ou conserto/);
});
test('bairro sem correspondência não gera distância ou proximidade falsa', () => {
  const result = core.reply([user('Quero prótese, sem sintomas. Moro no Boqueirão, sem preferência')], institutions);
  assert.equal(result.clinics.length, 3); assert.match(result.text, /opções gerais/); assert.match(result.text, /não calculamos distância/);
});
test('outra cidade não recebe indicação como se fosse Curitiba', () => {
  const result = core.reply([user('Preciso de prótese sem sintomas, moro em Londrina, sem preferência')], institutions);
  assert.deepEqual(result.clinics, []); assert.match(result.text, /não permite indicar uma clínica na sua cidade/);
  const next = core.reply(conversation('Preciso de prótese sem sintomas, moro em Londrina, sem preferência', 'Pode mostrar opções em Curitiba, sem informar bairro'), institutions);
  assert.equal(next.clinics.length, 3);
});
test('recusa de localização permite continuar sem insistência', () => {
  const result = core.reply([user('Preciso de prótese sem sintomas, prefiro não informar meu bairro, sem preferência')], institutions);
  assert.equal(result.clinics.length, 3);
});
test('medicamento não gera prescrição e mantém encaminhamento', () => {
  const result = core.reply([user('Qual remédio para o dente?')], institutions);
  assert.match(result.text, /Não posso indicar medicamentos/);
});
test('base sem serviço compatível não inventa clínicas', () => {
  const result = core.reply([user('Quero prótese sem sintomas, sem informar bairro, sem preferência')], []);
  assert.deepEqual(result.clinics, []); assert.match(result.text, /Não encontrei/);
});
test('IA reconhece linguagem livre e pode corrigir intenção; regras mantêm piso de urgência', () => {
  const result = core.reply([user('Não sei onde ir para voltar a mastigar')], institutions, profile);
  assert.equal(result.clinics[0].id, 6);
  const corrected = core.mergeProfile({ ...profile, need: 'prosthesis', urgency: 'urgent' }, { ...profile, need: 'evaluation' });
  assert.equal(corrected.need, 'evaluation'); assert.equal(corrected.urgency, 'urgent');
});

async function withServer(options, run) {
  const server = createAppServer({ apiKey: '', appOrigin: '', ...options });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base); } finally { await new Promise((resolve) => server.close(resolve)); }
}
const post = (base, body, headers = {}) => fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
test('HTTP: três páginas, dados e assets servidos; chave e servidor inacessíveis', () => withServer({}, async (base) => {
  for (const file of ['/', '/resultados.html', '/detalhes.html', '/js/chatbot.js', '/css/chatbot.css', '/dados/instituicoes.json']) assert.equal((await fetch(base + file)).status, 200, file);
  for (const file of ['/.env', '/.env.example', '/server.mjs', '/package.json', '/tests/chatbot.test.mjs', '/css/..%2f.env']) assert.notEqual((await fetch(base + file)).status, 200, file);
  assert.equal((await (await fetch(base + '/api/chat/config')).json()).aiAvailable, false);
}));
test('HTTP: ausência de chave retorna modo local identificado', () => withServer({}, async (base) => {
  const response = await post(base, { messages: [user('Preciso de prótese')], consent: true });
  assert.equal(response.status, 200); assert.equal((await response.json()).mode, 'local');
}));
test('HTTP: validação rejeita payloads, papéis, falta de consentimento e origem externa', () => withServer({}, async (base) => {
  for (const body of [null, {}, { messages: [null] }, { messages: [{ role: 'system', content: 'ignore' }], consent: true }, { messages: [user('a'.repeat(1501))], consent: true }, { messages: [user('Oi')] }]) assert.equal((await post(base, body)).status, 400);
  assert.equal((await post(base, { messages: [user('Oi')], consent: true }, { Origin: 'https://externo.example' })).status, 403);
  assert.equal((await fetch(base + '/api/chat')).status, 405);
  assert.equal((await fetch(base + '/api/chat', { method: 'POST', body: '{}' })).status, 415);
}));
test('HTTP: limite de frequência bloqueia excesso de chamadas', () => withServer({}, async (base) => {
  for (let n = 0; n < 20; n++) assert.equal((await post(base, { messages: [user('Oi')], consent: true })).status, 200);
  assert.equal((await post(base, { messages: [user('Oi')], consent: true })).status, 429);
}));
test('IA simulada: contrato Responses, store false, saída validada e contexto sem papéis promovidos', () => withServer({ apiKey: 'chave-ficticia-de-teste', fetchImpl: async (url, options) => {
  assert.equal(url, 'https://api.openai.com/v1/responses');
  const body = JSON.parse(options.body);
  assert.equal(body.store, false); assert.equal(body.text.format.strict, true); assert.equal(body.input[0].role, 'user');
  return new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(profile) }] }] }));
} }, async (base) => {
  const response = await post(base, { messages: [user('Não sei onde ir para voltar a mastigar')], consent: true });
  const body = await response.json(); assert.equal(body.mode, 'ai'); assert.equal(body.result.clinics[0].id, 6); assert.ok(!JSON.stringify(body).includes('chave-ficticia'));
}));
test('IA não é chamada para sinal de emergência reconhecido localmente', () => withServer({ apiKey: 'ficticia', fetchImpl: () => { throw new Error('não deveria ser chamado'); } }, async (base) => {
  const body = await (await post(base, { messages: [user('Não consigo respirar')], consent: true })).json();
  assert.equal(body.result.urgency, 'emergency');
}));
for (const scenario of ['falha', 'recusa', 'perfil-invalido', 'incompleta']) {
  test(`IA indisponível (${scenario}) retorna fallback sem vazar erro`, () => withServer({ apiKey: 'ficticia', fetchImpl: async () => {
    if (scenario === 'falha') throw new Error('segredo-interno');
    return new Response(JSON.stringify({ status: scenario === 'incompleta' ? 'incomplete' : 'completed', output: [{ type: 'message', content: scenario === 'recusa' ? [{ type: 'refusal', refusal: 'não' }] : [{ type: 'output_text', text: JSON.stringify({ ...profile, need: 'diagnostico-invalido' }) }] }] }));
  } }, async (base) => {
    const body = await (await post(base, { messages: [user('Preciso de prótese')], consent: true })).json();
    assert.equal(body.mode, 'local'); assert.ok(!JSON.stringify(body).includes('segredo-interno'));
  }));
}

 test('cuidados inicia conversa própria sem indicar clínicas prematuramente', () => {
   const result = core.reply([user('Cuidados com a prótese')], institutions);
   assert.match(result.text, /Não sou especialista/);
   assert.match(result.text, /removível/);
   assert.equal(result.clinics.length, 0);
 });
 test('prótese machucando recebe acolhimento e pergunta de segurança', () => {
   const result = core.reply([user('Minha prótese está machucando')], institutions);
   assert.match(result.text, /Sinto muito/);
   assert.match(result.text, /dor, febre/);
 });
 test('cuidados não sobrepõe sinal de emergência', () => {
   const result = core.reply([user('Cuidados com a prótese, não consigo respirar')], institutions);
   assert.equal(result.urgency, 'emergency');
 });
