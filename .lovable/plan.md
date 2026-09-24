# Link seguro para redefinir senha da equipe

## Objetivo
Substituir a senha temporária por um link único que permita ao gerente ou staff criar uma nova senha sem perder conta, eventos, função ou histórico.

## Fluxo
- Na aba **Equipe do evento**, trocar **Gerar senha temporária** por **Gerar link para redefinir senha**.
- Administrador poderá gerar o link para gerente e staff.
- Gerente poderá gerar o link somente para staff dos eventos que gerencia.
- O link será mostrado uma única vez para ser copiado e enviado à pessoa.
- Na tela de login de gerente e staff, adicionar **Esqueci minha senha** com orientação para solicitar o link.
- Ao abrir o link, a pessoa informará CPF, nova senha e confirmação.
- Após a troca, o link será invalidado e a pessoa poderá entrar normalmente com a nova senha.

## Segurança
- Usar um código longo e aleatório no link, armazenando apenas sua versão protegida.
- Validade curta, uso único e revogação de links anteriores da mesma pessoa.
- Conferir CPF, evento e permissões no servidor.
- Registrar geração e uso na auditoria sem registrar o link ou a senha.
- Preservar a conta existente e todos os vínculos.

## Compatibilidade com a Hostinger
- A tela hospedada na Hostinger usará a conexão pública.
- Somente as operações protegidas de geração e troca serão processadas pelo endereço publicado do KIT RÁPIDO no Lovable Cloud, evitando guardar a credencial administrativa na Hostinger.

## Verificação
- Testar administrador gerando link para gerente e staff.
- Testar gerente gerando link para staff e sendo bloqueado para gerente.
- Testar link válido, expirado, reutilizado e CPF incorreto.
- Confirmar login com a nova senha e manutenção dos eventos já vinculados.
