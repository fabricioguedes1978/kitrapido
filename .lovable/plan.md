# Convite e ativação de gerente e staff

## Objetivo
Substituir o cadastro direto de gerente/staff pelo fluxo de convite, eliminando a dependência da credencial administrativa no servidor da Hostinger.

## Permissões
- Administrador poderá convidar gerente ou staff para qualquer evento que administra.
- Gerente poderá convidar somente staff e somente para um evento que gerencia.
- Staff não poderá criar, cancelar ou consultar convites.
- Toda permissão será conferida no banco, não apenas escondida na tela.

## Fluxo de convite
- Na aba **Equipe do evento**, trocar o cadastro com senha por um formulário de convite com nome, CPF e função permitida.
- Gerar um código único de ativação, armazenando somente sua versão protegida no banco.
- Mostrar o código uma única vez para o administrador ou gerente copiar e entregar à pessoa.
- Permitir visualizar convites pendentes e cancelá-los; códigos expiram e só podem ser usados uma vez.

## Ativação pública
- Criar a página pública **Ativar acesso**, acessível pelo login.
- A pessoa informará CPF, código do convite e a senha desejada, com opção de mostrar/ocultar senha.
- O sistema validará CPF, código, validade, função e evento antes de concluir.
- Ao criar a conta, o banco consumirá o convite em uma única operação e criará automaticamente o perfil, a função e o vínculo com o evento.
- O login continuará sendo feito com CPF e senha.

## Segurança
- Validar os dados na tela e novamente no banco.
- Impedir ativação sem convite válido, reutilização de código e mudança de staff para gerente.
- Não guardar códigos em texto legível nem expor dados de outros convites ao público.
- Remover a atribuição automática de função para novos cadastros; a função virá exclusivamente do convite validado.
- Manter as contas atuais e seus vínculos sem alterações.

## Ajustes de autenticação
- Permitir confirmação imediata somente para esse cadastro controlado por convite, pois o acesso usa um e-mail interno derivado do CPF e não recebe mensagens.
- Preservar o acesso atual do administrador e dos usuários já cadastrados.

## Verificação
- Testar: administrador convidando gerente e staff; gerente convidando staff; bloqueio de gerente tentando convidar gerente; bloqueio total para staff; código inválido, expirado e reutilizado; ativação e login por CPF.
- Conferir a aba Equipe, as mensagens de erro e o funcionamento em celular e computador.
