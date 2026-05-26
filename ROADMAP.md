# Roadmap - TatuApp

Atualizado em 2026-05-26.

## Direcao do produto

O TatuApp comeca como SaaS simples para tatuadores:

- perfil publico;
- portfolio;
- agenda;
- reserva com sinal Pix;
- painel do tatuador;
- pagamento da mensalidade da plataforma.

A direcao pos-lancamento e evoluir para uma comunidade visual de tattoo, mais perto de uma experiencia social especializada para tatuagem:

- area de clientes;
- seguir tatuadores;
- tatuadores seguirem tatuadores;
- descoberta por cidade/estilo;
- perfis mais sociais;
- relacao cliente/tatuador dentro da plataforma.

Para o MVP atual, a prioridade continua sendo: perfil, descoberta, agenda, pagamento e bloqueio por inadimplencia funcionando sem depender de ajuste manual.

## Onde ja pisamos

### Publicado em producao

- Front em `https://danielbrenner.online`.
- API em `https://api.danielbrenner.online`.
- Rotas principais: `/`, `/landing`, `/pitch`, `/login`, `/register`, `/dashboard`, `/admin`, `/{slug}`.
- Perfil publico com portfolio, modal de fotos, likes, WhatsApp e agendamento.
- Dashboard do tatuador com perfil, agenda, portfolio, Pix, pagamentos, troca de senha e status de acesso.
- Admin com lista de contas, bloqueio/desbloqueio, beneficios, configuracao de preco e visao operacional mais enxuta.
- Uploads funcionando para avatar, capa, portfolio e comprovante.
- Busca publica com pedido automatico de geolocalizacao do visitante e ordenacao por proximidade quando permitido.
- Pitch page criada para conversa com investidor.

### Publicado nesta etapa

- Endereco completo do estudio no perfil do tatuador.
- Geocodificacao do endereco para `latitude`/`longitude`.
- Campo separado de referencia publica, para mostrar algo como `Proximo ao Centro` sem expor o endereco completo.
- Cards da busca e perfil publico usando referencia publica quando existir.
- SQL `database/artist-full-address-location.sql` aplicado e validado no Supabase.

### Ativado e publicado em 2026-05-26

- Cadastro de tatuador com CEP como entrada principal, preenchimento automatico via API e alternativa `Usar minha localizacao`.
- Editor de perfil usando o mesmo fluxo compacto, sem exigir digitacao manual de rua, bairro, cidade e estado.
- Geocodificacao e consulta de CEP processadas pela API, com limite de requisicoes e coordenada salva para distancia na busca.
- `database/signup-address-metadata.sql` aplicado; API/frontend publicados e rotas reais de CEP, geocodificacao e localizacao reversa validadas. Resta testar uma conta nova completa na interface.

### Fechado no banco e publicado em 2026-05-26

Estes itens estao implementados nesta copia e as respectivas estruturas ja foram confirmadas no Supabase:

- migracao das operacoes de dados do navegador para a API privada e `database/security-linter-api-mode.sql`, confirmado por bloqueio das RPCs diretas para cliente anonimo;
- SQL `database/artist-notifications.sql`, aplicado; a experiencia ainda precisa de teste autenticado publicado;
- protecoes criticas de reserva/pagamento em `database/booking-payment-security-fixes.sql`: token de comprovante, revisao de sinal, webhook idempotente, cache de geocodificacao e salvamento transacional;
- privacidade local: perfil autenticado nao fica mais salvo em `localStorage`, e geocodificacao sai do navegador para a API;
- cadastro sem armazenamento local de avatar/capa pendentes; as imagens sao configuradas apos login autenticado;
- testes automatizados de API, lint, typecheck e build passando com `npm run check`;
- API/frontend publicados na VPS e validados no dominio real: CORS restrito, health ativo, busca/perfil sem endereco privado ou coordenadas exatas.

### Publicado, ainda pendente de regressao com usuario controlado

- comunicacao interna do tatuador: curtida, novo agendamento, mensagem do suporte e aviso financeiro;
- reorganizacao do dashboard, atalhos, retorno ao painel e telas mobile de Agenda/Pix;
- separacao entre perfil proprio e perfil publico visitado, que precisa de regressao autenticada.

### Ja decidido, mas ainda precisa teste real

- InfinitePay deve ser automatico via checkout + webhook.
- Pagamento aprovado libera +30 dias.
- Trial inicial de 7 dias.
- Desbloqueio temporario controlado.
- Perfil vencido fica invisivel para o publico, mas o tatuador continua podendo logar e pagar.

## Estado atual

### Frontend

Status: publicado.

- React + Vite + Tailwind.
- Front publicado em `https://danielbrenner.online`.
- Rotas principais funcionando:
  - `/`;
  - `/landing`;
  - `/pitch`;
  - `/login`;
  - `/register`;
  - `/dashboard`;
  - `/admin`;
  - `/{slug}`.

### API

Status: versao corrigida publicada e validada em 2026-05-26.

- API em `https://api.danielbrenner.online`.
- Processo PM2 `tatuapp-api`.
- Health check: `/api/health`.
- Uploads publicos na VPS.
- Comprovantes privados na VPS.
- Webhook InfinitePay em `/api/infinitepay/webhook`.

### Banco

Status: campos de endereco, notificacoes, hardening de acesso e estruturas de seguranca/pagamento foram confirmados no Supabase; API compativel publicada. Ainda falta validar fluxos autenticados e pagamento real.

Arquivos principais:

- `database/schema.sql`;
- `database/infinitepay-subscriptions-access.sql`;
- `database/date-specific-appointment-slots.sql`;
- `database/platform-admin-controls.sql`;
- `database/self-service-grace-period.sql`;
- `database/portfolio-photo-captions.sql`;
- `database/artist-full-address-location.sql`.
- `database/security-linter-api-mode.sql`;
- `database/artist-notifications.sql`;
- `database/booking-payment-security-fixes.sql`.
- `database/MIGRATIONS.md`, com ordem de aplicacao e scripts legados/operacionais.

O SQL novo adiciona:

- teste gratis de 7 dias;
- `paid_infinitepay`;
- tabela/constraint de pagamentos;
- bloqueio por acesso vencido;
- politicas publicas exigindo acesso ativo;
- funcoes admin de status financeiro.
- campos de endereco completo e referencia publica para descoberta por proximidade.

## Funcionalidades prontas

### Perfil publico

Status: base funcional implementada; navegacao e configuracoes mobile em revisao local.

- Perfil por slug.
- Avatar, capa, bio, estilos, cidade/estado.
- Referencia publica de localizacao quando cadastrada.
- Portfolio com modal.
- Likes anonimos.
- WhatsApp.
- CTA de agendamento.
- Estado vazio para perfil em configuracao.
- Dono logado pode trocar capa/avatar e editar bio direto pelo perfil.

### Dashboard do tatuador

Status: base implementada em revisao local; exige fechamento visual mobile e teste autenticado.

- Home.
- Editor de perfil.
- Upload de avatar/capa.
- Portfolio limitado.
- Agenda personalizada.
- Datas bloqueadas.
- Configuracao Pix.
- Lista de agendamentos.
- Aprovar/recusar.
- Historico de pagamentos.
- Aviso de mensalidade/acesso.
- Troca de senha no painel.
- Endereco completo do estudio para gerar coordenadas de proximidade.
- Caixa de notificacoes internas implementada no codigo local, dependente de SQL e teste.
- Comprovante Pix agora exige token da reserva e revisao explicita antes de marcar sinal como pago, dependente do SQL de seguranca.

### Agendamento

Status: pronto para teste real.

- Cliente escolhe data e horario.
- Sistema valida agenda no backend.
- Sistema impede horario aprovado duplicado.
- Cliente envia dados e descricao.
- Se sinal estiver ativo, cliente ve Pix e envia comprovante.
- Comprovante fica privado.
- Tatuador aprova ou recusa.
- WhatsApp abre com mensagem pronta.

### Uploads

Status: implementado.

- Avatar, capa e portfolio vao para pasta publica da VPS.
- Comprovantes vao para pasta privada.
- Backend usa `sharp` para converter imagem para WebP.
- Limites de tamanho ficam no `api/.env`.

### Admin

Status: pronto para teste real controlado depois da validacao do banco.

- Login admin separado.
- Lista de cadastrados.
- Pagos.
- Inadimplentes.
- Teste gratis.
- Beneficios manuais.
- Confirmacao manual de pagamento InfinitePay como fallback.
- Bloqueio/desbloqueio de perfil.
- Beneficio por modal.
- Desbloqueio temporario separado.
- Configuracao de preco da mensalidade.

### Busca e descoberta

Status: publicado com endereco completo.

- Pedido automatico de permissao de localizacao ao entrar na busca.
- Ordenacao por proximidade quando o visitante permite localizacao.
- Cards mostram distancia quando artista tem coordenadas.
- Cards nao somem quando artista ainda nao tem coordenadas.
- Badges visuais para agenda aberta, novo artista, recem cadastrado, em alta e perto de voce.
- Endereco completo do estudio alimenta coordenadas confiaveis quando o tatuador gera a localizacao.

### Landing e pitch

Status: implementados.

- Landing page de entrada do produto.
- Pitch page em `/pitch`.
- Pitch com TAM RJ/SP, MRR/ARR, cenarios de 100/1.000/10.000 pagantes, tese de investimento e alavancas de crescimento.
- Ajuste pendente se o texto/CTA do pitch ainda precisar refinamento visual antes de envio a investidor.

### Pagamento da plataforma

Status: implementado com InfinitePay Checkout API.

Fluxo principal:

1. Tatuador clica em pagar mensalidade.
2. API cria checkout na InfinitePay.
3. API registra tentativa em `platform_payments`.
4. InfinitePay envia webhook para a API.
5. API valida pelo `payment_check`.
6. API marca pagamento como aprovado.
7. API libera +30 dias corridos em `artist_access_grants`.
8. Perfil volta a ficar ativo.

Env principal:

```env
INFINITEPAY_HANDLE=danbrennermoura
INFINITEPAY_WEBHOOK_URL=https://api.danielbrenner.online/api/infinitepay/webhook
```

Links fixos antigos de checkout/assinatura foram removidos do `.env`.

## Regras de acesso

Status: definidas e implementadas no SQL.

- Novo tatuador recebe 7 dias gratis.
- Perfil publico exige acesso ativo.
- Portfolio, agenda publica, likes e agendamento tambem exigem acesso ativo.
- Sem acesso ativo, perfil fica bloqueado.
- Tatuador bloqueado continua podendo logar.
- Painel bloqueado mostra apenas inicio/pagamentos.
- Pagamento aprovado libera 30 dias corridos.
- Admin pode aplicar beneficio manual.

## Pendencias reais antes de usuarios reais

### 0. Testar a copia publicada com usuarios controlados

Prioridade: maxima.

Validar:

- que o dashboard mobile tenha padrao visual e navegacao aprovados;
- que um tatuador logado possa visitar outro perfil sem ganhar edicao ou trocar de contexto;
- comunicacao interna: testar sino, leitura e mensagem do suporte;
- reserva/pagamento: testar comprovante, revisao e InfinitePay.

### 1. Testar pagamento real InfinitePay

Prioridade: maxima.

Validar:

- checkout abre;
- pagamento conclui;
- webhook chega;
- pagamento muda para aprovado;
- acesso ganha +30 dias;
- historico aparece para tatuador;
- admin ve como pago.

### 2. Testar cadastro limpo

Prioridade: alta.

Validar com usuario novo:

- conta criada;
- perfil criado;
- trial de 7 dias criado;
- perfil aparece publico;
- endereco completo gera coordenadas;
- busca mostra distancia quando cliente permite localizacao;
- apos simular vencimento, bloqueia.

### 3. Testar uploads reais

Prioridade: alta.

Validar:

- avatar;
- capa;
- portfolio;
- comprovante.

### 4. Testar jornada completa de agenda

Prioridade: alta.

Validar:

- tatuador cria horarios por data;
- cliente escolhe dia e horario correto;
- cliente agenda;
- status muda corretamente no painel;
- tatuador edita/visualiza agendamento conforme regra de data/hora;
- horarios passados nao ficam editaveis.

### 5. Pente fino de estados de erro

Prioridade: media.

Validar:

- sem horario;
- perfil inexistente;
- pagamento falhou;
- upload falhou;
- usuario sem perfil;
- admin sem permissao.
- endereco nao encontrado;
- localizacao negada pelo visitante.

## Pos-MVP

Nao entra antes do teste real:

- assinatura recorrente por link, se a InfinitePay liberar webhook oficial;
- area de cliente;
- seguir tatuadores;
- feed social;
- comentarios;
- favoritos por conta de cliente;
- importacao Instagram;
- relatorios financeiros avancados;
- notificacoes por email;
- app mobile.

## Definicao atual de MVP pronto

O MVP esta pronto para teste real quando:

- Supabase estiver com SQL novo aplicado;
- tatuador novo ganhar 7 dias gratis;
- tatuador criar perfil completo;
- cliente conseguir agendar;
- tatuador aprovar/recusar;
- pagamento InfinitePay liberar +30 dias automaticamente;
- perfil vencido ficar bloqueado para o publico;
- admin conseguir verificar pagos/inadimplentes.
- busca por proximidade funcionar com endereco real do estudio.
