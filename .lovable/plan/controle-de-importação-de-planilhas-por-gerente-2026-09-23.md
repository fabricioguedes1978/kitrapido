# Controle de importação de planilhas por gerente

## Objetivo
Dar ao administrador controle individual, por evento, sobre quais gerentes podem importar planilhas de inscritos.

## Alterações
- Adicionar ao vínculo do gerente com o evento uma permissão de importação de planilhas.
- Na criação do convite de gerente, mostrar a opção **“Permitir importação de planilha de inscritos”**; ela ficará desativada por padrão.
- Na lista **Equipe do evento**, mostrar ao administrador um botão para liberar ou bloquear essa permissão em cada gerente.
- Manter o administrador sempre autorizado a importar.
- Não mostrar esse controle para gerentes ou staffs.
- Para o gerente bloqueado, ocultar completamente na tela **Atletas**:
  - botão **Importar**;
  - seleção do arquivo;
  - **Adicionar aos atletas já cadastrados**;
  - **Substituir toda a lista pela planilha**;
  - área de arrastar/selecionar arquivo e modelo de planilha.
- Exibir no lugar uma mensagem curta informando que a importação não foi autorizada pelo administrador.

## Segurança
- Validar a permissão no banco por usuário e evento, não apenas esconder os controles da tela.
- Permitir que somente o administrador altere a autorização de importação.
- Preservar todas as demais ações do gerente e as permissões atuais de staff.

## Validação
- Conferir os estados autorizado e bloqueado na tela de usuários e na tela de atletas.
- Confirmar que gerente bloqueado não consegue importar nem substituir atletas, mesmo tentando chamar a operação diretamente.
- Confirmar que administrador continua importando normalmente.
