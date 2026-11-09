# Piloto para uma igreja: distribuição, atualizações e autorização

Proposta de 02/11/2026. **Não implementada nem ativada.** Não há conta Firebase,
servidor de licenças ou bloqueio remoto configurado por esta entrega.

## Experiência proposta

Começar com uma igreja, 5–15 participantes convidados e 30 dias de teste.
Cada participante entra com sua própria conta, ligada à igreja; não compartilhar
uma senha entre todos. Proposta inicial: até dois aparelhos por pessoa.

O responsável pode convidar participantes, prolongar o teste, suspender uma conta
ou encerrar o piloto. A tela do aplicativo informa a validade e a última verificação.
Notas pessoais continuam locais; ao encerrar o teste, manter consulta/exportação
das próprias notas disponível, sem apagar o acervo ou estudos silenciosamente.

## Recomendação: Firebase para o piloto

| Responsabilidade | Solução proposta | Limite que precisa ficar claro |
| --- | --- | --- |
| Convites e novas versões Android | Firebase App Distribution, grupo da igreja | Distribuir APK não concede nem revoga uso do aplicativo instalado |
| Identidade | Firebase Authentication | Login não é licença; desativar usuário exige tratamento na aplicação e no servidor |
| Permissão | Serviço autenticado + cadastro de igrejas, membros e dispositivos | A autorização é decidida no servidor, nunca por um booleano editável no cliente |
| Uso offline | Autorização assinada, com expiração e vínculo à instalação | Revogação offline tem atraso; não há bloqueio remoto instantâneo sem rede |
| Novidades, avisos e configuração | Remote Config opcional | Não usar como mecanismo exclusivo de autorização ou guardar segredos nele |
| Acervo e patches | Download protegido de pacotes, reaproveitando o instalador existente | Hash detecta corrupção; antes de atualização remota, adicionar autenticação de origem por assinatura |

A documentação do [App Distribution](https://firebase.google.com/docs/app-distribution/android/distribute-console)
descreve convites e distribuição; as builds ficam disponíveis por 150 dias.
Esse prazo é de disponibilidade da distribuição, não uma licença de uso do APK.
As atualizações são oferecidas ao participante; o Android exige a instalação/aceite
normal. Não prometer instalação silenciosa em aparelhos comuns.

O [gerenciamento de sessões do Firebase Auth](https://firebase.google.com/docs/auth/admin/manage-sessions)
permite revogar refresh tokens; ID tokens têm duração de uma hora e sua revogação
precisa ser verificada. Para o Scriptorium, o prazo da permissão offline é um
contrato separado, não o mesmo prazo do token de login.

### Política inicial sugerida

- Primeira ativação online; teste de 30 dias e renovação de permissão a cada 24 horas,
  quando houver conexão. Permissão offline válida por até 72 horas após a emissão,
  sempre limitada também à data final do teste.
- Ao abrir e ao voltar ao aplicativo, verificar localmente a assinatura e a validade;
  consultar o serviço quando possível e repetir a consulta enquanto estiver em uso.
- Suspensão confirmada online bloqueia os recursos licenciados imediatamente nessa
  consulta. Sem rede, pode persistir até o vencimento da permissão já emitida.
- Ao vencer sem rede, explicar como reconectar; não confundir indisponibilidade
  temporária do servidor com exclusão da conta. Preservar/exportar notas próprias.
- Detectar retrocesso suspeito de relógio e solicitar validação online. Isso reduz
  abuso, mas um APK alterado ou arquivos já copiados não podem ser controlados de
  forma absoluta pelo licenciamento do aplicativo.

## Aplicativo e acervo têm versões distintas

Manter o mesmo applicationId e a mesma chave de assinatura para atualizar por cima,
sem desinstalar. Criar assinatura release, guardar a chave fora do Git e do APK e
proteger seu uso no CI. O APK atual de desenvolvimento não é o canal comercial final.

Publicar um manifesto autenticado por canal (piloto/estável), com versão do aplicativo,
compatibilidade mínima, versão do acervo, tamanho e hashes. O participante vê o que
será baixado e pode adiar a atualização, salvo incompatibilidade realmente impeditiva.
Patches transferem somente o conteúdo necessário; reutilizar staging, validação,
ativação atômica e preservação do banco pessoal já existentes no instalador.

Preparar um **acervo de demonstração separado do acervo privado**: incluir materiais
com redistribuição autorizada para esse piloto. Não publicar automaticamente todos
os PDFs pessoais nem incluí-los em artefatos públicos do CI. Registrar quais obras
podem integrar cada pacote distribuído.

## Como o home lab poderia entrar

É possível usar Firebase apenas para identidade/distribuição e o home lab para
servir arquivos grandes. Downloads precisam de HTTPS e autorização temporária,
sem expor SQLite, portas administrativas ou pastas privadas. Fora da rede da igreja,
o endereço precisa estar disponível com capacidade de upload suficiente.

Também é possível hospedar identidade e licenciamento por conta própria, mas isso
acrescenta operação, segurança, recuperação e disponibilidade ao piloto. Minha
preferência é começar com o controle de acesso gerenciado e só mover os downloads
pesados ao home lab depois de medir tamanho, tráfego e confiabilidade. Preços e
quotas devem ser conferidos antes de escolher o armazenamento, sem pressupor gratuidade.

## Ordem de implementação futura

1. Selecionar acervo do piloto; definir responsáveis, participantes e política de uso offline.
2. Preparar release assinada e canal de teste; validar atualização sem perda de notas.
3. Implementar identidade e permissões por igreja/usuário/dispositivo, com administração autenticada.
4. Implementar autorização offline assinada e estados claros: ativo, sem rede, expirado, suspenso.
5. Publicar manifesto e pacotes autenticados; validar patch e retomada sem duplicar o acervo inteiro.
6. Testar expiração, revogação, relógio alterado, indisponibilidade, restauração e exportação de notas.

O mesmo contrato de autorização pode depois atender o desktop. Ele não muda a
autoridade editorial nem transforma o conteúdo pessoal em dados compartilhados entre igrejas.
