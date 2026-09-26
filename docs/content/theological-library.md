# Biblioteca teológica e de cristianismos antigos

## Conteúdo operacional

Esta expansão adiciona fontes primárias ao mesmo runtime SQLite/FTS usado pelos
demais corpora. Não são cartões decorativos nem links externos disfarçados de
conteúdo instalado.

| Coleção                     | Unidade de navegação           | Idioma        | Direitos da edição digital |
| --------------------------- | ------------------------------ | ------------- | -------------------------- |
| Evangelho de Tomé, NHC II,2 | prólogo, ditos 1–114 e colofão | copta saídico | CC BY 4.0                  |
| Confissões de Agostinho     | livros I–XIII                  | inglês        | domínio público nos EUA    |
| Suma Teológica              | 2.661 artigos em quatro partes | inglês        | domínio público nos EUA    |

Cada pacote preserva URL de origem, revisão/identificador, tamanho, SHA-256,
atribuição e histórico de transformação. O comando de aquisição é:

```bash
npm run content:fetch:theology
npm run corpus:index
```

Os arquivos Gutenberg da Suma repetem 19 localizadores impressos com títulos
diferentes e contêm outras irregularidades tipográficas. O importador preserva o
localizador recebido e usa também o título na identidade estável; nenhum artigo
é sobrescrito para “corrigir” silenciosamente a edição.

## Nag Hammadi

O catálogo representa 13 códices e 52 testemunhos textuais. Testemunhos repetidos
em códices diferentes permanecem registros distintos. No momento, somente o
Evangelho de Tomé possui texto-fonte instalado, proveniente do Coptic SCRIPTORIUM.
A fonte declara explicitamente que não contém tradução.

O inventário de códices foi conferido contra o [Nag Hammadi Library Codex
Index](https://gnosis.org/naghamm/nhlcodex.html). Os títulos portugueses são
rótulos editoriais do Scriptorium; os títulos canônicos ingleses continuam
armazenados separadamente.

Uma tradução portuguesa moderna completa não é tratada como domínio público. Ela
só poderá entrar de duas formas:

1. pacote redistribuível acompanhado de licença explícita; ou
2. documento privado importado pelo usuário, mantido em OPFS e excluído do Git.

## Organização para estudo

A página Estudo oferece pontos de partida por exegese/recepção, patrística,
trindade/cristologia, ética/soteriologia, Nag Hammadi e eclesiologia/liturgia.
Esses cartões abrem obras realmente instaladas; não substituem análise acadêmica
nem apresentam uma tradição como vencedora.

## Limites

- Os textos de Agostinho e Aquino são traduções históricas inglesas; a interface
  não os traduz silenciosamente.
- O catálogo integral de Nag Hammadi não equivale a uma edição integral instalada.
- Arqueologia, geografia, historiografia, Septuaginta e edições portuguesas
  licenciadas ainda exigem fontes próprias, revisão de direitos e novos pacotes.
