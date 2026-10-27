# Indicadores verticais dos leitores desktop

Implementação de27/10/2026, correspondente aos indicadores já existentes no Android.
Uma faixa reservada de32px à esquerda acompanha a leitura. Traços discretos, número
ativo, posição e tooltip identificam o destino. A janela mostra até9 alvos por grupo,
ajustando a quantidade à altura disponível; não cria uma lista de milhares de páginas.

## Onde aparece

- Escrituras: versículos em Leitura, Texto original, Interlinear, Comparação e no
  modo Explorar versículos. Os caminhos horizontais continuam independentes.
- Biblioteca privada: páginas físicas da obra e trechos do texto da página aberta.
- Fontes primárias: unidades da obra e trechos da unidade aberta.
- Leitor contextual: trechos da fonte consultada, mantendo o caderno ao lado.

A faixa aparece em janelas de pelo menos1024px. O aplicativo Android não é alterado;
em telas menores a interface web mantém seus controles anteriores.

## Comportamento e acessibilidade

Clique no ponto para navegar. Tab alcança os botões; setas verticais, Home e End
permitem percorrer destinos e alcançar os extremos mesmo em obras extensas. Os
nomes acessíveis dizem verso/página/seção/trecho, e `aria-current="location"` indica
a posição. Ao mudar a janela de pontos pelo teclado, o foco é preservado.

O traço ativo anima seu comprimento. A rolagem é suave, exceto quando o sistema pede
movimento reduzido; a preferência é lida novamente a cada salto. Os movimentos CSS
também respeitam essa preferência. Não há dependência nova de animação.

O scrollspy usa a primeira seção suficientemente visível, ignorando pequenas sobras
da anterior. Considera a barra fixa da página privada e mantém o último destino no
fim da leitura. Mede apenas elementos montados no leitor atual, com um frame por
evento de rolagem. MutationObserver/ResizeObserver acompanham carregamento, fonte,
largura e conteúdo. Observadores são desligados ao sair do desktop/desmontar a tela.

## Texto, evidência e persistência

`reading-sections.ts` delimita trechos para apresentação, preservando integralmente
o texto e seus offsets UTF-16. Parágrafos existentes são reconhecidos; blocos longos
podem ganhar limites de navegação depois de frases completas. Uma frase sem pontuação
não é cortada arbitrariamente. **Trecho** não é numeração editorial do autor.

`ReadingTextSections` adiciona spans sem inserir números ou labels no texto copiável.
A concatenação continua exatamente igual ao original, inclusive CRLF, espaços e
Unicode. Destaques podem atravessar os limites visuais e continuam associados aos
mesmos offsets. Não altera OCR, conteúdo, banco, corpus, notas, traduções ou progresso.

`ReadingSectionLayout` reutiliza o contêiner de leitura. O indicador não fica sobre
o texto, não desloca a sidebar principal nem monitora o painel direito como se fosse
a página. Mudanças de página/unidade usam os repositórios e estados existentes;
não são carregadas páginas extras para calcular o mapa.

Componentes: `src/components/common/reading-section-indicators.tsx`,
`reading-text-sections.tsx`; hook: `src/hooks/use-reading-scrollspy.ts`.
QA: `docs/qa/desktop-reading-indicators-2026-10-27.md`.
