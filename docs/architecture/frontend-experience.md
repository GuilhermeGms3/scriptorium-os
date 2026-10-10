# Experiência de front-end

## Diagnóstico

O Scriptorium possui três contextos de trabalho distintos, mas o shell histórico os tratava como
se todos fossem uma passagem bíblica. O inspetor da passagem permanecia visível na Biblioteca, nos
Estudos e no Mapa de Conhecimento, mesmo sem uma passagem selecionada. Algumas telas chegavam a
cinco colunas concorrentes e repetiam muitos estados vazios.

O domínio e os serviços já são mais ricos que a apresentação. Existem leitura paralela, texto
original, interlinear, conhecimento privado por passagem, tradução local, grafo argumentativo,
fontes primárias, estudos e pipeline documental. A prioridade do front não é criar novos módulos,
mas tornar essas capacidades descobríveis no contexto correto.

## Modelo de experiência

### Leitura

- A Bíblia é o centro visual.
- Navegação de livros e capítulos fica à esquerda.
- Explicações pertinentes podem aparecer logo após o versículo e ser desativadas.
- O inspetor da direita é contextual à passagem ou palavra selecionada, nunca global.
- Texto original, comparação e interlinear são modos da mesma leitura, não destinos separados.

### Biblioteca

- O catálogo e os livros do usuário são a superfície principal.
- Tradução, OCR, desmontagem, auditoria e cobertura são ferramentas contextuais do documento.
- Controles operacionais em lote ficam sob divulgação progressiva, sem dominar o catálogo.
- Original, tradução auxiliar, fonte, página e estado de revisão devem permanecer distinguíveis.

### Investigação

- Estudos organizam perguntas, materiais e conclusões do usuário.
- O Mapa de Conhecimento serve para navegar relações já sustentadas por fontes.
- Entidades sem relações não devem produzir uma parede de painéis vazios.
- Detalhes técnicos permanecem disponíveis, mas recolhidos por padrão.

## Regras de composição

1. No máximo três regiões simultâneas: navegação, trabalho principal e contexto.
2. Painéis contextuais só aparecem quando possuem contexto válido.
3. Estados vazios semelhantes são consolidados em uma explicação acionável.
4. Recursos avançados usam divulgação progressiva; não competem com a tarefa principal.
5. Nenhuma relação, tradução ou explicação é inventada para preencher a interface.

## Sequência de evolução

1. Shell contextual e redução de ruído nas telas existentes.
2. Leitor focado em passagem, com seleção clara e painel contextual reorganizado.
3. Biblioteca orientada a obras, com tradução local e pipeline descobríveis por documento.
4. Estudos orientados a perguntas e materiais, sem exposição de estruturas internas.
5. Mapa de Conhecimento com busca, filtros e visualização somente de relações reais.
6. Revisão responsiva e navegação móvel para os fluxos principais.
