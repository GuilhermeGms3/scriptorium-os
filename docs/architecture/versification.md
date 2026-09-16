# Versificação e crosswalk

`VersificationScheme` é uma entidade versionável e aberta. O endereço canônico interno atual usa `scriptorium-bcv-1`; os endereços recebidos dos datasets conservam o esquema declarado pela fonte.

Sobreposição direta só existe quando obra e esquema são iguais. Endereços de esquemas diferentes exigem um `CrosswalkRelation` explícito. A relação possui grupos de âncoras de origem e destino e representa 1:1, 1:N, N:1 e N:M, com tipos como `equivalent`, `partial`, `split`, `merged`, `reordered`, `approximate` e `no-equivalent`.

`anchorsOverlapDirectly` não converte silenciosamente. `anchorsOverlapViaCrosswalk` consulta relações fornecidas e respeita ausência de equivalente. Confiança, quando presente, descreve somente a documentação técnica do mapeamento.

Veja também [ADR 0002](../adr/0002-explicit-versification-crosswalk.md).
