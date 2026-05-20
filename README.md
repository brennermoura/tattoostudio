# TatuApp

SaaS para tatuadores criarem perfil publico, portfolio, agenda online e reservas com sinal Pix.

## Estado atual

- Front publicado em `https://danielbrenner.online`.
- API publicada em `https://api.danielbrenner.online`.
- Banco em Supabase.
- Uploads na VPS.
- Pagamento da plataforma via InfinitePay Checkout API.
- Busca publica com geolocalizacao do visitante.
- Endereco completo do estudio implementado localmente, pendente de SQL/deploy.
- Pitch page em `/pitch`.

## Comandos principais

```bash
npm run dev
npm run build
npm run api:dev
```

## Arquivos importantes

- `database/schema.sql`: schema base.
- `database/infinitepay-subscriptions-access.sql`: trial, bloqueio e pagamentos InfinitePay.
- `database/artist-full-address-location.sql`: endereco completo do estudio e campos publicos de localizacao.
- `api/upload-server.mjs`: API de uploads, pagamentos e webhooks.
- `api/.env.example`: exemplo das variaveis da API.
- `.env.local`: variaveis publicas do frontend.
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

1. Rodar SQLs pendentes no Supabase, principalmente `database/artist-full-address-location.sql`.
2. Publicar o pacote atual depois do SQL.
3. Criar uma conta real controlada.
4. Preencher endereco completo do estudio e gerar localizacao.
5. Testar busca pelo celular com permissao de localizacao.
6. Testar pagamento pela InfinitePay.
7. Confirmar que o webhook aprovou o pagamento.
8. Confirmar que o acesso foi liberado por +30 dias.
