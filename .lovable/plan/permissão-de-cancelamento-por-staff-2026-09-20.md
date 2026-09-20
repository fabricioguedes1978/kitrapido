# Permissão de cancelamento por staff

## Objetivo
Permitir que administrador ou gerente escolha, por evento, se cada staff pode cancelar uma entrega. Administradores e gerentes continuarão com essa permissão sempre ativa.

## Experiência
- Adicionar ao convite de staff a opção **Permitir cancelamento de entrega**, inicialmente desativada.
- Mostrar essa permissão na lista da equipe do evento.
- Permitir que administrador ou gerente habilite ou desabilite a permissão de cada staff já vinculado.
- Ocultar as ações de cancelamento para staffs sem autorização, mantendo-as visíveis para administrador, gerente e staffs autorizados.

## Segurança
- Salvar a permissão no vínculo do staff com cada evento, permitindo configurações diferentes para a mesma pessoa em eventos distintos.
- Levar a escolha feita no convite até a ativação da conta.
- Validar a permissão no banco antes de aceitar qualquer cancelamento, sem depender apenas da tela.
- Manter administradores e gerentes autorizados independentemente dessa configuração.

## Validação
- Testar convite de staff com permissão ligada e desligada.
- Testar alteração da permissão no painel da equipe.
- Confirmar que staff sem autorização não consegue cancelar nem pela Central nem pela lista de Entregas.
- Confirmar que administrador, gerente e staff autorizado continuam cancelando normalmente.
- Verificar a experiência em celular e computador e confirmar a compilação sem erros.
