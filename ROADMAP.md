# Roadmap - TatuApp

Atualizado em 2026-05-19.

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

### Implementado localmente, aguardando SQL/deploy

- Endereco completo do estudio no perfil do tatuador.
- Geocodificacao do endereco para `latitude`/`longitude`.
- Campo separado de referencia publica, para mostrar algo como `Proximo ao Centro` sem expor o endereco completo.
- Cards da busca e perfil publico usando referencia publica quando existir.
- SQL pendente: `database/artist-full-address-location.sql`.

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

Status: publicada.

- API em `https://api.danielbrenner.online`.
- Processo PM2 `tatuapp-api`.
- Health check: `/api/health`.
- Uploads publicos na VPS.
- Comprovantes privados na VPS.
- Webhook InfinitePay em `/api/infinitepay/webhook`.

### Banco

Status: schema pronto no repo, alguns SQLs ja aplicados pelo usuario e `artist-full-address-location.sql` pendente antes do proximo deploy com endereco completo.

Arquivos principais:

- `database/schema.sql`;
- `database/infinitepay-subscriptions-access.sql`;
- `database/date-specific-appointment-slots.sql`;
- `database/platform-admin-controls.sql`;
- `database/self-service-grace-period.sql`;
- `database/portfolio-photo-captions.sql`;
- `database/artist-full-address-location.sql`.

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

Status: pronto para teste real, com melhoria de localizacao pendente de SQL/deploy.

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

Status: pronto para teste real, com endereco completo implementado localmente e pendente de SQL/deploy.

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

Status: publicado, com evolucao de endereco completo pendente de SQL/deploy.

- Pedido automatico de permissao de localizacao ao entrar na busca.
- Ordenacao por proximidade quando o visitante permite localizacao.
- Cards mostram distancia quando artista tem coordenadas.
- Cards nao somem quando artista ainda nao tem coordenadas.
- Badges visuais para agenda aberta, novo artista, recem cadastrado, em alta e perto de voce.
- Proximo passo: usar endereco completo do estudio para alimentar coordenadas confiaveis.

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

### 1. Aplicar SQL de endereco completo no Supabase

Prioridade: maxima.

Rodar:

- `database/artist-full-address-location.sql`.

Sem isso, o deploy com endereco completo pode quebrar consultas do perfil/busca.

### 2. Publicar pacote atual depois do SQL

Prioridade: maxima.

Publicar o build que inclui:

- pitch/landing atualizados;
- endereco completo;
- geocodificacao por endereco;
- referencia publica de localizacao.

### 3. Testar pagamento real InfinitePay

Prioridade: maxima.

Validar:

- checkout abre;
- pagamento conclui;
- webhook chega;
- pagamento muda para aprovado;
- acesso ganha +30 dias;
- historico aparece para tatuador;
- admin ve como pago.

### 4. Testar cadastro limpo

Prioridade: alta.

Validar com usuario novo:

- conta criada;
- perfil criado;
- trial de 7 dias criado;
- perfil aparece publico;
- endereco completo gera coordenadas;
- busca mostra distancia quando cliente permite localizacao;
- apos simular vencimento, bloqueia.

### 5. Testar uploads reais

Prioridade: alta.

Validar:

- avatar;
- capa;
- portfolio;
- comprovante.

### 6. Testar jornada completa de agenda

Prioridade: alta.

Validar:

- tatuador cria horarios por data;
- cliente escolhe dia e horario correto;
- cliente agenda;
- status muda corretamente no painel;
- tatuador edita/visualiza agendamento conforme regra de data/hora;
- horarios passados nao ficam editaveis.

### 7. Pente fino de estados de erro

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
