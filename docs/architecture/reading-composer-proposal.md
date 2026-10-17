# Proposta futura — Compor leitura

Status: ideia registrada em 15/10/2026, **não implementada e sem início autorizado nesta etapa**.

## Propósito

Permitir montar uma sessão de leitura bíblica por blocos visuais conectáveis: texto principal,
fontes, tradições, métodos, assuntos e textos paralelos. O motor seleciona e organiza conteúdo
existente de maneira determinística, **sem inferência de LLM**.

A leitura direta continua disponível sem triagem obrigatória. O compositor é uma opção antes
de abrir a leitura; sua configuração pode ser salva, nomeada, editada e reutilizada.
Não é um redesign minimalista nem uma substituição das funções atuais do leitor.

## Prioridade antes da implementação

A prioridade do usuário é aproveitar os livros já entregues, não construir mais uma interface
com pouco conteúdo por trás. O acervo citado pelo usuário tem aproximadamente 31 mil páginas;
isso não equivale a 31 mil páginas integralmente analisadas, revisadas e ligadas a passagens.

O registro editorial atual descreve **116 notas de três fontes privadas**, em passagens
selecionadas de Gênesis 1–12. Esse intervalo não significa cobertura de todos os versículos,
nem leitura integral das Bíblias comentadas. Fonte canônica e limites:
[comentários das Bíblias privadas](../content/contextual-bible-reading.md).

Antes de priorizar o compositor:

1. Avançar na leitura contextual das Bíblias comentadas existentes, na ordem bíblica, com
   comentários diretos, fonte, página, evidência e Rastro; objetivo de alcance da Bíblia inteira,
   sem declarar cobertura individual onde a fonte não a oferece.
2. Medir separadamente páginas extraídas, páginas analisadas contextualmente, notas disponíveis,
   passagens cobertas e exceções pendentes. Quantidade de citações detectadas não mede exegese.
3. Ampliar traduções bíblicas realmente legíveis no Reader, não apenas PDFs na Biblioteca.
4. Consolidar classificação e vínculos das fontes para os filtros não simularem precisão.
5. Retomar esta proposta mediante nova solicitação, sem deslocar automaticamente o trabalho
   editorial para construir o compositor.

## Ampliação de traduções desejada

O usuário considera limitada a seleção atual e pediu opções como King James, Nova Almeida
Atualizada e outras edições Almeida, inclusive uma edição antiga a identificar precisamente.
Esses nomes são **desejos de aquisição/integração**, não declaração de instalação ou licença.

Cada entrada futura precisa identificar edição, idioma, revisão/ano, fonte digital, direitos,
integridade, esquema de versificação e cobertura. “King James” não identifica sozinha se o alvo
é o texto inglês histórico ou uma tradução portuguesa moderna. “Almeida antiga” também precisa
de identificação editorial, sem substituir silenciosamente uma revisão por outra.

Texto bíblico, notas de estudo e comentários são recursos distintos. Ter um PDF de uma Bíblia
de estudo não instala automaticamente sua tradução como corpus navegável; tampouco os direitos
de uma edição autorizam redistribuir suas notas ou outras revisões. Conteúdo privado permanece
privado conforme o modelo vigente, independentemente da configuração de leitura.

## Experiência proposta

- **Leitura direta:** abre uma edição instalada normalmente.
- **Compor leitura:** abre o mapa de configuração, com blocos disponíveis e conexões explicadas.
- **Prévia:** informa texto principal, fontes selecionadas, filtros, recursos ausentes e limites.
- **Abrir leitura:** apresenta o texto e os comentários pertinentes, sem exigir que o usuário
  continue olhando o fluxograma.
- **Salvar composição:** permite repetir a configuração em outras passagens, sem prometer que
  elas terão a mesma cobertura.

Exemplos de intenção, condicionados à disponibilidade real:

- Nova Almeida como texto principal + comentários associados à tradição ortodoxa.
- Texto principal escolhido + comparação separada de fontes católicas e ortodoxas.
- Bíblia de estudo Genebra + fontes de Tomás de Aquino + comparação com Septuaginta.

O último exemplo distingue o texto bíblico da edição Genebra de suas notas. Septuaginta ou
qualquer outro recurso ausente deve aparecer como indisponível, não como bloco funcional vazio.

## Blocos e semântica

| Tipo de bloco   | Responsabilidade                                              |
| --------------- | ------------------------------------------------------------- |
| Texto principal | Selecionar uma edição instalada e seu esquema de referência   |
| Fonte/autor     | Selecionar obras ou comentários efetivamente disponíveis      |
| Tradição        | Filtrar associações confessionais documentadas                |
| Escola          | Selecionar uma escola intelectual, como tomismo               |
| Método          | Selecionar análises classificadas por método                  |
| Assunto         | Priorizar questões como cristologia, sacramentos ou criação   |
| Texto paralelo  | Comparar outro texto mediante alinhamento explícito           |
| Apresentação    | Escolher comentário inline, painéis separados e leitura limpa |

Não confundir autor, tradição, escola, método e postura epistemológica. O perfil escolhido
descreve a sessão, não a identidade religiosa do usuário. Reutilizar a
[ontologia](theology-ontology.md) e as [perspectivas existentes](perspectives.md).

As conexões não são linhas sem significado: usam relações legíveis como **ler em**, **comentar
com**, **comparar com**, **filtrar por**, **priorizar** e **mostrar separadamente**.

Ao combinar tradições, oferecer operações distintas:

- Comparar: resultados separados por fonte/perspectiva; preferência inicial desta proposta.
- Interseção: somente conteúdo que satisfaça as associações documentadas exigidas.
- Prioridade: alterar a ordem, sem eliminar ou reclassificar silenciosamente as demais fontes.

A ordem visual dos blocos não substitui esses significados. Não produzir uma síntese consensual
artificial nem presumir a tradição/método de cada trecho apenas pelo nome do autor.

## Funcionamento determinístico proposto

O grafo é uma configuração declarativa, não um programa arbitrário. O fluxo conceitual é:

1. Validar tipos de bloco, conexões e recursos instalados.
2. Resolver a passagem na edição e versificação escolhidas.
3. Consultar relações existentes para versículo, perícope, capítulo, livro e assunto,
   identificando o alcance de cada resultado.
4. Aplicar filtros explícitos de fonte e perspectiva, respeitando direitos e revisão.
5. Ordenar resultados de modo previsível e carregar somente o necessário.
6. Exibir comentário direto com atribuição e link sublinhado à página/unidade de origem.
7. Explicar no Rastro por que cada conteúdo entrou naquela sessão.

Reutilizar repositories, serviços de passagem, evidências e Rastro; não criar banco paralelo.
Comparações entre esquemas exigem [crosswalk explícito](versification.md). A configuração muda
a consulta/apresentação, **não reescreve fontes, associações ou decisões editoriais**.

O compositor não traduz por conta própria. Se necessário, aciona a integração de tradução
existente quando ela suportar o idioma, preservando original e indicação de tradução automática.
Não implementar geração, avaliação de verdade ou reinterpretação teológica por LLM nesta função.

## Ausência de conteúdo e segurança

- Combinar blocos não cria comentários inexistentes nem torna uma citação em exegese.
- Sem associação disponível, informar a lacuna e oferecer ampliação explícita de alcance/filtro.
- Nunca ampliar de versículo para tema, trocar fonte ou substituir edição silenciosamente.
- Conteúdo de fontes discordantes permanece identificado e separado.
- Fontes sem classificação suficiente não recebem rótulos confessionais inventados.
- Sem SQL/código executável nos blocos, ciclos de execução ou escrita no acervo para “adaptá-lo”.
- Configurações devem ser validadas e versionáveis; referências a recursos removidos devem
  gerar aviso recuperável, não tela quebrada ou substituição automática.
- Não abrir toda a biblioteca para montar a prévia; consultar índices e carregar sob demanda.

## Critérios para uma entrega futura

- Leitura direta preservada e composição opcional utilizável por teclado e em telas menores.
- Exemplos usam recursos reais; indisponibilidade e lacunas são honestas e visíveis.
- Seleções e conexões produzem consultas reproduzíveis, sem LLM ou mistura de perspectivas.
- Cada comentário mantém fonte, página, alcance, revisão e justificativa consultável no Rastro.
- Configurações salvas não alteram o acervo e sobrevivem à reabertura do workspace.
- Testes cobrem filtros, conflitos, ausência de cobertura, versificação e recursos removidos.

Este documento registra intenção de produto e restrições, **não uma funcionalidade entregue**.
