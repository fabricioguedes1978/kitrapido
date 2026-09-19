# Recuperação de senha da equipe

## Objetivo
Permitir que gerente ou staff que esqueceu a senha recupere o acesso sem armazenar nem revelar senhas antigas.

## Fluxo
- Na aba **Equipe do evento**, adicionar a ação **Redefinir senha** para cada pessoa.
- O administrador poderá gerar um código para gerente ou staff; o gerente poderá gerar somente para staff de evento que gerencia.
- Mostrar o código uma única vez para ser entregue à pessoa, com validade curta e uso único.
- Na tela de login, adicionar **Esqueci minha senha** para gerente e staff.
- Criar uma tela pública onde a pessoa informa CPF, código, nova senha e confirmação.
- Após a troca, invalidar o código e permitir o acesso com a nova senha.

## Segurança
- Guardar somente a versão protegida do código; nunca guardar ou exibir a senha.
- Conferir permissões no servidor e no banco.
- Não revelar publicamente se um CPF possui conta.
- Registrar geração e uso do código na auditoria.

## Verificação
- Testar administrador redefinindo gerente e staff.
- Testar gerente redefinindo staff e sendo bloqueado ao tentar redefinir gerente.
- Testar código inválido, expirado e reutilizado.
- Testar entrada com a nova senha em celular e computador.

## Detalhes técnicos
A troca final da senha exige uma operação protegida do servidor para atualizar a conta existente. O restante do fluxo usa códigos temporários protegidos no banco e as permissões atuais dos eventos.
