import type { StudyFoundation, FoundationSource } from "../../domain/study-foundation";

const source = (
  title: string,
  url: string,
  locator: string,
  perspective: string,
  supports: string,
  limit: string,
): FoundationSource => ({ title, url, locator, perspective, supports, limit });
const bible = (
  title: string,
  book: string,
  chapter: number,
  locator: string,
  supports: string,
): FoundationSource =>
  source(
    title,
    `https://www.stepbible.org/?q=reference%3D${book}.${chapter}`,
    locator,
    "Texto bíblico; comparar edição e contexto.",
    supports,
    "O texto documenta a afirmação de seu autor. Sua interpretação e avaliação histórica exigem argumentos adicionais.",
  );

export const KNOWING_GOD_FOUNDATIONS: Readonly<Record<string, readonly StudyFoundation[]>> = {
  buscar: [
    {
      claim: "Conhecer parcialmente e compreender exaustivamente são operações diferentes.",
      area: "Filosofia",
      status: "Argumento",
      basis:
        "O módulo apresenta uma distinção da tradição escolástica; não a trata como resultado experimental ou posição de todos os cristãos.",
      sources: [
        source(
          "Tomás de Aquino — Suma Teológica",
          "https://www.newadvent.org/summa/1012.htm",
          "I, q.12, a.7 e a.12–13",
          "Escolástica latina; tradução inglesa histórica.",
          "Distingue compreensão de Deus, conhecimento pela razão e conhecimento pela graça.",
          "A conclusão depende do argumento metafísico e teológico do autor; não constitui demonstração empírica.",
        ),
        source(
          "Tomás de Aquino — causas do amor",
          "https://www.newadvent.org/summa/2027.htm#article2",
          "I–II, q.27, a.2",
          "Antropologia filosófica tomista.",
          "Examina o papel de alguma apreensão do bem no amor.",
          "Não afirma que seja necessário dominar toda a teologia antes de começar a amar ou buscar Deus.",
        ),
      ],
      alternatives:
        "Outras epistemologias religiosas organizam de modo diferente confiança, experiência, testemunho e razão. A aula descreve a contribuição tomista, sem apresentá-la como consenso universal.",
    },
  ],
  israel: [
    {
      claim: "Em Êxodo 3, a apresentação de Deus está ligada a memória, libertação e missão.",
      area: "Leitura textual",
      status: "Interpretação",
      basis:
        "A relação é construída pela sequência narrativa, não pela etimologia isolada de uma palavra.",
      sources: [
        bible(
          "Êxodo — chamado de Moisés",
          "Exod",
          3,
          "Êxodo 3:7–15; comparar 3:12 e 3:14–15",
          "Permite observar sofrimento, envio, promessa de presença e referência aos antepassados.",
        ),
        bible(
          "Deuteronômio — confissão e memória",
          "Deut",
          6,
          "Deuteronômio 6:4–9",
          "Relaciona a confissão sobre Deus a ensino, memória e prática.",
        ),
      ],
      alternatives:
        "A tradução de Êxodo 3:14 e sua relação com o nome divino têm leituras diferentes. A conexão com uma metafísica do ser é um desenvolvimento interpretativo, não uma tradução automaticamente obrigatória.",
    },
  ],
  jesus: [
    {
      claim: "Os Evangelhos apresentam a identidade de Jesus por estratégias literárias distintas.",
      area: "Leitura textual",
      status: "Interpretação",
      basis:
        "A comparação conserva a pergunta e o contexto de cada unidade, antes de construir uma síntese cristológica.",
      sources: [
        bible(
          "Marcos — identidade e discipulado",
          "Mark",
          8,
          "Marcos 8:27–35",
          "Articula a pergunta sobre identidade, o anúncio do sofrimento e o chamado ao discipulado.",
        ),
        bible(
          "João — prólogo",
          "John",
          1,
          "João 1:1–18",
          "Apresenta Palavra, criação, carne e revelação em uma abertura teológica.",
        ),
      ],
      alternatives:
        "A leitura dessas unidades por categorias de pessoa e natureza pertence à recepção doutrinal. Reconhecer essa recepção não dispensa estudar o sentido dos termos em cada documento.",
    },
    {
      claim: "Atanásio relaciona criação pelo Verbo e salvação na encarnação.",
      area: "Teologia",
      status: "Argumento",
      basis: "Trata-se da exposição de um autor cristão antigo, identificada como tal.",
      sources: [
        source(
          "Atanásio — Sobre a encarnação",
          "https://www.newadvent.org/fathers/2802.htm",
          "§§1–3",
          "Tratado apologético cristão antigo; tradução inglesa histórica.",
          "Expõe a relação entre o Verbo criador e a renovação da criação.",
          "Não representa todas as cristologias nem comprovação independente de todas as afirmações religiosas.",
        ),
      ],
      alternatives:
        "Comparar a formulação do autor com os relatos bíblicos e com outras tradições cristológicas; não confundir tratado apologético e descrição histórica neutra.",
    },
  ],
  cruz: [
    {
      claim:
        "Relato da execução, interpretação da salvação e aplicação ética exigem argumentos distintos.",
      area: "Teologia",
      status: "Interpretação",
      basis: "A aula distingue a narrativa evangélica da elaboração de modelos de expiação.",
      sources: [
        bible(
          "Marcos — paixão",
          "Mark",
          15,
          "Marcos 15:21–39",
          "Documenta a forma como o Evangelho narra a crucificação.",
        ),
        bible(
          "Paulo — anúncio da cruz",
          "1Cor",
          1,
          "1 Coríntios 1:18–25",
          "Mostra uma interpretação da cruz no argumento sobre poder e sabedoria.",
        ),
      ],
      alternatives:
        "Modelos de vitória, substituição e transformação não são intercambiáveis. Uma avaliação deve examinar as premissas e os textos usados por cada autor, sem presumir concordância entre tradições.",
    },
    {
      claim:
        "Um objeto relacionado ao contexto de Pilatos não comprova sozinho o significado teológico da crucificação.",
      area: "Arqueologia",
      status: "Registro material",
      basis:
        "A documentação material pode iluminar o contexto histórico; não transforma uma interpretação da salvação em conclusão arqueológica.",
      sources: [
        source(
          "The Israel Museum — The Cradle of Christianity",
          "https://www.imj.org.il/en/exhibitions/cradle-christianity",
          "Apresentação da exposição; referência à inscrição com o nome de Pôncio Pilatos",
          "Documentação museológica de exposição.",
          "Identifica um testemunho material relacionado à figura de Pilatos.",
          "A página não demonstra, por si, todos os detalhes do processo de Jesus nem uma doutrina de expiação.",
        ),
      ],
      alternatives:
        "Distinguir objeto, leitura da inscrição, reconstrução histórica e interpretação religiosa. A referência é contextual; não é uma prova arqueológica da doutrina.",
    },
  ],
  ressurreicao: [
    {
      claim: "A ressurreição tem função estrutural no argumento de 1 Coríntios 15.",
      area: "Leitura textual",
      status: "Testemunho textual",
      basis:
        "É possível examinar a função da afirmação numa fonte sem apresentar essa análise como prova automática de sua verdade histórica.",
      sources: [
        bible(
          "Paulo — ressurreição",
          "1Cor",
          15,
          "1 Coríntios 15:1–28 e 15:35–58",
          "Permite acompanhar tradição recebida, testemunhas e consequências argumentadas.",
        ),
        bible(
          "João — encontros e testemunho",
          "John",
          20,
          "João 20:19–31",
          "Apresenta encontros e a relação entre testemunho, fé e finalidade narrativa.",
        ),
      ],
      alternatives:
        "Avaliação histórica dos testemunhos, interpretação literária e adesão de fé são tarefas relacionadas, mas não equivalentes. Nenhuma delas é simulada como resultado de um teste do aplicativo.",
    },
  ],
  viver: [
    {
      claim: "No texto de Marcos, amor a Deus e ao próximo são apresentados em relação.",
      area: "Leitura textual",
      status: "Testemunho textual",
      basis:
        "A aula parte da unidade discursiva; aplicações contemporâneas permanecem identificadas como aplicações.",
      sources: [
        bible(
          "Marcos — mandamentos",
          "Mark",
          12,
          "Marcos 12:28–34",
          "Permite observar pergunta, resposta e relação entre os mandamentos.",
        ),
        source(
          "Tomás de Aquino — objeto da caridade",
          "https://www.newadvent.org/summa/3025.htm",
          "II–II, q.25, a.1",
          "Teologia escolástica cristã latina; tradução inglesa histórica.",
          "Argumenta sobre a relação entre caridade para com Deus e para com o próximo.",
          "A elaboração tomista é uma interpretação teológica específica, não a única linguagem cristã sobre o amor.",
        ),
      ],
      alternatives:
        "Comparar como diferentes tradições relacionam graça, virtude e prática. Compreender uma posição, concordar com ela e praticá-la não são o mesmo resultado.",
    },
  ],
};
