# Scriptorium OS

SCRIPTORIUM — OPEN BIBLICAL KNOWLEDGE SYSTEM

Quero criar a fundação de um projeto open source chamado provisoriamente Scriptorium.

IMPORTANTE: não trate este projeto como um simples aplicativo de leitura da Bíblia, um devocional, um chatbot religioso ou um clone visual do YouVersion.

O Scriptorium deve ser concebido como um:

Open Biblical Knowledge System / Biblical Knowledge OS

Um ambiente avançado de leitura, pesquisa, estudo, biblioteca e exploração do conhecimento relacionado à Bíblia.

A Bíblia é o eixo central do sistema, mas ao redor dela existirão futuramente:

diferentes traduções e edições;

hebraico bíblico;

aramaico;

grego;

Septuaginta;

análise morfológica;

análise lexical;

sintaxe;

Strong;

interlinear;

variantes textuais;

manuscritos;

crítica textual;

hermenêutica;

exegese;

contexto literário;

contexto histórico;

arqueologia;

geografia;

linhas do tempo;

pessoas;

povos;

impérios;

acontecimentos históricos;

conceitos;

temas;

referências cruzadas;

literatura judaica antiga;

patrística;

deuterocanônicos;

apócrifos;

Nag Hammadi;

literatura cristã antiga;

livros;

artigos acadêmicos;

PDFs;

EPUBs;

anotações;

estudos pessoais;

trilhas de aprendizado;

exercícios;

IA local;

RAG;

Knowledge Graph;

Knowledge Bridges.

Não tente implementar todo esse conteúdo nesta primeira etapa.

OBJETIVO DESTA PRIMEIRA FASE

Quero construir uma fundação de produto extremamente bem feita, com:

design system;

arquitetura frontend;

shell principal;

navegação;

leitor bíblico;

painel de análise;

biblioteca;

busca;

workspace de estudo;

representação inicial do Knowledge Graph;

dados demonstrativos;

responsividade;

estrutura preparada para expansão futura.

Esta primeira versão deve ser funcional como protótipo navegável, mas NÃO deve fingir possuir bases acadêmicas ou textos que ainda não foram importados.

Sempre que precisar de dados demonstrativos, utilize fixtures explicitamente marcadas no código como DEMO/SEED DATA.

1. PRINCÍPIOS DO PRODUTO

A arquitetura e UX devem seguir estes princípios:

Open Source

O sistema futuramente será publicado no GitHub.

Evite soluções excessivamente proprietárias ou impossíveis de substituir.

Organize o código para permitir continuidade fora do Lovable.

Local First

No futuro, o aplicativo deverá funcionar:

sem conta;

offline;

como aplicativo desktop;

como aplicativo mobile;

como PWA;

como SaaS opcional.

Portanto:

não faça autenticação obrigatória para utilizar o sistema.

A conta deverá futuramente servir principalmente para:

sincronização;

backup;

colaboração;

serviços em nuvem.

A experiência principal deve ser compatível conceitualmente com modo local.

Source First

Informações acadêmicas, históricas, linguísticas ou teológicas futuramente deverão ser rastreáveis até suas fontes.

Evite arquitetar componentes onde simplesmente exista:

"A IA diz..."

Prepare a UI para apresentar:

fontes;

referências;

citações;

proveniência;

classificação da evidência.

Tradition Aware

Não trate uma tradição religiosa específica como universal.

O sistema futuramente deverá distinguir:

cânon protestante;

cânon católico;

tradições ortodoxas;

Tanakh;

Septuaginta;

outras coleções históricas.

Também não trate automaticamente:

Nag Hammadi;

Patrística;

literatura judaica;

apócrifos;

deuterocanônicos;

como se todos pertencessem ao mesmo cânon.

A classificação deverá depender do corpus, coleção ou tradição.

AI Assisted

IA será uma ferramenta de pesquisa, e não a autoridade do sistema.

Prepare o produto para futuramente utilizar:

Ollama;

modelos locais;

OpenAI-compatible providers;

RAG;

embeddings;

biblioteca do usuário;

fontes acadêmicas;

Knowledge Graph.

Não implemente dependência obrigatória de IA agora.

2. IDENTIDADE VISUAL

Eu NÃO quero aparência de:

SaaS corporativo genérico;

dashboard administrativo;

aplicativo de igreja;

aplicativo infantil;

landing page religiosa;

YouVersion clone;

cards gigantes ocupando toda a tela;

gradientes exagerados;

excesso de ícones;

visual "AI startup".

Quero que o produto pareça uma mistura conceitual de:

ferramenta acadêmica;

biblioteca digital;

IDE;

Obsidian;

Zotero;

Logos;

editor de conhecimento;

workstation de pesquisa.

A sensação deve ser:

um ambiente de estudo sério no qual o usuário pode permanecer durante horas.

Direção visual

Use:

layout denso mas organizado;

excelente hierarquia;

divisores discretos;

painéis redimensionáveis quando apropriado;

abas;

sidebars;

toolbars;

command palette;

inspector lateral;

breadcrumbs discretos;

modais somente quando realmente necessários.

Evite transformar cada informação em um card.

Tipografia

Utilize dois papéis tipográficos:

Interface

fonte sans-serif moderna;

compacta;

excelente legibilidade.

Texto bíblico/livros

fonte serifada;

confortável para leitura prolongada;

aparência editorial/acadêmica.

Para grego e hebraico, escolha fontes com excelente suporte Unicode.

3. DARK MODE E LIGHT MODE

Implemente ambos desde agora.

Light

Inspirado em:

papel;

biblioteca;

livro acadêmico;

tons neutros quentes;

contraste confortável.

Dark

Inspirado em:

IDE;

software científico;

estação de pesquisa.

Evite preto puro dominante.

O modo escuro deve continuar confortável para leitura prolongada.

4. SHELL PRINCIPAL

Crie uma aplicação desktop-first, porém totalmente responsiva.

Estrutura principal:

┌─────────────────────────────────────────────────────────────────┐
│ SCRIPTORIUM     Search / Command                         ⌘ K    │
├──────────┬───────────────────────────────────┬──────────────────┤
│          │                                   │                  │
│ Sidebar  │          Workspace                │    Inspector     │
│          │                                   │                  │
│          │                                   │                  │
├──────────┴───────────────────────────────────┴──────────────────┤
│ contextual status / active resources                           │
└─────────────────────────────────────────────────────────────────┘


A navegação principal deve possuir:

Home

Scripture

Study

Library

Knowledge

Search

E uma área inferior para:

Downloads/Resources

Settings

Help/About

5. HOME

A Home NÃO deve parecer dashboard empresarial.

Ela deve funcionar como ponto de retomada do estudo.

Criar seções como:

Continue Reading

Exemplo:

João 1

Última posição de leitura.

Continue Studying

Exemplo:

O conceito de Logos em João

12 fontes vinculadas
4 notas
3 passagens

Recent Library

Mostrar alguns livros/documentos recentes.

Recent Notes

Anotações recentes.

Word of the Day

Exemplo demonstrativo:

λόγος

logos

lemma: λόγος

noun

Possíveis sentidos resumidos:

palavra

discurso

mensagem

Botão:

Explore word

Deixe claro no código que o conteúdo é demonstrativo.

6. SCRIPTURE READER

Este é o coração da primeira versão.

Criar rota semelhante a:

/scripture/john/1

Layout:

Books       Scripture                 Inspector
────────    ─────────────────────     ──────────────
Genesis     John 1                    λόγος
Exodus
...         In the beginning...       Lemma
John                                   Morphology
Romans      Ἐν ἀρχῇ ἦν ὁ λόγος...    Lexicon
                                       Occurrences
                                       Notes


Toolbar do leitor

Adicionar controles para:

livro;

capítulo;

tradução;

versões paralelas;

original;

interlinear;

notas;

referências cruzadas;

modo leitura.

7. TEXTOS PARA DEMONSTRAÇÃO

Nesta fase utilize apenas pequenas amostras de conteúdo cujo objetivo seja demonstrar UX.

Não crie uma Bíblia completa fictícia.

Crie algumas passagens demonstrativas claramente organizadas como fixtures.

Pode utilizar como referência de interface:

Genesis 1

Psalm 23

John 1

Romans 5

Mas não invente traduções protegidas por copyright.

Se não houver certeza sobre licença, utilize texto genérico/demonstrativo ou conteúdo identificado como placeholder.

8. MULTI-VERSION READING

Crie suporte visual inicial para:

Translation A
Translation B
Greek
Interlinear


O usuário deverá poder visualizar:

Single

uma versão.

Parallel

duas ou mais versões lado a lado.

Original

texto original em destaque.

Interlinear

estrutura visual palavra por palavra.

Não tente desenvolver um verdadeiro motor interlinear nesta etapa.

Implemente a arquitetura de componentes e dados demonstrativos.

9. WORD INSPECTOR

Ao clicar em uma palavra grega ou hebraica, abrir/preencher o Inspector lateral.

Exemplo:

λόγος

logos

Lemma
λόγος

Morphology
Noun · Nominative · Singular · Masculine

Gloss
word
speech
message

Occurrences
John
Romans
Hebrews

Sections
Lexicon
Morphology
Occurrences
Septuagint
Semantic Domain
Sources
Notes


Os dados desta fase podem ser demonstrativos.

Mas crie uma estrutura de tipos reutilizável.

10. PASSAGE INSPECTOR

Quando nenhuma palavra estiver selecionada, o painel direito deve funcionar como Passage Inspector.

Abas:

Overview

Cross References

Language

History

Literature

Notes

Sources

Por exemplo:

John 1:1

Literary context
Historical context
Key terms
Cross references
Personal notes
Sources


Não gere análises teológicas falsas.

Pode utilizar placeholders bem projetados.

11. STUDY WORKSPACE

Criar rota:

/study

O Study Workspace deve permitir imaginar estudos complexos.

Exemplo:

Study
The concept of Logos

OVERVIEW
PASSAGES
SOURCES
NOTES
CONCEPTS
TIMELINE


Criar estudo demonstrativo:

The concept of Logos in John

Elementos:

John 1:1

conceito Logos

notas;

palavras;

livros;

fontes;

conexões.

Permitir criar um novo Study Workspace.

Nesta primeira fase, persistência completa pode ser simples.

12. LIBRARY

Criar um módulo de biblioteca que lembre mais Zotero/Logos do que uma loja de livros.

Categorias:

Bibles

Commentaries

Dictionaries

Theology

History

Languages

Ancient Literature

Articles

Personal Documents

Interface:

LIBRARY

Collections        Resources
────────────       ──────────────────────────
All                SBL Greek New Testament
Bibles             Greek Lexicon
Languages          Church History
History            Personal PDF
...


Cada recurso deve poder possuir:

título;

autor;

tipo;

idioma;

ano;

publisher;

license;

source;

tags;

descrição;

disponibilidade local;

status de indexação.

13. IMPORT RESOURCE

Adicionar botão:

Import

Criar interface preparada para futuramente aceitar:

PDF;

EPUB;

SWORD Module;

Scriptorium Resource Package.

Nesta etapa o upload não precisa implementar parsing avançado.

Se implementar upload, trate-o apenas como infraestrutura inicial.

14. DISCOVER

Dentro da Library, criar uma aba:

Discover

Ela será futuramente utilizada para encontrar recursos externos legais.

Nesta fase mostrar interface demonstrativa com categorias:

Public Domain

Open Access

Bibles

Ancient Texts

Dictionaries

Academic Resources

Adicionar aviso visual discreto:

Availability and redistribution depend on each resource's license.

15. RESOURCE LICENSING

Isso é um requisito arquitetural importante.

Crie tipo/modelo semelhante a:

interface ResourceLicense {
  name: string;
  copyrightHolder?: string;
  redistributionAllowed: boolean;
  commercialUseAllowed?: boolean;
  attributionRequired?: boolean;
  attributionText?: string;
  sourceUrl?: string;
}


Todo recurso importável futuramente deverá poder possuir informações de licença.

16. KNOWLEDGE

Criar módulo:

/knowledge

Ele representa o começo do Knowledge Graph.

Não precisa utilizar banco de grafos agora.

Criar visualizações demonstrativas para entidades:

Person

Place

Event

Passage

Work

Concept

Word

Manuscript

Historical Source

Exemplo:

Jesus
 ├── Nazareth
 ├── Galilee
 ├── John
 ├── Peter
 └── Roman Judea


Outro:

John 1:1
 ├── λόγος
 ├── Genesis 1
 ├── Creation
 └── John


17. KNOWLEDGE BRIDGES

Crie o conceito visual de:

Knowledge Bridge

Uma Knowledge Bridge explica como duas entidades estão relacionadas.

Exemplo:

John 1:1
       ↓
     λόγος
       ↓
Greek Language
       ↓
Septuagint usage
       ↓
Genesis


Cada ligação deverá futuramente poder possuir:

relation;

description;

source;

confidence;

evidence type.

18. CLAIM / EVIDENCE MODEL

Prepare tipos TypeScript para uma futura arquitetura de conhecimento baseada em evidências.

Exemplo conceitual:

type EvidenceClassification =
  | "textual"
  | "historical"
  | "archaeological"
  | "linguistic"
  | "traditional"
  | "theological"
  | "scholarly-hypothesis";

interface KnowledgeClaim {
  id: string;
  proposition: string;
  classification: EvidenceClassification;
  sourceIds: string[];
  confidence?: number;
  traditionId?: string;
}


Isso ainda não precisa estar conectado a um backend complexo.

19. GLOBAL SEARCH

Criar busca global acessível por:

Ctrl/Cmd + K

Busca demonstrativa entre:

SCRIPTURE
John 1:1

WORDS
λόγος

LIBRARY
Greek Lexicon

PEOPLE
Paul

PLACES
Jerusalem

CONCEPTS
Kingdom of God

NOTES
My note about Romans


A busca deverá ser keyboard-first.

20. COMMAND PALETTE

Além da busca, permita comandos como:

Open Scripture

Open Library

New Study

Toggle Dark Mode

Open Knowledge

Search Library

Inspirar-se conceitualmente em IDEs e ferramentas como Obsidian.

21. NOTES

Criar sistema inicial de notas.

Permitir vincular uma nota a:

passagem;

palavra;

recurso;

conceito;

estudo.

Exemplo:

My note

Linked to:
John 1:1
λόγος
Study: Logos in John


22. SOURCES

Crie componente reutilizável:

SourceReference

Ele deverá futuramente ser utilizado em:

afirmações;

explicações;

IA;

história;

exegese;

Knowledge Graph.

Exemplo visual:

SOURCE

Author
Work
Edition
Page / location
Year

Open resource →


23. IA — SOMENTE PREPARAÇÃO

Não construa um chatbot central nesta fase.

Crie apenas uma área discreta chamada:

Research Assistant

Ela deve aparecer como ferramenta secundária.

Interface futura:

Ask about John 1:1...

Context:
✓ Current passage
✓ Selected resources
✓ Personal notes
○ Entire library

Provider:
Local model


Mostrar aviso:

AI-generated analysis must remain traceable to the sources used.

NÃO integrar APIs pagas automaticamente.

NÃO exigir nenhuma API key nesta primeira etapa.

24. CONFIGURAÇÕES

Criar Settings com:

Appearance

Light

Dark

System

Reading

font size;

line height;

paragraph/verse mode;

original language font.

Language

interface language.

Resources

installed resources;

storage.

AI

disabled;

local;

remote.

Mostrar integrações futuras:

Ollama

OpenAI-compatible

Mas apenas como UI/configuração inicial.

25. RESPONSIVIDADE

Desktop é o ambiente principal de pesquisa.

Mas tudo precisa funcionar em:

desktop;

tablet;

smartphone.

Mobile

Não tente colocar três painéis simultaneamente.

Transforme:

Sidebar
Workspace
Inspector


em navegação contextual.

No reader mobile:

Scripture


fica central.

Word/Passage Inspector deve abrir como bottom sheet ou página contextual.

Library e Search devem possuir experiência própria mobile.

26. COMPONENTIZAÇÃO

Não crie uma única página gigante.

Quero componentes reutilizáveis.

Exemplos conceituais:

AppShell
PrimarySidebar
WorkspaceTabs
InspectorPanel
ScriptureReader
ScriptureToolbar
Verse
OriginalLanguageToken
ParallelVersions
InterlinearView
WordInspector
PassageInspector
LibraryBrowser
ResourceRow
ResourceDetails
GlobalSearch
CommandPalette
StudyWorkspace
KnowledgeEntity
KnowledgeBridge
SourceReference
NoteEditor
ResearchAssistant


Organize por domínio/feature quando apropriado.

27. MODELO DE DOMÍNIO

Comece a criar tipos TypeScript separados da apresentação.

Conceitos importantes:

Corpus
CanonProfile
Work
Edition
Book
Passage
TextUnit
Token
Lemma
Morphology
Translation
ManuscriptWitness
TextualVariant

LibraryResource
ResourceLicense

Person
Place
Event
Concept
KnowledgeEntity
KnowledgeRelation
KnowledgeClaim

Study
StudyItem
Note
SourceReference


Não precisa implementar todos profundamente.

Quero que a arquitetura reconheça desde já que esses conceitos existirão.

28. NÃO MODELAR A BÍBLIA COMO APENAS BOOK/CHAPTER/VERSE/TEXT

Esse requisito é importante.

Book/chapter/verse pode existir para navegação, mas o domínio precisa estar preparado para:

diferentes versificações;

corpora;

edições;

línguas originais;

unidades textuais;

tokens;

variantes;

manuscritos.

Não crie decisões arquiteturais que impeçam isso futuramente.

29. DADOS / BACKEND NESTA ETAPA

Não tente colocar todas as Escrituras em um banco Supabase.

Não crie milhares de registros falsos.

Use fixtures pequenas para demonstrar o produto.

Se utilizar Supabase nesta fase, limite-o a dados naturalmente pertencentes ao usuário, como:

profile;

preferences;

notes;

studies;

library metadata.

A infraestrutura futura de corpora bíblicos será decidida separadamente.

O frontend deve acessar dados através de serviços/repositories, evitando componentes diretamente acoplados à origem dos dados.

Por exemplo:

ScriptureRepository
LibraryRepository
StudyRepository
KnowledgeRepository


30. ESTRUTURA PREPARADA PARA GITHUB

Este projeto será posteriormente sincronizado com GitHub e continuará sendo desenvolvido por outros agentes/desenvolvedores.

Priorize:

TypeScript;

código legível;

componentes pequenos;

organização por domínio;

baixo acoplamento;

nomes explícitos;

sem arquivos gigantes;

sem lógica de domínio espalhada na UI;

sem dependências desnecessárias;

sem dados hardcoded diretamente dentro dos componentes.

Mantenha fixtures, modelos, serviços e UI separados.

31. ACESSIBILIDADE

Desde agora:

navegação por teclado;

focus states;

contraste;

labels;

ARIA quando necessário;

tamanhos adequados de alvo no mobile;

suporte razoável a screen readers.

32. PÁGINAS QUE DEVEM EXISTIR AO FINAL DESTA FASE

Quero no mínimo:

/
 /scripture
 /scripture/john/1
 /study
 /study/logos-in-john
 /library
 /knowledge
 /search
 /settings
 /about


33. DADOS DEMONSTRATIVOS

Crie uma pequena base de demonstração coerente para que a interface não fique vazia.

Pode incluir:

Passagens

John 1

Genesis 1

Palavra

λόγος

Pessoas

Jesus

John

Paul

Lugares

Jerusalem

Galilee

Rome

Conceitos

Logos

Kingdom of God

Covenant

Estudo

The concept of Logos in John

Recursos

Alguns recursos fictícios ou claramente identificados como demonstrativos.

Não apresente conteúdo inventado como acadêmico ou histórico real.

34. EXPERIÊNCIA DE USUÁRIO PRINCIPAL

Ao terminar esta fase, eu quero conseguir executar este fluxo:

Home
 ↓
Continue Reading
 ↓
John 1
 ↓
clicar em λόγος
 ↓
Word Inspector
 ↓
ver lemma / morphology / occurrences
 ↓
abrir conceito Logos
 ↓
Knowledge
 ↓
adicionar ao Study
 ↓
Study Workspace
 ↓
criar uma nota
 ↓
abrir Library
 ↓
associar um recurso ao estudo


Esse fluxo deve parecer parte de um único sistema de conhecimento.

35. NÃO FAZER NESTA FASE

Não implementar agora:

banco completo de textos bíblicos;

scraping;

downloads não autorizados;

conteúdo protegido por copyright;

LLM real;

Ollama real;

embeddings;

vector database;

verdadeiro motor RAG;

parsing completo de PDF;

parsing completo de EPUB;

importador SWORD real;

crítica textual completa;

milhares de entidades históricas;

cursos completos;

sistema de pagamentos;

assinatura SaaS;

monetização.

Crie a arquitetura preparada para isso, não implementações falsas.

36. QUALIDADE DO DESIGN

Antes de considerar a tarefa terminada, revise visualmente TODAS as principais páginas.

Procure e corrija:

excesso de espaços vazios;

cards desnecessariamente grandes;

aparência genérica;

inconsistência de tipografia;

alinhamentos ruins;

painel lateral largo demais;

texto com baixa legibilidade;

overflow;

navegação mobile quebrada;

componentes repetidos;

informação sem hierarquia.

A interface precisa parecer um produto sério de pesquisa.

37. CRITÉRIOS DE ACEITAÇÃO

Considere esta primeira fase concluída somente quando:

o shell estiver consistente;

light/dark estiverem funcionando;

a aplicação for responsiva;

o reader estiver navegável;

versões paralelas estiverem representadas;

palavras originais puderem ser selecionadas;

o Word Inspector funcionar;

Passage Inspector existir;

Library estiver funcional como interface;

Study Workspace estiver navegável;

Knowledge estiver navegável;

Knowledge Bridges estiverem demonstrados;

notas puderem ser criadas ou simuladas de forma coerente;

Global Search existir;

Command Palette existir;

Settings existir;

componentes estiverem organizados;

domínio não estiver acoplado à UI;

fixtures estiverem separadas;

nenhuma tradução protegida tiver sido inserida sem autorização;

nenhuma análise acadêmica inventada estiver sendo apresentada como fato;

mobile estiver utilizável.

38. VISÃO FUTURA — NÃO IMPLEMENTAR AGORA

Mantenha estas extensões em mente ao tomar decisões arquiteturais:

Scripture Engine
Original Languages Engine
Versification Engine
Textual Criticism
Library Engine
Search Engine
Knowledge Graph
Knowledge Bridges
History Engine
Study Engine
Citation Engine
AI Engine
Local LLM
RAG
Semantic Search
Plugin System
Resource Packages
SWORD Importer
PDF/EPUB Importer
Sync Engine
Tauri Desktop/Mobile
PWA
SaaS


A aplicação criada aqui será a interface/fundação inicial desse ecossistema.

39. PRINCÍPIO FINAL

Sempre que houver dúvida entre:

entregar muitas funcionalidades superficiais

e

criar uma fundação menor, coerente e extensível

escolha a segunda opção.

O objetivo desta fase não é impressionar com quantidade de funcionalidades.

O objetivo é estabelecer a identidade e a fundação de um software open source que possa crescer durante anos.

Construa agora essa primeira versão navegável do Scriptorium — Open Biblical Knowledge System.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5b2a3da3-369f-43fd-95bb-d9ec64de7d61).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
