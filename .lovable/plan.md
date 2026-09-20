# Retirada de vários kits

## Objetivo
Adicionar à Central de Entrega um modo para registrar vários kits para uma única pessoa responsável, exigindo somente o nome dela.

## Experiência
- Incluir a opção **Retirada de vários kits** na Central.
- Permitir adicionar atletas pela busca atual ou pela leitura do QR Code.
- Manter os atletas já selecionados enquanto novas buscas e leituras são feitas.
- Mostrar a lista selecionada, com opção de remover atletas antes da confirmação.
- Impedir a seleção de kits já entregues ou que estejam aguardando sincronização.
- Solicitar apenas o nome do responsável pela retirada.
- Exibir uma revisão final e registrar todas as entregas em uma única confirmação.
- Informar quantos kits foram entregues e quais falharam, sem duplicar entregas.

## Segurança e registros
- Usar as permissões existentes da Central para gerente e staff.
- Criar uma entrega individual para cada atleta, vinculando todas ao mesmo responsável.
- Registrar cada entrega na auditoria e atualizar estoque, atletas e relatórios.
- Preservar o modo individual existente e o funcionamento offline atual.

## Detalhes técnicos
- A implementação ficará concentrada na tela da Central e reutilizará a tabela de entregas existente.
- As retiradas múltiplas serão registradas como retirada por terceiro, com `third_party_name` preenchido e CPF vazio.
- Busca e QR Code compartilharão a mesma seleção múltipla.
- A confirmação processará os atletas com proteção contra entrega duplicada e mostrará resultado parcial se algum item falhar.

## Validação
- Verificar seleção por busca, seleção por QR Code, remoção e confirmação.
- Verificar bloqueio de atleta já entregue.
- Verificar o uso em celular e computador.
- Confirmar que a compilação permanece sem erros.
