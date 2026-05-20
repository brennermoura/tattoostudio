# MVP pre-deploy checklist - TatuApp

Atualizado em 2026-05-19.

Este documento e a lista objetiva do que precisa estar verdadeiro antes de testar com usuarios reais.

## Status geral

Status atual: quase pronto para teste real controlado.

O codigo do front e da API ja esta publicado em:

- Front: `https://danielbrenner.online`
- API: `https://api.danielbrenner.online`

O principal bloqueador agora e aplicar o SQL de endereco completo no Supabase e publicar o pacote atual sem quebrar consultas de perfil/busca.

## Foto honesta do momento

### Fechado em codigo/publicacao

- Front e API estao no ar.
- Busca pede localizacao automaticamente ao entrar.
- Uploads estao funcionando com arquivos reais.
- Perfil publico, dashboard, admin, agenda, portfolio e pagamentos estao implementados.
- Pitch e landing existem no produto.

### Implementado localmente, ainda nao publicado

- Endereco completo do estudio.
- Conversao de endereco em latitude/longitude.
- Referencia publica de localizacao sem expor endereco completo.

### Ainda precisa prova real

- Pagamento InfinitePay ponta a ponta.
- Webhook liberando +30 dias automaticamente.
- Cadastro limpo de tatuador novo.
- Jornada completa de agenda com usuario real.

## Checklist obrigatorio

### 1. Banco Supabase atualizado

Status: parcialmente aplicado, pendente de `artist-full-address-location.sql`.

Rodar no SQL Editor do Supabase:

- `database/schema.sql`, se ainda nao estiver aplicado;
- `database/infinitepay-subscriptions-access.sql`, se ainda nao estiver aplicado;
- `database/date-specific-appointment-slots.sql`, se ainda nao estiver aplicado;
- `database/platform-admin-controls.sql`, se ainda nao estiver aplicado;
- `database/self-service-grace-period.sql`, se ainda nao estiver aplicado;
- `database/portfolio-photo-captions.sql`, se ainda nao estiver aplicado;
- `database/artist-full-address-location.sql`.

Criterio de pronto:

- `platform_payments` existe;
- `artist_access_grants` aceita `trial` e `paid_infinitepay`;
- novos tatuadores recebem 7 dias de teste;
- perfis vencidos sao bloqueados;
- admin consegue listar contas;
- tatuador consegue ver status de acesso no painel.
- `artist_profiles` tem campos de endereco completo;
- perfil/busca nao retornam erro 400 por coluna ausente.

### 2. InfinitePay Checkout API automatico

Status: implementado no codigo e publicado, pendente de teste real com pagamento.

Fluxo atual:

- API cria checkout novo por pagamento;
- usa `INFINITEPAY_HANDLE`;
- envia `webhook_url`;
- recebe POST em `/api/infinitepay/webhook`;
- valida pagamento com `payment_check`;
- marca pagamento como aprovado;
- libera +30 dias corridos.

Env necessario na API:

```env
INFINITEPAY_HANDLE=danbrennermoura
INFINITEPAY_WEBHOOK_URL=https://api.danielbrenner.online/api/infinitepay/webhook
```

Criterio de pronto:

- pagamento real/teste gera checkout;
- webhook chega na API;
- pagamento aprovado aparece no historico;
- acesso do tatuador e liberado por +30 dias sem acao manual do admin.

### 3. Regra de acesso

Status: implementado, pendente de SQL aplicado e teste ponta a ponta.

Regra definida:

- novo tatuador: 7 dias gratis;
- depois dos 7 dias sem pagamento: perfil publico bloqueado;
- bloqueado ainda consegue logar;
- bloqueado so consegue acessar inicio/pagamentos;
- pagamento aprovado: libera +30 dias corridos;
- admin consegue aplicar beneficio manual quando precisar.

Criterio de pronto:

- cliente nao ve perfil vencido;
- cliente nao agenda com perfil vencido;
- tatuador vencido consegue pagar;
- admin ve pagos, teste gratis e inadimplentes.

### 4. Fluxo do tatuador

Status: implementado, pendente de SQL/deploy do endereco completo e teste linear final.

Testar:

- cadastro;
- login;
- criacao automatica do perfil;
- editar perfil;
- preencher endereco completo;
- gerar localizacao pelo endereco;
- upload de avatar/capa;
- upload de portfolio;
- configurar agenda;
- configurar Pix do sinal;
- abrir perfil publico;
- receber agendamento;
- aprovar/recusar.

Criterio de pronto:

- um tatuador novo sai do zero ate perfil publico utilizavel, com localizacao confiavel para busca por proximidade.

### 5. Uploads

Status: implementado e publicado, pendente de teste final com arquivos reais.

Coberto:

- avatar;
- capa;
- portfolio;
- comprovante de sinal;
- comprovante privado por rota autenticada.

Criterio de pronto:

- arquivos sobem na VPS;
- imagens publicas carregam no perfil;
- comprovante nao fica publico;
- tatuador consegue abrir comprovante no painel.

### 6. Admin

Status: implementado, pendente de banco atualizado e teste.

Coberto:

- login admin separado do login de tatuador;
- lista de contas;
- pagos;
- inadimplentes;
- cadastrados;
- beneficios manuais;
- confirmacao manual de pagamento como fallback.

Criterio de pronto:

- admin ve a situacao financeira sem depender de olhar tabela manualmente;
- fallback manual existe, mas fluxo principal e automatico via webhook.

### 7. Busca por proximidade

Status: busca publicada; endereco completo implementado localmente e pendente de SQL/deploy.

Coberto:

- pedido automatico de permissao de localizacao;
- ordenacao por proximidade;
- exibicao de km quando artista tem coordenada;
- fallback para artistas sem coordenada.

Criterio de pronto:

- tatuador cadastra endereco completo;
- sistema gera latitude/longitude;
- cliente entra na pesquisa, permite localizacao e ve distancia nos cards;
- artista sem coordenada nao quebra nem desaparece do catalogo.

### 8. Pitch e landing

Status: implementado, pendente de revisao final visual/textual se for enviar para investidor.

Criterio de pronto:

- landing esta com linguagem comercial limpa;
- pitch tem tese, mercado, projecao e modelo de investimento;
- CTA do pitch aponta para conversa no WhatsApp ou contato definido;
- sem botao redundante de criar conta no pitch, se a pagina for usada para investidor.

## Fora do MVP

Nao bloqueiam teste real agora:

- assinatura recorrente InfinitePay por link;
- comunidade visual completa;
- area de cliente;
- seguir tatuadores;
- feed;
- importacao Instagram;
- relatorios financeiros avancados;
- email automatico;
- app mobile.

## Proximo passo imediato

1. Rodar `database/artist-full-address-location.sql` no Supabase.
2. Publicar o pacote atual.
3. Criar ou usar uma conta real controlada.
4. Preencher endereco completo e gerar localizacao.
5. Entrar na busca pelo celular e permitir localizacao.
6. Confirmar distancia/proximidade nos cards.
7. Clicar em pagar mensalidade.
8. Confirmar que abre checkout InfinitePay.
9. Pagar.
10. Verificar se webhook aprovou e liberou +30 dias.

Se esse fluxo passar, o MVP pode ir para teste real controlado.
