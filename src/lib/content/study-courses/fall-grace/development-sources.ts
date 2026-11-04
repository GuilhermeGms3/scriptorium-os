import type { CourseReference } from "../../../domain/study-course";

/** Checked primary texts and explicitly identified institutional self-descriptions. */
export const DEVELOPMENT_SOURCES = {
  freedom: {
    title: "Tomás de Aquino — escolha e liberdade",
    url: "https://www.newadvent.org/summa/2013.htm",
    perspective:
      "Suma Teológica I–II, q.13; deliberação, vontade e escolha, em tradução histórica inglesa.",
  },
  sacredDoctrine: {
    title: "Tomás de Aquino — razão e doutrina sagrada",
    url: "https://www.newadvent.org/summa/1001.htm",
    perspective: "Suma Teológica I, q.1; recorte escolástico da relação entre razão e revelação.",
  },
  incarnation: {
    title: "Tomás de Aquino — conveniência da encarnação",
    url: "https://www.newadvent.org/summa/4001.htm",
    perspective: "Suma Teológica III, q.1; iniciativa divina, conveniência e necessidade.",
  },
  union: {
    title: "Tomás de Aquino — união do Verbo encarnado",
    url: "https://www.newadvent.org/summa/4002.htm",
    perspective:
      "Suma Teológica III, q.2; pessoa, natureza e união, na tradição calcedoniana latina.",
  },
  christWills: {
    title: "Tomás de Aquino — as vontades de Cristo",
    url: "https://www.newadvent.org/summa/4018.htm",
    perspective:
      "Suma Teológica III, q.18; distinção de vontades e sua relação com a humanidade real.",
  },
  passion: {
    title: "Tomás de Aquino — paixão de Cristo",
    url: "https://www.newadvent.org/summa/4046.htm",
    perspective: "Suma Teológica III, q.46; liberdade, sofrimento e conveniência da paixão.",
  },
  passionEffect: {
    title: "Tomás de Aquino — eficácia da paixão",
    url: "https://www.newadvent.org/summa/4048.htm",
    perspective:
      "Suma Teológica III, q.48; mérito, satisfação, sacrifício e redenção, sem equivalência automática a modelos posteriores.",
  },
  risenBody: {
    title: "Tomás de Aquino — corpo ressuscitado",
    url: "https://www.newadvent.org/summa/4054.htm",
    perspective: "Suma Teológica III, q.54; realidade e condição glorificada do corpo de Cristo.",
  },
  justification: {
    title: "Tomás de Aquino — justificação",
    url: "https://www.newadvent.org/summa/2113.htm",
    perspective:
      "Suma Teológica I–II, q.113; articulação escolástica de graça, vontade e remissão.",
  },
  predestination: {
    title: "Tomás de Aquino — predestinação",
    url: "https://www.newadvent.org/summa/1023.htm",
    perspective: "Suma Teológica I, q.23; relação entre providência, eleição, meios e méritos.",
  },
  concordWill: {
    title: "Fórmula de Concórdia — livre-arbítrio",
    url: "https://thebookofconcord.org/formula-of-concord-solid-declaration/article-ii/",
    perspective:
      "Declaração Sólida II; fonte confessional luterana que delimita a controvérsia sobre conversão.",
  },
  concordElection: {
    title: "Fórmula de Concórdia — eleição",
    url: "https://thebookofconcord.org/formula-of-concord-solid-declaration/article-xi/",
    perspective:
      "Declaração Sólida XI; presciência, eleição e orientação da consciência à promessa.",
  },
  dort: {
    title: "Cânones de Dort",
    url: "https://www.rca.org/about/theology/creeds-and-confessions/canons-of-dort/",
    perspective:
      "Documento confessional reformado de 1618–1619, publicado pela Reformed Church in America.",
  },
  baptistConfession: {
    title: "Confissão Batista de 1689 — batismo",
    url: "https://founders.org/library/chapter-29-baptism/",
    perspective:
      "Capítulo 29, versão inglesa modernizada publicada por Founders Ministries; comparação confessional delimitada.",
  },
  concordHistory: {
    title: "LCMS — formação da Fórmula de Concórdia",
    url: "https://www.lcms.org/resources/post/how-the-formula-of-concord-came-to-be",
    perspective:
      "Autodescrição histórica institucional luterana; não levantamento independente de todas as igrejas atuais.",
  },
  anglicanReception: {
    title: "Igreja Anglicana do Canadá — Artigos de Religião",
    url: "https://www.anglican.ca/resources/articles-of-religion/",
    perspective:
      "Texto dos artigos e apresentação institucional sobre seu patrimônio e recepção; não autoridade uniforme de toda a Comunhão.",
  },
  anglicanTraditions: {
    title: "Diocese de Londres — diversidade de tradições",
    url: "https://www.london.anglican.org/about-us/the-diocese-of-london/new-york/",
    perspective:
      "Autodescrição institucional da relação Londres–Nova York; reconhece diversidade e não uniformidade interna de cada corrente.",
  },
} satisfies Record<string, Omit<CourseReference, "id">>;
