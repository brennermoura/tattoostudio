# Migrations do TatuApp

Atualizado em 2026-05-26.

## Linha ativa

Esta e a ordem de aplicacao para um ambiente TatuApp baseado em InfinitePay:

1. `schema.sql`
2. `infinitepay-subscriptions-access.sql`
3. `date-specific-appointment-slots.sql`
4. `platform-admin-controls.sql`
5. `self-service-grace-period.sql`
6. `fix-admin-list-artist-accounts.sql`
7. `portfolio-photo-captions.sql`
8. `artist-full-address-location.sql`
9. `signup-address-metadata.sql`
10. `artist-notifications.sql`
11. `booking-payment-security-fixes.sql`
12. `security-linter-cleanup.sql`
13. `security-linter-api-mode.sql`
14. `profile-cover-position.sql`

Os scripts dos itens 8 e 10 a 13 foram confirmados no banco ativo em 2026-05-26.
O item 9 foi informado como aplicado em 2026-05-26 antes da publicacao do fluxo CEP.
O item 14 foi preparado em 2026-05-26 e ainda precisa ser aplicado para ativar
o reposicionamento persistente da capa no perfil publico.
A API privada deve ser publicada junto com os itens 11 e 13: o frontend nao deve
depender de RPC direta bloqueada pelo hardening.

## Scripts nao cumulativos

- `artist-public-location-fields.sql`: substituido por `artist-full-address-location.sql`.
- `mercado-pago-payments.sql`: trilha antiga de gateway; nao aplicar junto da linha InfinitePay.
- `clear-demo-profile-defaults.sql`: limpeza operacional opcional.
- `remove-test-data.sql`: limpeza destrutiva de dados de teste, somente sob decisao explicita.

## Verificacao

- `npm run check` valida frontend e regras criticas da API local.
- API/frontend corrigidos foram publicados em 2026-05-26, com rotas publicas
  validadas sem endereco privado nem coordenada exata.
- Um replay completo desta sequencia em banco vazio ainda deve ser executado em
  ambiente descartavel antes de transformar os scripts em pipeline automatico.
