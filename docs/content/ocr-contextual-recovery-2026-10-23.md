# Recuperação OCR e publicação contextual — 23/10/2026

## Resultado real no workspace canônico

| Obra | Páginas examinadas | Com texto | Conteúdo publicado nesta rodada |
| --- | ---: | ---: | --- |
| Agostinho — A Doutrina Cristã | 142 | 142 | 232 recortes para estudos de hermenêutica/exegese |
| Keener — Contexto Cultural NT | 834 | 830 | 4.851 relações contextuais elegíveis, nos 27 livros do NT |
| Wegner — Exegese NT | 129 | 129 | 166 recortes metodológicos |
| Von Rad — Teologia AT | 21 | 21 | 12 recortes dos trechos efetivamente presentes |
| Ladd — Teologia NT | 207 | 207 | 101 recortes temáticos |
| Lossky — Teologia Mística | 207 | 207 | 178 recortes temáticos |
| **Total** | **1.540** | **1.536** | **689 recortes temáticos + 4.851 relações culturais** |

Keener: páginas físicas2,812,826,828 retornaram vazias e foram renderizadas e examinadas;
estão em branco. Não são páginas esquecidas nem texto a inventar. OCR está completo nas
seis obras; a contagem de páginas com texto continua distinguindo páginas vazias.

Os recortes metodológicos/teológicos alimentam os estudos, não são despejados como
comentários de todos os versículos. Keener usa o livro no cabeçalho e o lema primário
explícito; referências citadas no corpo não determinam o destino. Filemom,2/3João e Judas
têm tratamento próprio de capítulo único. Ranges e enumerações conservam seus destinos.

Texto-fonte espanhol/português, páginas físicas, offsets UTF-16, edição, direitos e
qualificações foram preservados. Não houve geração LLM nem tradução automática nesta rodada.
Excertos publicados são literais; OCR pode conter erros. Não são comentários teológicos
universalmente verdadeiros nem uma revisão humana integral da obra.

## Correções e segurança

- A troca atômica de JSON tolera bloqueios transitórios Windows e usa temporários únicos.
  Falha persistente de telemetria não destrói as páginas já prontas; falha de uma página
  permanece como exceção, nunca sucesso silencioso.
- Até4 processos locais, com um gate de OCR por processo. A tentativa inicial com threads
  colidiu com o gate do serviço; foi interrompida e substituída por processos. As páginas
  faltantes foram reprocessadas, e a execução final terminou sem erros de página.
- Publicação exclusiva pelo lock canônico. A publicação automática final encontrou o lock
  da calibração em andamento e recusou escrever; publicação posterior concluiu normalmente.
- Não houve nova cópia completa do banco. Importadores contextual/temático receberam
  `--reuse-backup` com o snapshot pré-OCR já existente. Transações e checksums continuam ativos.
- Reestruturação genérica destrutiva é pulada quando há contextos protegidos. Dois índices
  genéricos continuam com estrutura/análise parcial por reconciliação pendente; isso não
  invalida as novas unidades documentais nem significa OCR pendente. O bloqueio foi preservado.
-14 remissões curtas inicialmente candidatas foram retidas (`withheld`), não apagadas.
  Três propostas temáticas com transição de livro dentro da página foram rejeitadas e
  substituídas por localizadores corretos. Evidências antigas e revisões humanas preservadas.

## Jerusalém

O mesmo arquivo instalado tem1.221 páginas físicas,1.219 com texto e duas vazias(1/1221).
O texto já é extraído; não há impedimento geral de OCR. Auditoria da estrutura textual em
todas as páginas encontrou tamanhos11,04/12/8,04 e nenhuma anotação PDF ou candidato a
texto pequeno não numérico. Isso é diagnóstico, não prova de ausência de qualquer nota.
As imagens de Gênesis1(p2),Salmos(p600,inspeção anterior) e Marcos(p1000) mostram texto
bíblico e títulos, sem aparato de comentários. Não foi fabricado comentário a partir desse texto.
Se houver notas visíveis em outra página dessa edição, ela exige calibração específica.

## Verificação e rastros privados

- Importação OCR verificada:0novas/1.540reutilizadas/0pendentes no staging.
- Lote Keener completo:49arquivos; repetição0novas/4.851reutilizadas.
- Temáticos:12arquivos; repetição0novas/689reutilizadas após correções.
- Consulta real do Reader retorna Keener em Mateus1:1. Consulta real de Hermenêutica retorna
  Wegner. Há destinos de Keener nos27livros do NT; FKs0.
-618testes TypeScript/94arquivos e133Python aprovados; typecheck,mypy18arquivos,Ruff,
  ESLint focado e formatação aprovados. Build web aprovado; avisos preexistentes permanecem.
- QA por consultas reais e inspeção de PDFs/amostras de trechos. Não foi executado novo
  passeio completo pela interface, nem avaliação individual de todos os4.851vínculos.

Staging canônico privado em `data/workspace/`:

- `ocr-recovery-validated-20261023/`;
- `recovered-thematic-20261023-v4/`;
- `keener-cultural-20261023-complete/`;
- `recovered-consumer-audit-20261023-final.json`;
- `jerusalem-layout-audit-20261023.json`;
- `augustine-recovery-transition-corrections-20261023.json`;
- `keener-cultural-referrals-withheld-20261023.json`.

Arquivos de versões de calibração anteriores não são o lote final e contêm candidatas
posteriormente corrigidas/retidas. Não reaplicar para restaurar decisões antigas.

## Mobile e limites restantes

Nenhum APK, kit de2GB ou backup do telefone foi gerado nesta etapa. O telefone mantém o
snapshot anterior; para receber estes dados precisa de novo pacote/patch de conteúdo.
O formato de consumo0.5.3 já suporta essas tabelas: não é necessário reconstruir o app
apenas por adicionar o acervo. OCR, produção editorial e calibração continuam no PC.

Persistem: erros possíveis de OCR, notas sem cabeçalho inequívoco, fragmentos com continuação
na página seguinte, reconciliação dos índices genéricos e revisão acadêmica das ligações.
Von Rad permanece um arquivo de21páginas, não os dois volumes completos. Jerusalém não
ganhou aparato inexistente. Não declarar cobertura integral de todos os versículos.
