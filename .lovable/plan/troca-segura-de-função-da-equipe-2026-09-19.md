# Troca segura de função da equipe

## Objetivo
Permitir que o administrador cadastre como gerente uma conta anteriormente usada como staff quando ela não possui vínculo com nenhum evento.

## Alteração
- Ajustar a criação de convite para verificar todos os vínculos da conta existente.
- Sem vínculos: substituir a função antiga pela nova e vincular a conta diretamente ao evento.
- Com qualquer vínculo: manter o bloqueio de troca de função, sem alterar acessos ativos.
- Preservar as permissões atuais: somente administrador promove para gerente.

## Verificação
- Confirmar que Nara, atualmente sem vínculos, pode ser adicionada como gerente.
- Confirmar que contas vinculadas continuam protegidas contra troca de função.
- Confirmar que usuários e eventos em uso não são interrompidos.
