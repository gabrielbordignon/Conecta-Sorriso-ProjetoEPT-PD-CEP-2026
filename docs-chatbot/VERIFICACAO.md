# Verificação da entrega — 05/11/2026

## Resultado

- **35 testes automatizados passaram**, sem falhas. Saída completa em `TESTES.txt`.
- Sintaxe de `server.mjs`, `js/chatbot.js` e `js/chatbot-core.js` verificada pelo Node.js.
- Patch validado e aplicado em cópia limpa; todos os arquivos do patch reconstituídos byte a byte.
- Nenhuma linha original excluída. Nenhuma instituição foi acrescentada, removida ou alterada no JSON.

## Verificação no navegador

| Cenário | Resultado observado |
| --- | --- |
| Página inicial | Visual e busca originais presentes; botão flutuante adicional |
| Busca original por UFPR | Retorna uma instituição; mapa com marcador |
| Filtro original por Rebouças | Retorna UniCuritiba e UniOpet; mapa com os dois marcadores |
| Detalhes da UniCuritiba | Nome, telefone, acesso, serviços, rota e mapa presentes |
| Chat nas três páginas | Abre e permite selecionar modo local |
| Conversa em etapas | Solicita sintomas, bairro e preferência |
| Prótese no Portão | Prioriza Faculdade Herrero; demais dados vêm do JSON original |
| Emergência fictícia | Mostra orientação de emergência, link tel:192 e fonte; sem clínicas de rotina |
| Escape | Fecha o diálogo e devolve foco ao botão flutuante |
| Celular 360 × 800 | Diálogo de 344 × 784, dentro da tela e sem corte horizontal |
| Alto contraste e texto 18 px | Controles e conversa legíveis; sem corte horizontal em 360 px |
| Console na verificação final | Nenhum erro capturado |

## Cobertura dos testes automatizados

Sinais explícitos de urgência e emergência, negações, preservação do risco no histórico, perguntas progressivas, resposta curta negativa, preferência pública, bairro sem correspondência, outra cidade, recusa de localização, pedido de medicamento, base sem serviço, interpretação semântica simulada, validação do contrato Responses, recusa/erro/saída inválida/incompleta da API, funcionamento sem chave, origem externa, papéis inválidos, limites por minuto e bloqueio de arquivos privados.

## Limites desta verificação

O teste com a API real não foi executado porque nenhuma chave real foi configurada para esta entrega. As respostas do provedor foram simuladas nos testes de integração. Não houve publicação nem alteração do site em produção. O teste de mapas verificou a presença do mapa e marcadores; não valida todos os serviços externos, geocodificação ou combinações possíveis dos recursos anteriores. Os critérios institucionais não foram revalidados e dependem de confirmação com cada instituição. Não foi realizada validação clínica da classificação de risco, teste formal de conformidade de acessibilidade ou auditoria completa da hospedagem.

## Preservação dos arquivos originais

| Arquivo original | Situação |
| --- | --- |
| `README.md` | Idêntico byte a byte |
| `assets/icons/README.md` | Idêntico byte a byte |
| `assets/logo.png` | Idêntico byte a byte |
| `assets/vendor/leaflet/leaflet.css` | Idêntico byte a byte |
| `assets/vendor/leaflet/leaflet.js` | Idêntico byte a byte |
| `assets/vendor/maplibre-leaflet/LICENSE.txt` | Idêntico byte a byte |
| `assets/vendor/maplibre-leaflet/leaflet-maplibre-gl.js` | Idêntico byte a byte |
| `assets/vendor/maplibre/LICENSE.txt` | Idêntico byte a byte |
| `assets/vendor/maplibre/maplibre-gl.css` | Idêntico byte a byte |
| `assets/vendor/maplibre/maplibre-gl.js` | Idêntico byte a byte |
| `css/accessibility.css` | Idêntico byte a byte |
| `css/responsive.css` | Idêntico byte a byte |
| `css/style.css` | Idêntico byte a byte |
| `dados/instituicoes.json` | Idêntico byte a byte |
| `detalhes.html` | Somente 5 linhas adicionadas; nenhuma retirada |
| `index.html` | Somente 5 linhas adicionadas; nenhuma retirada |
| `js/acessibilidade.js` | Idêntico byte a byte |
| `js/app.js` | Idêntico byte a byte |
| `js/detalhes.js` | Idêntico byte a byte |
| `js/filtros.js` | Idêntico byte a byte |
| `js/mapa.js` | Idêntico byte a byte |
| `js/resultados.js` | Idêntico byte a byte |
| `resultados.html` | Somente 5 linhas adicionadas; nenhuma retirada |

Manifesto completo: `MANIFESTO-PRESERVACAO.json`. As imagens registram a versão anterior aos novos textos de acolhimento. Esta atualização foi verificada por testes automatizados, sem nova inspeção visual.
