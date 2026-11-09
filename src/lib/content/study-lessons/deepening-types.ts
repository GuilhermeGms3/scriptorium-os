/** Original teaching material, separate from quotations and documentary evidence. */
export interface DeepStudy {
  analysis: string;
  caseStudy: string;
  reflection: string;
}
export const deepStudy = (analysis: string, caseStudy: string, reflection: string): DeepStudy => ({ analysis, caseStudy, reflection });
