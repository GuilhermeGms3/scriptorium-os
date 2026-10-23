# Estudos, leitura anotada e continuidade contextual — 21/10/2026

## Entregue no código desktop

- Editor de documento compartilhado na janela contextual, com Markdown, formatação, links,
  grupo/pasta/cor e persistência no mesmo workspace. Leitores da Biblioteca abrem esse editor.
- Seleção original com posições exatas, fonte preservada, restauração do destaque ao consultar
  a nota e compatibilidade com notas/backup anteriores; nenhuma migration nova.
- Vídeo opcional ao lado de Conteúdo/Leituras; link pessoal sem chave ou busca pela API já existente.
  Recolher interrompe o player. Não atribuir recomendação acadêmica a um link pessoal.
- 19 leituras selecionadas, verificadas em leitura no banco original (19/19 hashes coincidentes).
  Sete novas: três páginas de A Trindade, uma das Institutas, duas de hermenêutica e uma de Augsburgo.
- Treze capítulos introdutórios de história, concílios e comparação confessional. Há referências
  externas, não atas completas importadas. Este conjunto não aprofunda exaustivamente todos os temas.
- Filtros de tradição declarada e tipo de ligação, distinguindo citações confessionais de comentário.
  A orientação editorial da Genebra é identificada pela edição instalada e sua apresentação (p.8),
  não por adivinhação a partir de título nem pela identidade de todos os seus autores.

## Integração colaborativa

O remoto avançou quatro commits durante o trabalho. A integração preservou os commits do colega,
o salto `?v=`, seleção de edição, comentários resumidos/completos, panorama e fontes desligáveis.
O conflito do Reader foi resolvido combinando os comportamentos: **Contexto de leitura** é um
detalhe recolhível na barra de fontes, não a volta da caixa antiga no topo do texto. A sidebar usa
os mesmos filtros, inclusive as fontes ocultas. O filtro de área continua reiniciando por capítulo.

No QA em 390 px, o `sr-only` da área na barra horizontal causava overflow global. Seu label passou
a estabelecer o contexto de posicionamento, sem remover a barra nem esconder os comentários.
Os arquivos Android e o banco do acervo não foram alterados por essa implementação.

## Lote privado de Agostinho: preparado, não publicado no original

`data/workspace/desktop-context-20261021/` contém gerador, pacote, hashes e recibos privados.
Oito notas literais, com destinos principais em Jo 5:19, 5:26, 7:16, 12:44, 12:48, 16:25, 16:27,
16:28. Três páginas foram lidas integralmente e comparadas às imagens do PDF. Não se publicou
cada citação secundária como comentário. A interpretação é identificada como patrística latina de
Agostinho; não foi classificada como verdade doutrinária do sistema.

O importador canônico foi executado **apenas sobre snapshot consistente temporário**: oito novas;
verificação somente leitura posterior: zero novas/oito reutilizadas. Os recibos deste lote referem-se
ao QA, não comprovam incorporação no original. O diretório privado continua fora do Git público.

O banco original conserva **57 documentos, schema26, quick_check=ok, zero erros de FK**. Não foi
migrado para28 nem foi removido seu lock Linux. O Docker estava desligado/inacessível. Antes de
publicar o lote, reabrir o ambiente, confirmar todos os escritores parados e tratar o lock conforme
o procedimento operacional existente. Não abrir Vite e Docker gravando a mesma pasta. Não confundir
o snapshot de QA com uma nova instalação canônica.

## Verificação

| Comando/fluxo                                        | Resultado                                           |
| ---------------------------------------------------- | --------------------------------------------------- |
| `npx vitest run --testTimeout=60000` após integração | 506 testes, 81 arquivos aprovados                   |
| `npm run semantic:test`                              | 113 aprovados; aviso de depreciação Starlette/httpx |
| `npm run semantic:typecheck`                         | mypy sem erros em 15 arquivos                       |
| `npm run semantic:lint`                              | Ruff aprovado                                       |
| `npm run typecheck`                                  | aprovado                                            |
| ESLint de todos os TS/TSX alterados desde 08fb834    | aprovado                                            |
| `npm run build`                                      | aprovado; preset local node-server preservado       |
| `git diff --check`                                   | aprovado                                            |

QA com Playwright, pois o plugin Browser não está disponível. URL isolada
`http://127.0.0.1:5174`; viewports 1440×1000 e 390×844. Exercitados: leituras privadas reais,
edição/formatação/salvamento em grupo, reload e destaque da origem, marcação na Biblioteca,
editor em fonte primária, filtros, rejeição de link de vídeo inválido e feedback do tradutor ausente.
O fluxo principal não apresentou erro de console nem overlay; a solicitação intencional ao tradutor
desligado gerou HTTP400 e aviso recuperável, sem tela branca. O aviso React de componente não montado
visto durante HMR não reapareceu no build de produção. Após corrigir o label da barra de fontes,
o teste do leitor em 390 px confirmou ausência de overflow; o salto por URL, o seletor de versículo
e a ocultação de fontes após reload continuaram funcionando sem erro de execução.

## Restante, sem prometer cobertura integral

1. Publicar o lote privado no banco original após exclusão de escritores e verificar novamente.
2. Reativar o tradutor real e avaliar nova tradução de prosa teológica; testar API de vídeo com chave
   e reprodução real, ainda não realizadas. Não alegar que a tradução funciona perfeitamente.
3. Ampliar a leitura contextual das demais seções/obras e a cobertura dos livros bíblicos. Esses oito
   destinos e 19 leituras não equivalem às 47 mil páginas nem a comentários em todos os versículos.
4. Produzir maior profundidade por tema, história dos demais concílios e documentação licenciada de
   suas decisões. Os capítulos históricos atuais são introdutórios, não um curso completo.
5. O novo front ainda requer reconstrução da imagem para aparecer no Docker. Não houve rebuild nem
   instalação Android nesta entrega. O cache de traduções existente não comprova disponibilidade
   atual do serviço. Uma marcação pessoal exata ainda não é reproduzida via URL do leitor integral;
   ela reaparece na janela **Consultar fonte**.
