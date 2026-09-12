# Controle do atendimento virtual

## Objetivo
Adicionar ao painel do administrador uma página **Chat** para escolher o funcionamento do balão público:
- **Respostas fixas** — modo padrão, usando o FAQ atual e sem consumir IA.
- **Respostas com IA** — usa a atendente Ana e a configuração de IA já existente.

## O que será feito
- Criar uma configuração global do chat no banco, iniciando em **Respostas fixas**.
- Permitir que somente administradores alterem essa configuração.
- Adicionar o item **Chat** ao menu exclusivo do administrador.
- Criar uma tela simples com as duas opções, estado atual e botão para salvar.
- Fazer o balão público consultar a configuração e alternar entre FAQ fixo e conversa com IA.
- Manter uma única conversa por visita, sem salvar histórico, conforme escolhido.
- Preservar o FAQ atual como alternativa segura quando a IA estiver desligada.
- Exibir erros reais da IA no balão, sem redirecionar ao WhatsApp.

## Detalhes técnicos
- A configuração pública conterá apenas o modo (`fixed` ou `ai`); nenhuma chave será exposta.
- A chave continuará armazenada apenas no ambiente seguro do servidor.
- A rota de IA continuará no servidor e só aceitará mensagens quando o modo IA estiver ativo.
- A tabela terá leitura pública limitada à configuração e atualização protegida por perfil administrativo.
- A interface de conversa com IA usará transmissão em tempo real e os componentes de chat recomendados pelo AI SDK.

## Validação
- Confirmar que gerente e staff não veem nem conseguem alterar a página.
- Confirmar que o modo fixo continua funcionando sem chave de IA.
- Confirmar que o modo IA envia e recebe uma resposta real quando houver chave e saldo disponíveis.
- Conferir o balão em computador e celular.
