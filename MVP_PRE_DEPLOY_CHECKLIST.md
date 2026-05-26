# MVP pre-deploy checklist - TatuApp

Atualizado em 2026-05-26.

Este documento e a lista objetiva do que precisa estar verdadeiro antes de testar com usuarios reais.

## Status geral

Status atual: API/frontend corrigidos publicados e aptos para teste real controlado.

O codigo do front e da API ja esta publicado em:

- Front: `https://danielbrenner.online`
- API: `https://api.danielbrenner.online`

A API/frontend compatíveis com o banco atualizado foram publicadas em 2026-05-26. A validacao publicada confirmou privacidade da resposta publica, CORS restrito e health da API.

## Foto honesta do momento

### Base que ja esta no ar

- Front e API estao no ar.
- Busca pede localizacao automaticamente ao entrar.
- Uploads estao funcionando com arquivos reais.
- Perfil publico, dashboard, admin, agenda, portfolio e pagamentos estao implementados.
- Pitch e landing existem no produto.

### Fechado em codigo e banco nesta etapa

- `database/security-linter-api-mode.sql` aplicado e confirmado por chamadas anonimas bloqueadas em 2026-05-26.
- `database/artist-notifications.sql` aplicado e estrutura confirmada.
- `database/booking-payment-security-fixes.sql` aplicado, incluindo estados de sinal, token de comprovante e RPCs transacionais.
- API local sanitiza a localizacao publica, geocodifica no backend, exige token no comprovante e valida InfinitePay.
- `npm run check` passou em 2026-05-26.
- API e frontend publicados na VPS em 2026-05-26; `tatuapp-api` reiniciado no PM2.
- Dominio real validado: sem campos privados/coordenadas exatas em rotas publicas e CORS indevido retornando `403`.

### Publicado, ainda pendente de teste com usuario controlado

- Notificacoes internas e envio de mensagem pelo admin; estrutura ativa no Supabase, falta teste autenticado.
- Seguranca de reserva e pagamento; estrutura ativa e testes automatizados passando, falta fluxo real controlado.
- Reorganizacao do dashboard e da navegacao mobile, ainda em revisao visual/funcional.
- Protecao de contexto ao visitar perfil de outro tatuador, pendente de regressao autenticada.

### Ainda precisa prova real

- Pagamento InfinitePay ponta a ponta.
- Webhook liberando +30 dias automaticamente.
- Cadastro limpo de tatuador novo.
- Jornada completa de agenda com usuario real.

## Checklist obrigatorio

### 1. Banco Supabase atualizado

Status: atualizado para a etapa atual.

Rodar no SQL Editor do Supabase:

- `database/schema.sql`, se ainda nao estiver aplicado;
- `database/infinitepay-subscriptions-access.sql`, se ainda nao estiver aplicado;
- `database/date-specific-appointment-slots.sql`, se ainda nao estiver aplicado;
- `database/platform-admin-controls.sql`, se ainda nao estiver aplicado;
- `database/self-service-grace-period.sql`, se ainda nao estiver aplicado;
- `database/portfolio-photo-captions.sql`, se ainda nao estiver aplicado;
- `database/artist-full-address-location.sql`, aplicado em 2026-05-22.
- `database/security-linter-api-mode.sql`, aplicado e confirmado em 2026-05-26;
- `database/artist-notifications.sql`, aplicado e confirmado em 2026-05-26;
- `database/booking-payment-security-fixes.sql`, aplicado e confirmado em 2026-05-26.

A ordem consolidada e a classificacao de scripts estao em `database/MIGRATIONS.md`.

Criterio de pronto:

- `platform_payments` existe;
- `artist_access_grants` aceita `trial` e `paid_infinitepay`;
- novos tatuadores recebem 7 dias de teste;
- perfis vencidos sao bloqueados;
- admin consegue listar contas;
- tatuador consegue ver status de acesso no painel.
- `artist_profiles` tem campos de endereco completo;
- perfil/busca nao retornam erro 400 por coluna ausente.
- notificacoes podem ser gravadas, lidas e marcadas como lidas somente pela API autenticada.
- comprovante possui token com hash/validade e nao marca sinal como pago no upload;
- `record_appointment_proof_upload` registra arquivo e status em uma unica transacao;
- `approve_infinitepay_payment_once` existe e impede grant duplicado;
- `save_artist_settings_transactional` existe para perfil, Pix e agenda.
- `geocode_cache` existe e o frontend nao consulta Nominatim diretamente.
- navegador autenticado nao conserva perfil/endereco/agendamentos em `localStorage`.

### 2. InfinitePay Checkout API automatico

Status: implementado, publicado e coberto por teste automatizado; pagamento real ainda pendente.

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

Status: implementado, publicado e com SQL aplicado; pendente de teste ponta a ponta.

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

Status: implementado, pendente de teste linear final.

Cadastro CEP primeiro publicado em 2026-05-26, com SQL aplicado e rotas reais de CEP/localizacao verificadas; a criacao de conta nova na interface segue como teste controlado pendente.

Testar:

- cadastro;
- cadastro por CEP com endereco preenchido automaticamente;
- cadastro usando localizacao do celular quando o CEP nao for informado;
- login;
- criacao automatica do perfil;
- editar perfil;
- confirmar numero/referencia e distancia correta na busca;
- upload de avatar/capa;
- upload de portfolio;
- configurar agenda;
- configurar Pix do sinal;
- abrir perfil publico;
- receber agendamento;
- aprovar/recusar.

Criterio de pronto:

- um tatuador novo sai do zero ate perfil publico utilizavel, com localizacao confiavel para busca por proximidade.
- `database/signup-address-metadata.sql` aplicado antes de criar a conta de teste do fluxo CEP.

### 5. Uploads

Status: implementado e publicado; pendente de teste final com arquivos reais.

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

Status: publicado com resposta publica sanitizada e validada no dominio real em 2026-05-26.

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

### 9. Comunicacao interna e navegacao mobile

Status: implementacao local em revisao, ainda nao fechada.

Criterio de pronto:

- mensagem do suporte aparece para o tatuador;
- curtida e novo agendamento geram notificacao;
- aviso financeiro direciona para pagamentos;
- telas do dashboard mobile mantem o mesmo padrao visual e retorno claro ao painel;
- Pix e Agenda nao viram fluxos diferentes sem motivo.

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

1. Criar ou usar uma conta real controlada.
2. Preencher endereco completo e gerar localizacao.
3. Entrar na busca pelo celular e confirmar distancia nos cards.
4. Fazer agendamento, enviar comprovante e aprovar/recusar pelo painel.
5. Pagar mensalidade e verificar webhook com liberacao de +30 dias.

Se esse fluxo passar, o MVP pode ir para teste real controlado.
