# Cronochip Kit Pro

PROMPT — SISTEMA CRONOCHIP KIT

Crie um sistema web completo, responsivo e moderno chamado Cronochip Kit, destinado ao gerenciamento online da entrega de kits de corridas e eventos esportivos.

O sistema deve funcionar perfeitamente em computador, tablet e celular, com interface simples e extremamente rápida para utilização no local de retirada dos kits.

A identidade visual deve seguir a marca Cronochip Cronometragem Esportiva, utilizando predominantemente verde, com visual profissional, esportivo e tecnológico.

1. OBJETIVO DO SISTEMA

O sistema deverá permitir que organizadores de corridas gerenciem todo o processo de entrega dos kits aos atletas.

O sistema deve controlar:

Atletas inscritos;

Número de peito;

Categoria;

Modalidade;

Tamanho da camiseta;

Tipo de kit;

Local de retirada;

Período de retirada;

QR Code do atleta;

Entrega do kit;

Retirada por terceiros;

Estoque de camisetas;

Usuários responsáveis pela entrega;

Histórico de entregas;

Relatórios.

O sistema deve impedir automaticamente que um mesmo kit seja entregue duas vezes.

2. PERFIS DE USUÁRIO

Criar os seguintes níveis de acesso:

ADMINISTRADOR CRONOCHIP

Acesso completo ao sistema.

Pode:

Criar eventos;

Editar eventos;

Cadastrar organizadores;

Gerenciar usuários;

Importar atletas;

Configurar kits;

Configurar tamanhos;

Configurar locais de retirada;

Configurar períodos de entrega;

Consultar todas as entregas;

Corrigir informações;

Cancelar uma entrega mediante justificativa;

Gerar relatórios;

Visualizar dashboards.

ORGANIZADOR

Pode acessar somente os eventos vinculados à sua conta.

Pode:

Visualizar atletas;

Consultar inscrições;

Configurar entrega de kits;

Criar locais de retirada;

Acompanhar estoque;

Consultar entregas;

Gerar relatórios;

Cadastrar atendentes.

Não pode acessar eventos de outros organizadores.

ATENDENTE

Interface simplificada para uso durante a entrega.

Pode:

Buscar atleta;

Ler QR Code;

Conferir dados;

Registrar entrega;

Consultar se o kit já foi entregue.

Não pode excluir atletas, alterar inscrições ou modificar configurações do evento.

3. LOGIN

Criar tela de login com:

Logo Cronochip;

E-mail;

Senha;

Recuperar senha;

Entrar.

Após login, direcionar o usuário para o dashboard de acordo com seu perfil.

Implementar autenticação segura e controle de permissões por função.

4. DASHBOARD

Criar dashboard moderno com cards mostrando:

Total de atletas;

Inscrições confirmadas;

Kits preparados;

Kits entregues;

Kits pendentes;

Percentual de entrega;

Entregas realizadas hoje;

Entregas por período;

Total de camisetas disponíveis.

Criar gráfico de evolução das entregas.

Exemplo:

08:00 — 35 kits
09:00 — 82 kits
10:00 — 145 kits
11:00 — 230 kits

Também mostrar gráfico de kits entregues por tamanho:

PP, P, M, G, GG, XG.

5. CADASTRO DO EVENTO

Criar tela para cadastrar evento com:

Nome do evento;

Data;

Horário;

Cidade;

Estado;

Endereço;

Logo do evento;

Organizador;

Descrição;

Modalidades;

Status.

Status:

Planejamento;

Inscrições abertas;

Inscrições encerradas;

Entrega de kits;

Evento realizado;

Encerrado.

6. CADASTRO DOS ATLETAS

Criar estrutura de atletas com:

Nome completo;

CPF;

Data de nascimento;

Sexo;

E-mail;

Telefone;

Número da inscrição;

Número de peito;

Modalidade;

Categoria;

Distância;

Tamanho da camiseta;

Tipo de kit;

Status da inscrição;

Status do pagamento.

Status do kit:

Aguardando retirada;

Entregue;

Retirada por terceiro;

Bloqueado.

7. IMPORTAÇÃO DE ATLETAS

Criar função para importar atletas através de:

CSV;

Excel.

Criar modelo de arquivo para download.

Durante a importação:

Validar CPF;

Validar campos obrigatórios;

Identificar duplicidades;

Mostrar erros;

Permitir correção;

Confirmar importação.

Não permitir duplicação de atletas pelo CPF ou número de inscrição dentro do mesmo evento.

8. QR CODE DO ATLETA

Cada atleta deverá possuir um QR Code exclusivo para retirada do kit.

O QR Code deve estar associado ao:

ID do atleta;

Evento;

Número de inscrição.

Criar uma página "Meu Kit" onde o atleta poderá visualizar:

Nome;

Evento;

Número de peito;

Modalidade;

Categoria;

Tamanho da camiseta;

Tipo de kit;

QR Code.

O QR Code deverá ser utilizado para agilizar a retirada.

9. TELA DE ENTREGA DE KIT

Esta é a principal tela do sistema.

Criar uma interface extremamente rápida e simples.

Deve possuir:

BOTÃO GRANDE:

📷 LER QR CODE

Ao ler o QR Code, buscar automaticamente o atleta.

Também disponibilizar:

Pesquisar atleta

Busca por:

CPF;

Nome;

Número de inscrição;

Número de peito;

Telefone.

Após localizar o atleta, mostrar um cartão de conferência:

ATLETA: João da Silva
Nº PEITO: 1025
MODALIDADE: Corrida 10 km
CATEGORIA: Masculino 40–49
CAMISETA: G
KIT: Kit Completo

Mostrar botão:

ENTREGAR KIT

Antes da confirmação, apresentar:

"Confirme a entrega do kit para este atleta."

Botões:

CONFIRMAR ENTREGA

CANCELAR

10. REGISTRO DA ENTREGA

Quando o atendente clicar em "Confirmar entrega", registrar automaticamente:

ID do atleta;

ID do evento;

Data;

Horário;

Usuário;

Atendente;

Local da retirada;

Tipo de kit;

Tamanho da camiseta;

Método de identificação.

Após registrar:

Mostrar tela verde:

KIT ENTREGUE COM SUCESSO ✓

Mostrar:

Nome;

Número de peito;

Horário;

Atendente.

Depois de alguns segundos, voltar automaticamente para a tela de leitura/pesquisa.

11. BLOQUEIO DE DUPLICIDADE

Essa regra é obrigatória.

Se o atleta tentar retirar o kit novamente, NÃO permitir nova entrega.

Mostrar alerta destacado:

⚠ KIT JÁ ENTREGUE

Informar:

Nome;

Data da entrega;

Horário;

Local;

Atendente responsável.

Botão:

VER HISTÓRICO

Nunca permitir duas entregas para o mesmo atleta no mesmo evento, salvo se um administrador realizar uma operação excepcional de reentrega.

12. REENTREGA

O administrador poderá cancelar uma entrega ou autorizar uma nova entrega.

Para isso, exigir:

Motivo;

Usuário administrador;

Data;

Horário.

Registrar tudo em um log de auditoria.

Exemplos de motivo:

Kit com tamanho errado;

Kit incompleto;

Troca de camiseta;

Problema no primeiro atendimento.

13. RETIRADA POR TERCEIROS

Criar função para o atleta autorizar outra pessoa a retirar seu kit.

Dados do terceiro:

Nome completo;

CPF;

Telefone.

Gerar autorização com QR Code.

Na entrega, o atendente deverá visualizar:

RETIRADA POR TERCEIRO

Mostrar:

Nome do atleta;

Nome do terceiro;

CPF do terceiro;

Número de peito;

Kit;

Tamanho da camiseta.

Solicitar confirmação.

Registrar a entrega como:

Retirada por terceiro.

14. ESTOQUE DE CAMISETAS

Criar módulo de estoque.

Cadastrar:

Tamanho;

Quantidade inicial;

Entradas;

Saídas;

Saldo.

Exemplo:

PP — 50
P — 150
M — 300
G — 300
GG — 150
XG — 50

Cada entrega deverá reduzir automaticamente o estoque correspondente.

Criar alerta quando o estoque estiver baixo.

Exemplo:

⚠️ Estoque de tamanho M abaixo do limite configurado.

15. CONTROLE DE KITS

Permitir cadastrar diferentes tipos de kits.

Exemplos:

Kit Econômico;

Kit Completo;

Kit VIP;

Kit Infantil;

Kit Sem Camiseta.

Cada tipo de kit poderá ter composição diferente.

Exemplo:

KIT COMPLETO:

Camiseta;

Número de peito;

Chip;

Sacola;

Brindes.

16. LOCAIS DE ENTREGA

Permitir cadastrar vários locais.

Exemplo:

Loja Oficial

Data: 10/09/2026
Horário: 14:00 às 20:00

Arena do Evento

Data: 11/09/2026
Horário: 08:00 às 17:00

Retirada no dia da prova

Data: 12/09/2026
Horário: 05:30 às 06:30

Cada entrega deverá ficar vinculada ao local utilizado.

17. MODO OFFLINE

Criar estrutura para permitir que o sistema continue funcionando temporariamente mesmo com instabilidade de internet durante a retirada dos kits.

Quando estiver offline:

Permitir consulta aos atletas previamente sincronizados;

Permitir leitura do QR Code;

Registrar entregas localmente;

Identificar possíveis duplicidades;

Sincronizar automaticamente quando a conexão retornar.

Mostrar indicador:

🟢 ONLINE

ou

🟠 OFFLINE — sincronização pendente.

Evitar perda de dados durante a sincronização.

18. RELATÓRIOS

Criar módulo de relatórios.

Filtros:

Evento;

Data;

Local;

Modalidade;

Categoria;

Tamanho;

Tipo de kit;

Status;

Atendente.

Relatórios:

Atletas que retiraram

Atletas que não retiraram

Entregas por horário

Entregas por atendente

Entregas por local

Entregas por tamanho

Retiradas por terceiros

Reentregas

Histórico de alterações

Permitir exportação para:

Excel;

CSV;

PDF.

19. AUDITORIA

Criar log de todas as ações importantes.

Registrar:

Usuário;

Ação;

Data;

Horário;

IP, quando disponível;

Registro afetado;

Informação anterior;

Informação nova.

Exemplos:

"Atendente Carlos entregou kit para atleta 1025."

"Administrador Fabrício autorizou reentrega do kit do atleta 1025."

20. PESQUISA RÁPIDA

A busca precisa ser extremamente rápida.

Permitir pesquisar digitando apenas parte do:

Nome;

CPF;

Número de peito;

Número da inscrição.

Exemplo:

Digite:

"1025"

O sistema deve localizar imediatamente o atleta.

21. INTERFACE PARA ATENDENTES

Criar uma interface específica chamada:

CENTRAL DE ENTREGA

Ela deve ter poucos elementos e botões grandes.

Tela:

CRONOCHIP KIT

Central de Entrega

[ 📷 LER QR CODE ]

[ 🔎 PESQUISAR ATLETA ]

Últimas entregas:

João da Silva — nº 1025 — 10:32
Maria Souza — nº 1026 — 10:33
Carlos Lima — nº 1027 — 10:34

Entregas hoje: 327

Essa tela deve ser otimizada para celulares e tablets.

22. DESIGN

Utilizar:

Verde como cor principal;

Branco;

Tons neutros;

Cards modernos;

Bordas arredondadas;

Ícones simples;

Tipografia limpa;

Alto contraste;

Botões grandes na tela de entrega.

O sistema deve transmitir sensação de:

velocidade + organização + tecnologia + segurança.

Criar layout profissional semelhante a sistemas SaaS modernos.

23. BANCO DE DADOS

Criar banco de dados relacional com estrutura adequada.

Principais tabelas:

users

id
name
email
password/auth
role
created_at

events

id
name
date
location
city
state
status
created_at

athletes

id
event_id
name
cpf
birth_date
gender
email
phone
registration_number
bib_number
modality
category
distance
shirt_size
kit_type
registration_status

kits

id
event_id
name
description
active

kit_items

id
kit_id
name
quantity

inventory

id
event_id
item_type
size
quantity_initial
quantity_current

deliveries

id
event_id
athlete_id
kit_id
delivered_by
location_id
delivery_type
delivered_at
status

third_party_authorizations

id
athlete_id
name
cpf
phone
qr_code
status

pickup_locations

id
event_id
name
address
date
start_time
end_time

audit_logs

id
user_id
event_id
action
entity
entity_id
old_data
new_data
created_at

Utilizar relacionamentos e índices adequados para garantir alta velocidade de pesquisa.

24. SEGURANÇA

Implementar:

Autenticação;

Controle de permissões;

Proteção das rotas;

Validação de dados;

Controle de acesso por evento;

Logs de auditoria;

Proteção contra duplicidade;

Validação de CPF;

Sanitização dos dados.

Considerar requisitos da LGPD para tratamento dos dados pessoais dos atletas.

Não exibir CPF completo desnecessariamente na interface.

25. PERFORMANCE

O sistema será utilizado em eventos com grande quantidade de atletas.

Deve suportar eventos com:

500 atletas;

1.000 atletas;

5.000 atletas;

10.000+ atletas.

A pesquisa por CPF, nome, inscrição ou número de peito deve ser rápida.

O registro da entrega deve ocorrer em poucos segundos.

26. DASHBOARD DO EVENTO

Criar uma visão específica de cada evento:

CORRIDA CRONOCHIP 2026

Atletas: 2.500

Kits entregues: 1.845

Pendentes: 655

Percentual: 73,8%

Criar gráfico de:

ENTREGAS POR HORA

e

ENTREGAS POR TAMANHO

27. EXPERIÊNCIA DO ATLETA

Criar uma página pública onde o atleta possa consultar sua retirada.

URL amigável:

/evento/nome-do-evento/kit

O atleta informa CPF ou número de inscrição.

Mostrar:

Seu kit está disponível para retirada.

Informações:

Local;

Data;

Horário;

Número de peito;

Tamanho da camiseta;

Tipo de kit;

QR Code.

Após retirada:

KIT RETIRADO ✓

Data e horário da retirada.

28. RESPONSIVIDADE

O sistema deve funcionar perfeitamente em:

Desktop;

Notebook;

Tablet;

Android;

iPhone.

A tela de entrega deve priorizar dispositivos móveis.

29. ESTRUTURA DE NAVEGAÇÃO

Menu principal:

Dashboard

Eventos

Atletas

Kits

Estoque

Entregas

Locais de Retirada

Autorizações

Relatórios

Usuários

Auditoria

Configurações

30. REQUISITO IMPORTANTE

Não criar apenas uma interface visual.

Criar um sistema funcional com:

Banco de dados;

Autenticação;

CRUD completo;

Relacionamentos;

Validações;

Regras de negócio;

Controle de permissões;

Registro de entregas;

QR Code;

Relatórios;

Dashboard;

Auditoria.

Utilizar componentes reutilizáveis e arquitetura organizada para permitir futuras expansões.

O sistema deverá ser preparado para posteriormente receber integração via API com a plataforma de inscrições da Cronochip, permitindo sincronização automática dos atletas inscritos.

RESULTADO ESPERADO

Entregar um MVP funcional do Cronochip Kit, pronto para ser testado em um evento real de corrida, com foco principal em:

Velocidade na retirada;

Facilidade de uso;

Controle de estoque;

Eliminação de entregas duplicadas;

Rastreabilidade;

QR Code;

Dashboard em tempo real;

Relatórios;

Segurança dos dados;

Integração futura com a plataforma Cronochip.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cd4f2d59-a012-4202-9d4f-d100cf14f6d9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
