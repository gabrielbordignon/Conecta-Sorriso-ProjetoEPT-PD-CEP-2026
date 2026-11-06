# Assistente Conecta Sorriso — entrega Hacktech

Esta pasta contém uma nova cópia do ZIP original com o chatbot adicionado. A pasta original, o ZIP recebido, os dados das instituições, o design e os scripts anteriores foram preservados. O README.md original descreve o site anterior; este documento descreve a funcionalidade adicional e suas diferenças de privacidade e execução.

## Experimentar em poucos passos

1. Instale Node.js 22.9 ou superior, se ainda não tiver. Não há dependências para instalar.
2. Abra um terminal **dentro desta pasta** e execute:

```sh
npm start
```

3. Acesse [http://127.0.0.1:3000](http://127.0.0.1:3000).
4. Clique em **Duvidas?**, no canto inferior direito.
5. O chat abre diretamente com a mensagem de acolhimento e as três opções de prótese. O modo inicial usa regras, sem IA generativa.

Também pode executar `node --env-file-if-exists=.env server.mjs` diretamente. Para encerrar o servidor, pressione Ctrl+C no terminal.

## Ativar a IA

1. Duplique `.env.example` e renomeie a cópia para `.env`, na raiz desta pasta.
2. Abra `.env` em um editor de texto e preencha `OPENAI_API_KEY` com sua chave da API da OpenAI. A assinatura do aplicativo ChatGPT não é usada como credencial deste servidor.
3. Mantenha `OPENAI_MODEL=gpt-4.1-mini` ou informe outro modelo de sua conta que suporte Responses e saída estruturada com o esquema utilizado.
4. Inicie novamente com `npm start`.
5. No chat, clique em **Nova conversa**. Se a IA estiver configurada, aparece uma caixa opcional para permitir o envio das mensagens à OpenAI. Marque-a para usar IA; sem marcar, a conversa continua por regras.

```dotenv
OPENAI_API_KEY=SUA_CHAVE_AQUI
OPENAI_MODEL=gpt-4.1-mini
HOST=127.0.0.1
PORT=3000
```

`SUA_CHAVE_AQUI` é um marcador para substituir. Nunca coloque uma chave no HTML, em `js/`, no GitHub, no relatório de alterações ou no ZIP de distribuição. A API pode gerar custos de uso na conta configurada. Nenhuma chave real acompanha esta entrega.

## O que o agente faz

- Entende o relato em linguagem natural no modo IA e mantém o contexto da conversa em memória.
- Identifica a necessidade relatada: avaliação geral, busca de prótese ou avaliação de uma prótese que precisa de ajuste.
- Pergunta sobre sintomas, bairro e preferência por instituição pública ou também privada, quando faltam essas informações.
- Permite recusar o fornecimento de bairro.
- Consulta exclusivamente `dados/instituicoes.json` para sugerir até três opções com endereço, telefone, acesso e link para a página de detalhes existente.
- Prioriza instituições do mesmo bairro e respeita a preferência pública; empates seguem a ordem dos IDs. Não classifica qualidade clínica e não calcula distância no chat.
- Explica quando o bairro não tem correspondência ou a cidade não está coberta pelo cadastro.
- Em possíveis sinais de urgência reconhecidos, interrompe a lista de atendimento de rotina e orienta avaliação presencial.
- Oferece fechamento, Escape, respostas sugeridas, envio por Enter, quebra de linha por Shift+Enter e reinício de conversa.

Exemplo para apresentação: “Preciso de uma prótese” → “Sem dor, febre, inchaço ou sangramento” → “Portão” → “Qualquer uma, sem preferência”. A primeira opção será a Faculdade Herrero, porque seu cadastro informa prótese e fica no bairro informado. Isso não significa que ela seja clinicamente superior às demais.

## Como a IA participa

Fluxo: mensagem → servidor `/api/chat` → interpretação por IA → validação do perfil estruturado → regras de segurança e consulta ao JSON → resposta no chat.

O modelo retorna **somente campos de um perfil**, como necessidade, sintomas reconhecidos, bairro e preferência. Ele não escreve diagnósticos, prescrições nem os dados das instituições. O código monta perguntas, orientações e cartões a partir desses campos e da base local. Essa separação torna o resultado mais previsível para o protótipo.

O servidor usa a [Responses API com saída estruturada](https://developers.openai.com/api/docs/guides/structured-outputs). O [modelo configurado por padrão](https://developers.openai.com/api/docs/models/gpt-4.1-mini) pode ser alterado em `.env`. Uma falha, recusa, tempo excedido ou saída inválida ativa o modo local, identificado na interface. Sinais de urgência reconhecidos por regras são mostrados imediatamente, sem depender da API.

As expressões do modo local são limitadas: podem deixar de reconhecer uma descrição ou entendê-la incorretamente. A IA também pode interpretar o relato de forma incorreta. Ausência de alerta nunca comprova ausência de risco. Não é uma ferramenta validada de classificação de risco, diagnóstico ou decisão clínica.

## O que foi preservado e onde inserir

Nos três arquivos `index.html`, `resultados.html` e `detalhes.html`, foram acrescentados apenas um CSS após `css/accessibility.css` e dois scripts antes de `</body>`. Os novos seletores começam com `cs-chat` e não mudam o estado dos filtros, do mapa ou da busca. Nenhum trecho funcional anterior foi retirado.

Os arquivos de interface e regras são `css/chatbot.css`, `js/chatbot.js` e `js/chatbot-core.js`. O servidor opcional é `server.mjs`. Configuração: `package.json`, `.env.example` e `.gitignore`. Testes: `tests/chatbot.test.mjs`.

O diretório `docs-chatbot/` contém o relatório com **todos os trechos adicionados**, os pontos de inserção nas páginas, o patch completo, a verificação e imagens da interface. Esses relatórios são materiais de entrega, sem participação na execução.

## Privacidade e cuidados de implementação

- O chatbot não exige cadastro e não grava a conversa, sintomas ou bairro em cookies, localStorage, sessionStorage, arquivos ou banco. Recarregar a página, navegar para outra página ou usar “Nova conversa” elimina o contexto do chat desta página.
- No modo local, as mensagens não são enviadas à API de IA. Os dados das instituições são lidos do mesmo site.
- No modo IA, as mensagens e o histórico textual necessário são enviados ao servidor do projeto e à OpenAI após escolha explícita do visitante. A chamada utiliza `store: false`; consulte os [controles de dados do provedor](https://developers.openai.com/api/docs/guides/your-data). Não se deve prometer retenção zero apenas com essa opção.
- O código anterior das páginas, inclusive scripts de terceiros já presentes, permanece intacto. As afirmações acima descrevem o chatbot, não uma auditoria de rastreamento de todo o site ou da hospedagem.
- Os links para detalhes carregam apenas o ID público da instituição. O chat não coloca relatos de saúde em URLs.
- Textos recebidos são apresentados com `textContent`, sem interpretação como HTML.
- O servidor não publica `.env`, código de servidor ou testes e não registra o conteúdo das conversas. A infraestrutura escolhida para hospedagem pode ter logs próprios.
- Há limites de tamanho, histórico, chamadas por minuto e concorrência. Ao atingir o limite de conversa, o usuário deve iniciar uma nova conversa; o código não descarta silenciosamente sintomas antigos.
- A urgência reconhecida é preservada durante a conversa. Para corrigir um relato digitado incorretamente, inicie uma nova conversa; em sintomas reais, procure avaliação.

As orientações para sinais de alerta se baseiam no [Protocolo de Saúde Bucal da Secretaria de Saúde de Curitiba, páginas 10–11](https://saude.curitiba.pr.gov.br/images/APS/191%20-%20Protocolo_Saude_Bucal_APS_v03.pdf) e nas informações sobre o [SAMU 192 do Ministério da Saúde](https://www.gov.br/saude/pt-br/composicao/saes/samu-192). O chat não prescreve medicamentos, não promete encaixes nem recomenda uma prótese específica. A informação institucional é a do cadastro original e não foi revalidada em tempo real nesta implementação.

## Hospedagem

**GitHub Pages / Live Server / Python:** o site e a orientação local continuam funcionando como arquivos estáticos via HTTP. Não é preciso alterar a hospedagem existente para testar esse modo. Uma tentativa sem sucesso de ler `/api/chat/config` é esperada em hospedagem estática. Abrir por `file://` pode bloquear a leitura do JSON, como já ocorre no projeto original.

**Modo IA:** requer executar `server.mjs` em uma hospedagem com Node.js e acesso HTTPS à API. Sirva o frontend e `/api/chat` na mesma origem. Esta entrega não altera nem publica o site que está no ar.

Em hospedagem, configure `OPENAI_API_KEY` como segredo no painel do provedor, `HOST=0.0.0.0` se necessário e `APP_ORIGIN=https://seu-dominio-real`. A origem deve ser exata e sem barra final. Configure o proxy para servir as três páginas e `/api/chat` sob o mesmo domínio. Não use um servidor estático que exponha a raiz com `.env` para hospedar o backend. O servidor fornecido permite somente os arquivos públicos previstos.

Este é um protótipo de hackathon. Antes de disponibilizar atendimento baseado em relatos reais de saúde, é necessária validação por profissionais responsáveis e revisão dos controles da hospedagem. Os limites em memória não substituem controles de uso distribuídos em um serviço com múltiplas instâncias.

## Executar os testes

```sh
npm test
```

Os testes usam o executor nativo do Node e um servidor temporário em loopback. Verificam conversas, recomendações, negações, urgências, isolamento dos arquivos, limites e comportamento da integração com respostas **simuladas** da API. Não exigem uma chave e não geram custos de API. O teste com uma chamada real à OpenAI depende de uma chave válida do responsável pelo projeto; ele não foi executado nesta entrega.

Para demonstração de alertas, use dados fictícios e reinicie a conversa depois. Relatos como “estou com dor forte” devem levar à orientação de avaliação prioritária; “não consigo respirar” deve mostrar a orientação de emergência e o botão de ligação para 192, sem exibir clínicas de rotina.

## Atualização de acolhimento

As opções iniciais agora são “Preciso de uma prótese”, “Cuidados com a prótese” e “Minha prótese está machucando”. O assistente se identifica como virtual e não especialista, com linguagem mais acolhedora. Cuidados tem um fluxo próprio para identificar o tipo de prótese e oferecer busca de orientação profissional.

## Inicialização com porta ocupada

Execute `npm start` na pasta que contém `package.json`. Se a porta 3000 estiver ocupada, o servidor tenta automaticamente as próximas portas até 3020. Abra o endereço impresso no terminal. Se você definir PORT explicitamente, ela será respeitada, sem troca automática. O aviso de ausência de .env não impede o modo local.

## Abertura direta do chat

A opção “Usar orientação local” foi removida. A abertura e “Nova conversa” mostram diretamente as boas-vindas e as três opções de prótese. Quando há chave configurada, a autorização opcional de envio à OpenAI aparece acima do campo de mensagem. A leitura de configuração não bloqueia o início da conversa.
