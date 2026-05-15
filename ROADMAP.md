# Roadmap - TatuApp

## Direcao do produto

O TatuApp e uma plataforma simples para tatuadores terem um mini site profissional, portfolio curto, agenda online e reserva com sinal via Pix.

O objetivo nao e criar rede social, marketplace complexo ou sistema pesado. O produto precisa resolver uma dor direta:

- organizar agenda;
- reduzir cliente que fura;
- centralizar portfolio;
- facilitar reserva;
- diminuir atendimento caotico por WhatsApp;
- passar mais profissionalismo para o cliente final.

Principio de design atual: a identidade visual ja foi definida no prototipo. Nao alterar layout, cores, hierarquia ou estilo deliberadamente sem decisao explicita. Proximas entregas devem priorizar comportamento, fluxo e confiabilidade.

---

## Estado atual do prototipo

### Base tecnica

Status: prototipo local com migracao para Supabase em andamento.

- App em React + Vite + Tailwind.
- Dados locais com `localStorage` como fallback/prototipo offline.
- Client Supabase configurado por `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Schema inicial em `database/schema.sql`.
- Autenticacao real por email/senha implementada no frontend.
- Recuperacao de senha por link de email implementada via Supabase Auth.
- Mock principal em `src/data/mockData.ts`.
- Tipos principais em `src/types/index.ts`.
- Navegacao local por URL:
  - `/` como diretório publico de profissionais.
  - `/explorar`
  - `/landing`
  - `/login`
  - `/register`
  - `/dashboard`
  - `/{slug}`, exemplo `/brennermoura`.

Limitacao atual: o banco ja tem schema/RLS inicial e o dashboard ja persiste dados principais no Supabase. Storage real segue pendente por decisao de usar pasta local da hospedagem, nao Supabase Storage.

---

## Funcionalidades concluidas no prototipo

### Perfil publico do tatuador

Status: funcional.

- Abre por slug direto na URL.
- Mostra capa, avatar, nome artistico, cidade, bio, estilos, portfolio, WhatsApp e CTA de agenda.
- Link do Instagram para ver portfolio completo.
- Album de fotos com modal, fechar, proxima foto, foto anterior e contador.
- Informacoes de agenda no perfil.
- CTA inferior para agendamento.
- Sistema de curtidas por visitante anonimo.
- Contagem de curtidas pronta para alimentar ranking de profissionais em alta.
- Com Supabase configurado, slug inexistente mostra estado de perfil nao encontrado em vez de reaproveitar dados antigos.

Ponto de atencao: ainda falta testar multiplos perfis reais ponta a ponta com dados de usuarios diferentes.

### Entrada/onboarding via Instagram

Status: descartado para autenticacao/portfolio no MVP.

Decisao: Instagram fica como campo/link de perfil. Nao usar API do Instagram nem login com Instagram no MVP.

Motivos:

- Supabase Auth nao traz Instagram como provider social nativo; suporta providers como Google/Facebook e providers customizados OAuth/OIDC.
- A API oficial do Instagram mudou bastante desde a descontinuacao do Basic Display API, e acesso a dados de perfil tende a exigir conta profissional/Creator/Business e aprovacoes da Meta.
- Para MVP, o caminho mais robusto e pedir o Instagram/handle e permitir colar links externos de imagem para avatar e capa.

Fluxo recomendado:

1. Tatuador cria conta por email e senha.
2. Informa o Instagram/handle.
3. Pode colar link da foto de perfil.
4. Pode colar link da capa/banner.
5. Pode fazer upload se preferir.
6. Futuramente, se entrar receita e fizer sentido, reavaliar API externa de midia.

### Autenticacao

Status: implementada em primeira versao.

- Login real com email/senha via Supabase Auth.
- Cadastro real com email/senha via Supabase Auth.
- Metadados de cadastro enviados para criacao do perfil de tatuador.
- Recuperacao de senha com link por email.
- Tela `/login?recovery=1` permite definir nova senha apos abrir o link de recuperacao.
- Sessao persistida pelo Supabase no navegador.
- Logout encerra sessao real quando Supabase esta configurado.

Ponto de atencao: se a confirmacao de email estiver ativa no Supabase, o usuario precisa confirmar o email antes de entrar. O schema inclui trigger para criar perfil automaticamente a partir dos metadados do cadastro.

### Painel do tatuador

Status: funcional com persistencia inicial no Supabase.

- Home do dashboard com resumo.
- Aviso de mensalidade dentro da home do dashboard.
- Botao para gerar QR Pix da mensalidade da plataforma.
- QR Pix da mensalidade gerado pelo sistema em formato BR Code/EMV a partir da chave Pix, valor, nome, cidade e txid.
- Exibicao de acesso liberado por prazo ou vitalicio.
- Editor de perfil.
- Upload local de avatar e capa com compressao.
- Editor de portfolio com limite de 10 fotos.
- Upload local de fotos do portfolio com compressao.
- Configuracao de Pix.
- Lista de agendamentos.
- Aprovar ou recusar reservas.
- Notificacao via WhatsApp com mensagem pronta ao aprovar/recusar.
- Salvamento de perfil, Pix, agenda, datas bloqueadas e portfolio por URL no Supabase.
- Aprovar/recusar agendamento atualiza `appointments` no Supabase.

Ponto de atencao: uploads locais ainda nao vao para a hospedagem. Imagens em `data:` continuam como fallback local ate a API de upload existir.

### Painel administrativo

Status: dashboard financeiro/admin em evolucao, pendente de aplicar SQL atualizado no Supabase.

- Rota `/admin`.
- Controle de acesso por tabela `platform_admins`.
- Cards/graficos clicaveis para:
  - pagamentos recebidos;
  - inadimplentes;
  - cadastrados no site.
- Todas as listas administrativas abrem em modal.
- Busca por nome, slug, Instagram, WhatsApp ou cidade dentro do modal.
- Diferenciacao entre liberacao por pagamento Pix recebido e cortesia gratuita.
- Toggle on/off de bloqueio dentro da lista de inadimplentes.
- Perfil bloqueado sai do publico e nao recebe novos agendamentos.
- Tatuador bloqueado continua acessando o dashboard e ve mensagem de bloqueio por falta de confirmacao de pagamento.
- Liberacao manual gratuita por:
  - 1 mes;
  - 1 ano;
  - data personalizada;
  - vitalicio.
- Registro das liberacoes em `artist_access_grants`.

Ponto de atencao: depois de aplicar o SQL, e necessario inserir manualmente o primeiro admin na tabela `platform_admins`. O bloqueio real de funcionalidades por mensalidade ainda nao foi ativado; nesta etapa o sistema mostra status e permite gerenciar liberacoes.

### Diretório publico de profissionais

Status: primeira versao funcional.

- Rota `/` como pagina inicial.
- Rota alternativa `/explorar`.
- Landing comercial preservada em `/landing`.
- Listagem publica apenas de perfis ativos.
- Filtros por cidade, estado e estilo.
- Filtro por estado com dado estruturado separado da cidade.
- Autocomplete de cidade e estado por texto na exploracao.
- Autocomplete de estado por texto no cadastro/edicao do perfil do tatuador.
- Busca por nome, cidade, Instagram ou estilo.
- Ordenacao padrao por profissionais em alta.
- Ordenacao "em alta" considera curtidas.
- Card/chamada para tatuadores conhecerem a plataforma e se cadastrarem.
- Sistema de curtidas ja criado em `artist_likes` para alimentar esse ranking sem exigir login do cliente.

Ponto de atencao: futuramente o ranking "em alta" pode combinar curtidas com agendamentos aprovados recentes para reduzir distorcao.

### Agenda personalizada

Status: funcional com persistencia inicial no Supabase.

- Tatuador configura horarios exatos por dia da semana.
- Exemplo: Segunda `10:00`, `15:00`; Terca `11:30`, `17:00`.
- Cliente ve apenas horarios cadastrados para o dia escolhido.
- Datas bloqueadas continuam funcionando.
- Horario aprovado fica indisponivel.

Decisao tomada: nao usar mais faixa generica de entrada/saida como regra principal de agenda.

### Fluxo de reserva

Status: funcional com gravacao inicial no Supabase.

Fluxo atual:

1. Cliente escolhe data.
2. Cliente escolhe horario.
3. Cliente informa nome, WhatsApp, email e descricao da tattoo.
4. Se houver sinal ativo, cliente ve Pix.
5. Cliente anexa comprovante PDF ou imagem.
6. Reserva entra como pendente.
7. Tatuador confere comprovante manualmente.
8. Tatuador aprova ou recusa.
9. Sistema abre WhatsApp com mensagem pronta.
10. Cliente ve tela de sucesso apos envio e volta ao perfil quando quiser.

Regra atual:

- Sem gateway, o sistema nao confirma pagamento automaticamente.
- O status correto e `comprovante enviado, aguardando conferencia`.
- A aprovacao final depende do tatuador conferir no banco/app Pix.

### Sinal via Pix

Status: funcional com persistencia inicial no Supabase.

- Tatuador configura chave Pix.
- Tatuador configura valor do sinal.
- QR Pix do sinal gerado pelo sistema em formato BR Code/EMV a partir da chave do tatuador.
- Tatuador pode ativar ou desativar sinal obrigatorio.
- Se sinal estiver desativado, cliente envia solicitacao sem etapa Pix.
- Se reserva com sinal for recusada, mensagem orienta usar o sinal como credito para novo horario.
- Cliente pode marcar que esta usando sinal anterior de uma reserva recusada.

Ponto de atencao: nao existe confirmacao bancaria automatica.

---

## O que falta para um MVP vendavel

### 1. Persistencia real com Supabase

Prioridade: alta.

Implementar:

- Supabase Auth. Status: primeira versao feita.
- Tabela de tatuadores. Status: feito.
- Tabela de perfis publicos. Status: feito.
- Tabela de portfolios. Status: feito.
- Tabela de agendas/horarios personalizados. Status: feito.
- Tabela de datas bloqueadas. Status: feito.
- Tabela de reservas. Status: feito.
- Tabela de configuracao Pix. Status: feito.
- Tabela de comprovantes. Status: schema feito, upload/leitura autenticada em primeira versao.
- Row Level Security para cada tatuador acessar somente seus dados. Status: primeira versao feita.
- Dashboard salvando perfil/Pix/agenda/datas/portfolio por URL. Status: feito.
- Dashboard aprovando/recusando reservas no banco. Status: feito.

Criterio de pronto:

- Dois tatuadores diferentes podem ter perfis diferentes.
- Cada um ve somente seu dashboard.
- Slugs publicos funcionam sem login.
- Reservas do perfil publico entram no dashboard correto.

### 2. Uploads em pasta da hospedagem

Prioridade: alta.

Status: infraestrutura inicial implementada, pendente de teste com `SUPABASE_SERVICE_ROLE_KEY`.

Decisao atual: nao usar Supabase Storage no MVP. Os arquivos podem ser gravados em uma pasta de uploads na hospedagem, em modelo parecido com WordPress, enquanto o banco guarda metadados e caminhos. Para reduzir custo e volume, avatar/capa/portfolio tambem podem aceitar URL externa quando o tatuador preferir colar um link.

Implementar:

- Upload de avatar. Status: endpoint e frontend ligados.
- Upload de capa. Status: endpoint e frontend ligados.
- Upload de portfolio. Status: endpoint e frontend ligados.
- Campo para URL externa de avatar.
- Campo para URL externa de capa.
- Futuro campo para URL externa de portfolio, se fizer sentido.
- Upload de comprovante PDF/imagem. Status: endpoint e frontend ligados apos criacao da reserva.
- Limite de tamanho de arquivo. Status: configurado por env.
- Compressao de imagem antes/depois do upload. Status: backend converte imagens para WebP com `sharp`.
- Pasta de uploads com identificacao forte. Status: usando UUID e estrutura por `artist_id`.
- Metadados no banco:
  - `artist_id`;
  - `appointment_id`, quando for comprovante;
  - tipo do arquivo;
  - origem do arquivo: `upload`, `external_url` ou `instagram`;
  - nome original;
  - nome interno gerado;
  - caminho;
  - tamanho;
  - mime type;
  - data de upload.
- Acesso:
  - portfolio/capa/avatar podem ser publicos;
  - comprovantes devem ser privados e servidos por rota autenticada. Status: primeira versao feita com `PRIVATE_UPLOADS_DIR` e rota autenticada.

Criterio de pronto:

- Arquivos nao ficam mais em base64 no navegador.
- Comprovantes abrem no painel do tatuador.
- Cliente nao acessa comprovantes de outros clientes.
- O sistema consegue relacionar cada comprovante com uma reserva especifica.
- Avatar/capa podem funcionar com URL externa sem consumir disco da hospedagem.

Estrutura sugerida:

```txt
/uploads
  /artists
    /{artist_id}
      /avatar
      /cover
      /portfolio
      /appointments
        /{appointment_id}
          comprovante-{uuid}.pdf
```

Observacao tecnica: isso exige backend em hospedagem com filesystem persistente. Nao funciona bem em ambiente serverless puro, onde o filesystem pode ser temporario.

Implementacao atual:

- API local em `api/upload-server.mjs`.
- Script `npm run api:dev`.
- Proxy Vite para `/api` e `/uploads` em desenvolvimento.
- Avatar, capa e portfolio ficam em `UPLOADS_DIR` e sao publicos.
- Comprovantes ficam em `PRIVATE_UPLOADS_DIR` e abrem por `/api/appointment-files/:fileId/open` com token do tatuador.
- Env backend esperado em `api/.env`:
  - `SUPABASE_URL`;
  - `SUPABASE_SERVICE_ROLE_KEY`;
  - `API_PORT`;
  - `UPLOADS_DIR`;
  - `PRIVATE_UPLOADS_DIR`;
  - `PUBLIC_UPLOAD_BASE_URL`.
- Frontend continua com `.env.local` apenas para `VITE_*`.

### 3. Agendamento robusto

Prioridade: alta.

Status: parcialmente feito.

Implementar:

- Travar conflitos de horario no backend. Status: feito em primeira versao por RPC.
- Garantir que horario aprovado nao possa ser reservado por outra pessoa. Status: feito via indice parcial e validacao na RPC.
- Definir comportamento para reserva pendente:
  - permitir varias pendentes no mesmo horario;
  - ou segurar temporariamente por X minutos;
  - decisao ainda pendente.
- Validar dias bloqueados no backend. Status: feito na RPC de criacao de reserva.
- Validar horarios personalizados no backend. Status: feito na RPC de criacao de reserva.

Criterio de pronto:

- Nao existe duplicidade de horario aprovado. Status: feito em primeira versao.
- Horario fora da agenda nao pode ser enviado via manipulacao de frontend. Status: feito em primeira versao.

### 4. Fluxo de comprovante e conferencia

Prioridade: alta.

Implementar status mais claros:

- `pending_proof` se precisar de sinal e ainda nao anexou comprovante.
- `proof_sent` quando comprovante foi enviado.
- `approved` quando tatuador conferiu e aprovou.
- `rejected` quando recusou.
- `credit_available` quando recusou com sinal reaproveitavel.

Criterio de pronto:

- Dashboard mostra exatamente o que o tatuador precisa fazer.
- Cliente recebe mensagem coerente via WhatsApp.
- Recusa com sinal orienta reagendamento sem novo pagamento.

### 5. WhatsApp e mensagens

Prioridade: media.

Hoje o sistema abre `wa.me` com mensagem pronta. Para MVP, isso pode continuar.

Melhorias:

- Mensagens editaveis pelo tatuador no futuro.
- Mensagem diferente para:
  - aprovacao;
  - recusa sem sinal;
  - recusa com credito;
  - pedido de ajuste de referencia;
  - lembrete antes da sessao.

Criterio de pronto:

- Toda acao importante no painel gera uma mensagem clara.
- O tatuador nao precisa reescrever tudo manualmente.

### 6. Polimento de UX funcional

Prioridade: media.

Sem alterar identidade visual, revisar:

- Textos de erro.
- Estados vazios.
- Estados de loading.
- Confirmacoes depois de salvar.
- Campos obrigatorios.
- Validacao de telefone/WhatsApp.
- Validacao de slug.
- Limite real de bio.
- Limite real de 10 fotos.
- Feedback quando arquivo e anexado.

Criterio de pronto:

- Usuario entende o que aconteceu apos cada acao.
- Nao existe botao que pareca funcional e nao faca nada.

### 7. Plano unico e acesso

Prioridade: media.

Implementar:

- Plano unico ativo/inativo.
- Bloquear dashboard se assinatura estiver inativa.
- Perfil publico pode mostrar estado controlado se conta estiver suspensa.

Fase posterior:

- Stripe, Mercado Pago ou outro provedor para assinatura da plataforma.

---

## Decisoes de produto ja tomadas

- Nao criar rede social.
- Nao criar feed infinito.
- Portfolio limitado a 10 fotos.
- Instagram serve como saida para ver mais trabalhos.
- Agenda usa horarios personalizados por dia.
- Sinal Pix e opcional por tatuador.
- Pagamento Pix manual nao e confirmado automaticamente.
- Comprovante PDF/imagem e suficiente no MVP.
- Nao usar Supabase Storage no MVP; usar pasta `uploads` na hospedagem com metadados no banco.
- Permitir URL externa para avatar/capa como forma de reduzir storage propio.
- Instagram sera usado inicialmente como handle/link e possivel origem de imagem, nao como unica forma de login.
- Tatuador confere pagamento manualmente.
- Recusa com sinal pode virar credito para outro horario.
- WhatsApp sera usado para comunicacao de confirmacao/recusa no MVP.

---

## Decisoes pendentes

### Reserva pendente bloqueia horario?

Opcoes:

1. Nao bloqueia ate aprovacao.
   - Mais simples.
   - Pode gerar varias solicitacoes para o mesmo horario.

2. Bloqueia temporariamente por 15 minutos.
   - Melhor experiencia para cliente.
   - Precisa job/expiracao no backend.

3. Bloqueia quando comprovante e enviado.
   - Meio termo.
   - Ainda pode prender horario com comprovante invalido.

Recomendacao atual: para MVP, bloquear somente apos aprovacao.

### Gateway de pagamento automatico?

Opcoes:

1. Pix manual com comprovante.
   - Mais simples.
   - Menos burocracia.
   - Sem confirmacao automatica.

2. Mercado Pago/PagBank/Asaas com Pix automatico.
   - Confirmacao real via webhook.
   - Mais complexo.
   - Exige backend e configuracao financeira.

Recomendacao atual: MVP com Pix manual. Preparar dados para evoluir depois.

### Onde armazenar arquivos?

Decisao atual: usar pasta `uploads` na propria hospedagem, nao Supabase Storage.

Cuidados obrigatorios:

- nunca confiar apenas no nome original do arquivo;
- gerar nome interno com UUID forte;
- guardar metadados no banco;
- manter comprovantes fora de uma pasta publica direta, ou proteger acesso por rota autenticada;
- validar MIME type e tamanho;
- separar arquivos por `artist_id` e `appointment_id`.

Recomendacao atual: portfolio/capa/avatar podem ser servidos publicamente; comprovantes devem ser privados.

### Login com Instagram?

Decisao atual: nao tratar Instagram como login principal no MVP.

Opcoes:

1. Login simples com email/senha ou magic link.
   - Mais previsivel.
   - Menos dependencia da Meta.

2. Login social com Google/Facebook via Supabase.
   - Mais facil de configurar em Supabase Auth.
   - Bom para reducao de friccao.

3. Instagram API com Instagram Login ou Facebook Login.
   - Pode ajudar a importar username/foto em contas profissionais.
   - Exige configuracao Meta, revisao/permissoes e pode nao funcionar para todo tipo de conta.

Recomendacao atual: MVP com email/magic link e campo de Instagram. Depois avaliar importacao via API oficial para contas profissionais.

### Reembolso ou credito?

Opcoes:

1. Credito para reagendamento.
   - Simples.
   - Menos fluxo financeiro.

2. Devolucao manual.
   - Necessaria em alguns casos.
   - Precisa campo "reembolso realizado" no painel.

Recomendacao atual: recusa padrao gera credito para novo horario sem pagar novamente.

---

## Proxima ordem recomendada

### Sprint 1 - Fechar prototipo local

Objetivo: deixar o prototipo local consistente para demonstracao.

- Revisar todos os fluxos principais ponta a ponta.
- Corrigir textos que prometem confirmacao automatica.
- Validar agendamento com sinal ativo.
- Validar agendamento sem sinal.
- Validar recusa com credito.
- Validar album, upload e portfolio.
- Validar rotas `/`, `/dashboard`, `/brennermoura`.
- Criar dados demo mais realistas.

### Sprint 2 - Backend e banco MVP

Objetivo: sair de `localStorage` para base real.

- Criar schema do banco. Status: feito em primeira versao em `database/schema.sql`.
- Criar autenticacao. Status: feito com email/senha e recuperacao de senha.
- Criar regra de isolamento por tatuador. Status: feito em primeira versao via RLS.
- Migrar perfil. Status: feito para dados textuais e URLs.
- Migrar portfolio. Status: feito para URLs e uploads iniciais.
- Migrar agenda personalizada. Status: feito.
- Migrar reservas. Status: feito em primeira versao.
- Migrar Pix. Status: feito.
- Implementar upload em pasta da hospedagem. Status: infraestrutura inicial feita.
- Migrar comprovantes para pasta privada com metadados no banco. Status: primeira versao ligada ao fluxo de reserva.

Progresso atual:

- Client Supabase criado em `src/lib/supabase.ts`.
- `.env.example` criado com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Servico inicial criado em `src/services/artistService.ts`.
- Perfil publico por slug ja tenta carregar do Supabase quando as variaveis estao configuradas.
- Criacao de reserva ja tenta gravar no Supabase quando as variaveis estao configuradas.
- Criacao de reserva publica usa RPC `create_public_appointment` com validacao de perfil ativo, data, data bloqueada, horario cadastrado e conflito aprovado.
- RPC de reserva busca sinal/valor diretamente de `artist_pix_settings`, sem confiar no frontend para dizer se o sinal e obrigatorio.
- Dashboard salva perfil, Pix, agenda, datas bloqueadas e portfolio por URL no Supabase.
- Upload API local criada para avatar, capa, portfolio e comprovante.
- Dashboard aprova/recusa reservas no Supabase.
- Auth real com sessao persistida e recuperacao de senha esta funcionando.
- Fallback local continua funcionando quando Supabase nao estiver configurado.

### Sprint 3 - MVP vendavel

Objetivo: deixar pronto para primeiros tatuadores testarem.

- Onboarding real.
- Campo de Instagram no onboarding.
- Opcoes de avatar/capa por upload ou URL externa.
- Dashboard protegido por login.
- Perfil publico por slug real.
- Upload real na hospedagem.
- Mensagens WhatsApp consistentes.
- Estados de pagamento/conferencia claros.
- Politicas basicas de privacidade e termos.

### Sprint 4 - Receita

Objetivo: cobrar pelo SaaS.

- Plano unico.
- Assinatura da plataforma.
- Bloqueio por status de assinatura.
- Email/WhatsApp de cobranca ou aviso.
- Pagina simples de configuracao da conta.

### Sprint 5 - Pagamento automatico opcional

Objetivo: evoluir sem obrigar complexidade no inicio.

- Avaliar Mercado Pago, PagBank ou Asaas.
- Criar cobranca Pix por API.
- Webhook de pagamento.
- Status `paid` automatico.
- Manter Pix manual como modo simples.

---

## Riscos principais

- Confundir comprovante enviado com pagamento confirmado.
- Permitir duplicidade de horario aprovado.
- Deixar comprovante publico por erro de upload/rota.
- Perder arquivos por usar hospedagem sem filesystem persistente.
- Nao ter backup da pasta `uploads`.
- Dar liberdade visual demais e quebrar o padrao do produto.
- Criar complexidade financeira antes de validar demanda.
- Tentar automatizar pagamento cedo demais.

---

## Definicao de MVP

O MVP esta pronto quando:

- Tatuador cria conta.
- Tatuador monta perfil publico.
- Tatuador sobe ate 10 fotos.
- Tatuador configura horarios personalizados.
- Tatuador configura sinal Pix ativo/inativo.
- Cliente acessa o link publico.
- Cliente escolhe horario disponivel.
- Cliente envia referencia da tattoo.
- Cliente paga sinal se exigido.
- Cliente anexa comprovante se exigido.
- Reserva aparece no painel.
- Tatuador confere e aprova/recusa.
- Cliente recebe mensagem pronta via WhatsApp.
- Horario aprovado fica indisponivel.
