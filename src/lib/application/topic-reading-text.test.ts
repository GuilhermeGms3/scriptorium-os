import { describe, expect, it, vi } from "vitest";
import { loadTopicReadingText } from "./topic-reading-text";

describe("Texto original nas leituras do tema", () => {
  it("carrega a página física exata, convertendo a referência de um para zero", async () => {
    const dependencies = {
      page: vi.fn(async () => ({ text: "Conteúdo integral da página, além do snippet." })),
      unit: vi.fn(async () => null),
    };
    expect(
      await loadTopicReadingText(
        { kind: "private-document", documentId: "meu-livro", page: 28, title: "Livro" },
        dependencies,
      ),
    ).toBe("Conteúdo integral da página, além do snippet.");
    expect(dependencies.page).toHaveBeenCalledWith("meu-livro", 27);
    expect(dependencies.unit).not.toHaveBeenCalled();
  });
  it("mantém a unidade e a obra originais e não substitui âncoras ausentes por trechos de busca", async () => {
    const dependencies = {
      page: vi.fn(async () => null),
      unit: vi.fn(async () => ({ text: "Unidade completa" })),
    };
    expect(
      await loadTopicReadingText(
        { kind: "primary-text", workId: "obra", unitId: "unidade", title: "Fonte" },
        dependencies,
      ),
    ).toBe("Unidade completa");
    expect(dependencies.unit).toHaveBeenCalledWith("obra", "unidade");
    await expect(
      loadTopicReadingText(
        { kind: "private-document", documentId: "ausente", page: 1, title: "Fonte" },
        dependencies,
      ),
    ).rejects.toThrow("não está disponível");
    expect(
      await loadTopicReadingText(
        { kind: "primary-text", workId: "obra", title: "Obra sem seção" },
        dependencies,
      ),
    ).toBeNull();
    expect(dependencies.unit).toHaveBeenCalledTimes(1);
  });
});
