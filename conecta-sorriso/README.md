# Conecta Sorriso — Rede de Acesso à Saúde Bucal

Protótipo educacional responsivo para pesquisar, filtrar e visualizar no mapa serviços odontológicos de Curitiba, com foco em reabilitação oral e próteses dentárias.

## Tecnologias

- HTML5 semântico;
- CSS3 com Grid, Flexbox e media queries;
- JavaScript puro (ES6+);
- Leaflet.js;
- OpenStreetMap;
- arquivo JSON local como base de dados.

Não há login, cadastro, cookies de rastreamento, ferramentas de análise ou armazenamento de localização.

## Estrutura

```text
conecta-sorriso/
├── index.html
├── resultados.html
├── detalhes.html
├── css/
│   ├── style.css
│   ├── responsive.css
│   └── accessibility.css
├── js/
│   ├── app.js
│   ├── resultados.js
│   ├── detalhes.js
│   ├── mapa.js
│   ├── filtros.js
│   └── acessibilidade.js
├── dados/
│   └── instituicoes.json
└── assets/
    ├── logo.png
    └── icons/
```

## Como executar localmente

O navegador pode bloquear a leitura de `dados/instituicoes.json` quando os arquivos são abertos diretamente por `file://`. Use um servidor local.

### Opção 1 — Live Server no Visual Studio Code

1. Abra a pasta `conecta-sorriso` no Visual Studio Code.
2. Instale a extensão **Live Server**.
3. Clique com o botão direito em `index.html`.
4. Escolha **Open with Live Server**.

### Opção 2 — servidor simples do Python

No terminal, dentro da pasta do projeto, execute:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

O mapa precisa de acesso à internet para carregar Leaflet.js e as imagens cartográficas do OpenStreetMap.

## Como trocar os dados de demonstração por dados reais

1. Confirme cada informação em uma fonte pública ou diretamente com a instituição.
2. Faça uma cópia de segurança de `dados/instituicoes.json`.
3. Substitua cada registro fictício mantendo exatamente os mesmos nomes de propriedades.
4. Use um `id` inteiro, positivo e exclusivo para cada instituição.
5. Informe latitude e longitude em números decimais.
6. Use `true` ou `false` nos campos booleanos.
7. Use uma lista JSON no campo `tipo_atendimento`.
8. Registre a fonte e a data de validação no formato `AAAA-MM-DD`.
9. Marque `validado` como `true` apenas depois de confirmar o registro.
10. Valide a sintaxe do JSON e teste busca, filtros, mapa e detalhes.

Se um contato não estiver disponível, use uma string vazia. A interface mostrará uma mensagem amigável e desativará a ação correspondente.

## Publicação no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie o conteúdo desta pasta para a raiz do repositório.
3. No GitHub, abra **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/ (root)`.
6. Salve e aguarde a publicação.
7. Abra a URL informada pelo GitHub e teste as três páginas.

Todos os caminhos do projeto são relativos, portanto funcionam em uma subpasta do GitHub Pages.

## Testes manuais recomendados

- Abrir a página inicial em 360, 768, 1024, 1366 e 1920 px.
- Pesquisar usando letras maiúsculas, minúsculas, acentos e espaços duplicados.
- Pesquisar por nome, bairro, CEP, categoria, atendimento e forma de acesso.
- Combinar categoria, bairro, atendimento e encaminhamento.
- Limpar a pesquisa e confirmar o retorno de todos os registros.
- Alternar entre lista e mapa no celular.
- Abrir cada marcador e o botão **Ver detalhes**.
- Autorizar e negar a geolocalização.
- Simular localização indisponível e tempo excedido nas ferramentas do navegador.
- Verificar ordenação por distância e o cálculo apresentado.
- Testar `detalhes.html` sem `id`, com `id` inválido e com `id` inexistente.
- Testar registros sem telefone e sem site.
- Navegar apenas pelo teclado e verificar o foco visível.
- Testar o link **Ir para o conteúdo principal**.
- Aumentar e reduzir o texto e ativar o alto contraste.
- Testar com leitor de tela e zoom do navegador em 200%.
- Desconectar a internet para confirmar a mensagem de mapa indisponível.
- Abrir por `file://` para confirmar a mensagem sobre servidor local.

## Melhorias futuras

- Substituir os registros demonstrativos por dados oficialmente verificados.
- Criar um processo de revisão periódica e histórico de atualizações.
- Adicionar filtros por distância, gratuidade, faixa etária e disponibilidade.
- Implementar compartilhamento de instituição por link.
- Oferecer impressão acessível da ficha do atendimento.
- Adicionar testes automatizados de interface e acessibilidade.
- Disponibilizar o projeto como aplicativo web instalável (PWA).
- Criar uma camada administrativa segura para atualização dos dados.

## Observação educacional

Os seis registros incluídos são fictícios e estão claramente identificados como demonstração. Eles não devem ser tratados como informação de atendimento real.
