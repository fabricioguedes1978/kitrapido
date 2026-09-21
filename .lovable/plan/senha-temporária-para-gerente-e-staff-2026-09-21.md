# Senha temporária para gerente e staff

## Objetivo
Substituir o fluxo de código de recuperação por uma senha temporária gerada no painel **Equipe do evento**.

## Permissões
- Administrador poderá gerar senha temporária para gerente e staff.
- Gerente poderá gerar senha temporária somente para staff dos eventos que gerencia.
- Staff não verá nem poderá executar essa ação.
- A permissão continuará conferida no servidor, não apenas escondida na tela.

## Fluxo
- Na linha da pessoa, a ação **Gerar senha temporária** criará uma senha aleatória e atualizará imediatamente o acesso.
- A senha será exibida uma única vez para ser copiada e entregue à pessoa.
- A pessoa entrará normalmente com CPF e essa senha temporária.
- O fluxo antigo de código e a opção pública **Esqueci minha senha** serão removidos para evitar dois caminhos diferentes.
- A geração ficará registrada na auditoria, sem guardar ou registrar a senha.

## Segurança e compatibilidade
- A senha será gerada no servidor e nunca será armazenada em texto legível no banco.
- A troca usará a conta de acesso já existente, preservando vínculos com eventos, função e histórico.
- Contas e senhas atuais continuarão funcionando até que uma nova senha temporária seja gerada.

## Verificação
- Testar administrador gerando senha para gerente e staff.
- Testar gerente gerando senha para staff e sendo bloqueado para gerente.
- Confirmar que staff não possui a ação.
- Confirmar login por CPF com a senha temporária e conferir celular e computador.
