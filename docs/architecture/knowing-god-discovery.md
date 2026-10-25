# Conhecer para amar — primeiro percurso Android

## Recorte

Estudos Android preserva a árvore visual e passa a oferecer uma próxima descoberta,
com a trilha horizontal e os outros estudos recolhidos. Não altera a árvore web,
Escrituras, Biblioteca, Rastro, Áudio ou suas formas independentes de acesso.

O percurso introdutório tem seis módulos, 30 seções e 4.424 palavras de
exposição original em português: busca, Deus de Israel, Jesus, cruz, ressurreição
e vida cristã. Cada módulo distingue introdução, conceito, exemplo de observação,
discussão e conclusão, seguido por leituras e síntese. Não representa formação
teológica completa nem conteúdo submetido a revisão acadêmica humana.

Currículo: `src/lib/content/study-courses/knowing-god.ts`. O gerador
`npm run mobile:labels` o incorpora no asset editorial `reading-labels.json`.
O APK pode entregá-lo sem reconstruir, transferir ou reimportar PDFs e corpora.
O conteúdo fica disponível offline; fontes externas exigem navegador/rede.
O consumidor web deste novo currículo ainda não foi implementado.

## Fontes e leituras

- As dez unidades bíblicas usam IDs reais dos livros e intervalos explícitos.
  O botão transmite o intervalo ao leitor, que abre o capítulo na primeira
  referência e mantém o contexto completo. A retomada registra o versículo atual,
  conforme o leitor existente. A escolha segue o catálogo de leitura, incluindo
  a preferência existente pela Bíblia Livre em português.
- `StudyReadings` continua consultando os recortes e as fontes realmente instaladas.
  Resultados de busca e apoio à área preservam seus rótulos; não são convertidos
  automaticamente em bibliografia curada de cada afirmação editorial.
- Tomás de Aquino: [Suma, I–II, q. 27, a. 2](https://www.newadvent.org/summa/2027.htm#article2).
- Agostinho: [Confissões I.1](https://www.newadvent.org/fathers/110101.htm).
- Atanásio: [Sobre a encarnação §§ 1–3](https://www.newadvent.org/fathers/2802.htm).

Essas fontes primárias foram consultadas em traduções inglesas históricas. Os
textos didáticos são exposição editorial, não transcrições ou traduções literais.
A interface identifica a perspectiva das fontes. Não há nova seleção de vídeos;
o consumidor de vídeos dos cursos anteriores continua disponível.

## Progressão e conservação de dados

Conclusão continua usando `CoursePolicy`, a tabela pessoal `course_progress` e
as regras existentes: confirmar aula/passagens, resposta com pelo menos 80
caracteres e critérios de revisão. O sistema verifica presença de trabalho,
não qualidade intelectual, adesão confessional ou intensidade da fé.

Os seis módulos liberam o nó inicial; depois cada guia de um ramo libera seus
filhos conforme as conexões já existentes no mapa. Concluir o guia exige todas
as suas etapas registradas. Tocar num ponto bloqueado mostra o pré-requisito;
pedidos diretos de um guia também passam pela verificação. Curso e conceitos
anteriores permanecem revisáveis. Conclusões antigas do guia inicial e dos
conceitos continuam reconhecidas; nenhum progresso anterior é apagado para
forçar a realização do novo percurso. Cursos independentes e aulas de consulta
continuam em Explorar outros estudos.

O caderno reutiliza notas com referência ao curso/módulo; a resposta da atividade
permanece no progresso do curso. Não há migração, banco paralelo, cópia do acervo,
nova dependência ou serviço de IA. Progresso pessoal é local ao aparelho.

## Apresentação

Uma próxima etapa em destaque, com título serifado e metadados menores. Conceito
e discussão usam o corpo de leitura; observação e conclusão têm superfícies
distintas do tema. Trilha, árvore, revisão e bloqueio têm indicação textual além
da cor. As opções de aparência e movimento existentes continuam respeitadas.
