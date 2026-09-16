import { z } from "zod";
import { TextAnchorSchema } from "./text-identity";
import { SourceLocatorSchema } from "./bibliography";

export const ResearchLinkSchema = z
  .object({
    targetKind: z.enum([
      "passage",
      "source",
      "citation",
      "claim",
      "argument",
      "theory",
      "note",
      "study",
      "research-question",
    ]),
    targetId: z.string().min(1).optional(),
    anchor: TextAnchorSchema.optional(),
    locator: SourceLocatorSchema.optional(),
  })
  .refine(
    (value) => value.targetId || value.anchor || value.locator,
    "Research link requires a target.",
  );

export const ResearchNoteSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  content: z.string(),
  format: z.enum(["plain", "markdown"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  links: z.array(ResearchLinkSchema).default([]),
  tags: z.array(z.string().min(1)).default([]),
});

export const ResearchQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  status: z.enum(["open", "investigating", "provisional", "answered", "archived"]),
  description: z.string().optional(),
  studyId: z.string().optional(),
  links: z.array(ResearchLinkSchema).default([]),
  provisionalConclusion: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const AnnotationSchema = z.object({
  id: z.string().min(1),
  body: z.string(),
  target: ResearchLinkSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const HighlightSchema = z.object({
  id: z.string().min(1),
  target: ResearchLinkSchema,
  styleToken: z.string().min(1),
  noteId: z.string().optional(),
  createdAt: z.string().datetime(),
});

export const BookmarkSchema = z.object({
  id: z.string().min(1),
  target: ResearchLinkSchema,
  label: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type ResearchLink = z.infer<typeof ResearchLinkSchema>;
export type ResearchNote = z.infer<typeof ResearchNoteSchema>;
export type ResearchQuestion = z.infer<typeof ResearchQuestionSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type Highlight = z.infer<typeof HighlightSchema>;
export type Bookmark = z.infer<typeof BookmarkSchema>;
