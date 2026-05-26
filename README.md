# TatuApp

SaaS para tatuadores criarem perfil publico, portfolio, agenda online e reservas com sinal Pix.

## Estado atual

- Front publicado em `https://danielbrenner.online`.
- API publicada em `https://api.danielbrenner.online`.
- Banco em Supabase.
- Uploads na VPS.
- Pagamento da plataforma via InfinitePay Checkout API.
- Busca publica com geolocalizacao do visitante.
- Cadastro CEP primeiro e endereco completo do estudio publicados para gerar localizacao.
- Pitch page em `/pitch`.

## Nota para auditoria externa

Este repositorio contem o pacote de seguranca publicado em 2026-05-26 e alteracoes de UX que ainda exigem teste controlado.

- O backend e `api/upload-server.mjs`, uma API Node/Express.
- O arquivo real da API e `api/.env` e nao deve ser compartilhado; use `api/.env.example`.
- O arquivo real do frontend e `.env.local` e nao deve ser compartilhado; use `.env.example`.
- O navegador usa Supabase Auth para sessao; dados da aplicacao passam pela API privada.
- `database/security-linter-api-mode.sql`, `database/artist-notifications.sql` e `database/booking-payment-security-fixes.sql` estao aplicados no Supabase e foram confirmados em 2026-05-26.
- A API corrigida passou em `npm run check` e foi publicada em 2026-05-26, cobrindo privacidade publica, reserva/sinal, comprovante, plano ativo e InfinitePay.
- A publicacao foi validada no dominio real em 2026-05-26: busca/perfil publicos sem endereco privado ou coordenadas exatas, CORS indevido rejeitado com `403` e frontend servido correspondente ao build validado.
- O endereco e geocodificado pela API com cache; o frontend nao consulta ViaCEP nem Nominatim diretamente.
- O cadastro CEP primeiro, com preenchimento automatico e alternativa por localizacao do celular, foi publicado em 2026-05-26; `database/signup-address-metadata.sql` foi aplicado antes da ativacao.
- Com Supabase configurado, o perfil privado nao e persistido em `localStorage`.
- Avatar e capa do cadastro inicial sao configurados apos login confirmado, sem guardar imagens pendentes em `localStorage`.
- A navegacao e as telas mobile do dashboard estao em refinamento local e nao devem ser classificadas como fechadas.

## Comandos principais

```bash
npm run dev
npm run build
npm run api:dev
npm run check
```

## Arquivos importantes

- `database/schema.sql`: schema base.
- `database/infinitepay-subscriptions-access.sql`: trial, bloqueio e pagamentos InfinitePay.
- `database/artist-full-address-location.sql`: endereco completo do estudio e campos publicos de localizacao.
- `database/signup-address-metadata.sql`: preserva o endereco coletado no cadastro ao criar o perfil pelo trigger de Auth.
- `database/security-linter-api-mode.sql`: restringe acesso direto do navegador e direciona operacoes para a API.
- `database/artist-notifications.sql`: caixa interna de notificacoes do tatuador.
- `database/booking-payment-security-fixes.sql`: token de comprovante, revisao de sinal, webhook InfinitePay idempotente, cache de geocodificacao e salvamento transacional de perfil/agenda.
- `database/MIGRATIONS.md`: ordem das migrations ativas e separacao de scripts legados/operacionais.
- `api/upload-server.mjs`: API de dados, uploads, pagamentos, admin, notificacoes e webhooks.
- `api/.env.example`: exemplo das variaveis da API.
- `.env.example`: exemplo das variaveis publicas do frontend.
- `ROADMAP.md`: estado do produto e proximos passos.
- `MVP_PRE_DEPLOY_CHECKLIST.md`: checklist para teste real.

## Variaveis InfinitePay

Fluxo principal:

```env
INFINITEPAY_HANDLE=seu_handle_sem_arroba
INFINITEPAY_WEBHOOK_URL=https://sua-api.com/api/infinitepay/webhook
```

O sistema gera um checkout por pagamento e usa o webhook para liberar +30 dias automaticamente.

## Antes de testar com usuarios reais

1. Criar uma conta real controlada.
2. Testar cadastro por CEP e por localizacao do celular, confirmando numero/referencia e distancia na busca.
3. Testar busca pelo celular com permissao de localizacao.
4. Testar agenda ponta a ponta e revisao do comprovante.
5. Testar pagamento pela InfinitePay e confirmar liberacao automatica de +30 dias.
6. Testar mensagem do suporte, curtida e novo agendamento.
7. Fechar a revisao mobile do dashboard antes de considerar o painel pronto.
