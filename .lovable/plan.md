# Contagem de check-in online no relatório

## Alteração
- Registrar no atleta a primeira vez em que ele consultar e gerar sua credencial pelo check-in online.
- Exibir, no final da página **Relatórios**, dois totais do evento selecionado: **check-in online realizado** e **ainda não fizeram check-in**.
- Manter todas as demais telas, relatórios e regras sem alterações.

## Detalhes técnicos
- Adicionar um campo de data/hora de check-in online aos atletas.
- Atualizar as consultas públicas de check-in para marcar esse campo sem mudar os dados retornados ao atleta.
- Incluir o campo na leitura da página de relatórios e calcular os dois totais sobre todos os atletas do evento.
- Validar compilação e funcionamento da página de relatórios.
