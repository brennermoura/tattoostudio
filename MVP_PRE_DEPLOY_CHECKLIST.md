# MVP pre-deploy checklist - TatuApp

Este documento e a lista oficial do que falta antes de subir o MVP para teste real.
Ele existe para evitar que o escopo fique mudando toda hora.

## Regra do documento

So entra item novo aqui se for bloqueador real para testar o MVP em producao.

Nao entram aqui:

- melhoria visual pequena;
- ideia futura;
- automacao que pode ficar para depois;
- painel mais bonito;
- recurso que nao impede tatuador de criar perfil, receber agenda e pagar mensalidade.

## Objetivo desta fase

Deixar o sistema pronto para subir e testar com usuario real.

Isso nao inclui crescimento, escala, campanha, assinatura recorrente, Instagram API ou relatorios.

## Checklist fechado antes do deploy

### 1. Banco final aplicado no Supabase

Status: bloqueado fora do codigo. Checado em 2026-05-15: o Supabase remoto ainda respondeu que `public.platform_payments` nao existe.

O que precisa estar aplicado:

- `database/schema.sql`
- `database/mercado-pago-payments.sql`

Criterio de pronto:

- tabela `platform_payments` existe;
- RPCs administrativas funcionam;
- criacao de agendamento publico funciona;
- status de acesso do artista funciona;
- primeiro admin existe em `platform_admins`.

Resolvido no projeto:

- SQL da estrutura de pagamentos existe em `database/mercado-pago-payments.sql`;
- `database/schema.sql` tambem contem a estrutura atualizada;
- o backend agora avisa claramente quando `platform_payments` ainda nao existe.

Pendente do usuario:

- rodar `database/mercado-pago-payments.sql` no SQL Editor do Supabase;
- confirmar que existe pelo menos um usuario em `platform_admins`.

### 2. Mercado Pago validado localmente

Status: codigo implementado, bloqueado pelo SQL e teste real.

O que precisa funcionar:

- botao "Pagar mensalidade" cria checkout;
- Mercado Pago devolve URL de pagamento;
- registro fica salvo em `platform_payments`;
- webhook recebe notificacao;
- pagamento aprovado libera 30 dias;
- pagamento da plataforma fica separado de beneficio manual.

Criterio de pronto:

- um pagamento de teste muda acesso do artista automaticamente para ativo.

Resolvido no projeto:

- endpoint de checkout existe em `/api/platform-payments/checkout`;
- webhook existe em `/api/mercado-pago/webhook`;
- pagamento aprovado cria liberacao de 30 dias como `paid_mercado_pago`;
- beneficio manual nao e usado para pagante automatico.

Pendente do usuario:

- aplicar SQL de pagamentos no Supabase;
- fazer pagamento de teste pelo Mercado Pago;
- conferir o webhook recebendo a notificacao no tunnel ou dominio real.

### 3. Regra de acesso fechada

Status: implementado no codigo, pendente de validacao ponta a ponta.

Regra do MVP:

- pagamento aprovado libera 30 dias;
- beneficio manual e cortesia, nao pagamento;
- vitalicio continua como excecao admin;
- perfil bloqueado/inadimplente nao aparece para clientes;
- artista bloqueado ainda consegue entrar no painel para pagar.

Criterio de pronto:

- sistema nao mistura mensalidade paga com bonus manual;
- admin nao precisa liberar pagante manualmente.

Resolvido no projeto:

- pagamento aprovado usa grant `paid_mercado_pago`;
- beneficios manuais continuam separados como `manual_free` ou `lifetime`;
- perfil bloqueado continua podendo entrar no painel para pagar.

### 4. Fluxo completo do tatuador conferido

Status: pendente de teste linear.

Fluxo obrigatorio:

- criar conta;
- criar perfil;
- entrar no dashboard;
- editar perfil;
- subir avatar/capa;
- subir portfolio;
- configurar agenda;
- configurar Pix do sinal do cliente;
- abrir perfil publico;
- receber solicitacao de agendamento;
- aprovar ou recusar.

Criterio de pronto:

- um tatuador novo consegue sair do zero ate perfil publico utilizavel.

### 5. Uploads conferidos

Status: implementado, pendente de teste final.

O que precisa funcionar:

- avatar;
- capa;
- portfolio;
- comprovante de sinal;
- abertura de comprovante no painel do tatuador.

Criterio de pronto:

- arquivos reais passam pela API;
- comprovante nao fica publico;
- imagem nao depende de base64/localStorage no fluxo real.

### 6. Estados de erro essenciais

Status: parcialmente resolvido, pendente de teste final.

Estados obrigatorios:

- usuario sem perfil;
- usuario sem permissao admin;
- erro de pagamento;
- webhook/tabela ausente;
- upload falhou;
- sem horarios configurados;
- perfil publico nao encontrado.

Criterio de pronto:

- nenhuma dessas situacoes deixa tela quebrada ou sem explicacao.

Resolvido no projeto:

- usuario logado sem perfil nao gera mais erro 406;
- perfil publico inexistente/inativo nao gera mais erro 406;
- checkout mostra erro claro se o banco de pagamentos nao foi aplicado;
- erro de Supabase ausente no painel admin ja tem mensagem explicita.

Pendente do usuario:

- testar esses estados no navegador depois de aplicar o SQL.

## Fora do MVP

Esses itens nao bloqueiam subir para teste real:

- assinatura recorrente do Mercado Pago;
- Pix automatico do sinal do cliente;
- importacao do Instagram;
- login social;
- chat interno;
- relatorios financeiros avancados;
- ranking sofisticado;
- email automatico;
- app mobile;
- painel admin completo de financeiro.

## Estado real em 2026-05-15

O MVP ainda nao esta pronto para deploy porque falta aplicar o SQL de pagamentos no Supabase e validar Mercado Pago ponta a ponta.

Depois que os itens 1 e 2 passarem, o restante vira pente fino de fluxo e erro, nao reconstrucao do produto.

Estimativa realista:

- 1 rodada para aplicar SQL e validar pagamento;
- 1 rodada para testar fluxo completo de tatuador;
- 1 rodada curta para corrigir estados quebrados encontrados.

Se aparecer algo novo, deve ser classificado como:

- bloqueador deste documento; ou
- pos-MVP.

Se for pos-MVP, nao entra nesta fase.
