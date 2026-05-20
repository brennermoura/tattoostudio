# Prompt do Produto - TatuApp

Criar uma plataforma SaaS simples e moderna para tatuadores, com foco inicial em:

- perfil publico profissional;
- portfolio enxuto;
- agendamento online;
- busca por proximidade;
- reserva com sinal Pix;
- painel simples do tatuador;
- mensalidade da plataforma com controle de acesso.

## Fase atual: MVP

O MVP deve resolver o basico muito bem:

- tatuador cria conta;
- monta perfil;
- sobe fotos;
- configura agenda;
- informa endereco completo do estudio;
- gera localizacao para aparecer perto do cliente;
- configura Pix do sinal;
- recebe pedidos de agendamento;
- aprova ou recusa;
- paga mensalidade da plataforma;
- fica bloqueado se nao pagar.

## Pagamento da plataforma

Fluxo escolhido:

- InfinitePay Checkout API;
- um checkout gerado por pagamento;
- webhook em `https://api.danielbrenner.online/api/infinitepay/webhook`;
- pagamento aprovado libera +30 dias corridos;
- novo tatuador recebe 7 dias gratis;
- vencido fica bloqueado para o publico, mas ainda consegue logar e pagar.

## Arquitetura atual

- Frontend: React + Vite + Tailwind.
- Banco/Auth: Supabase.
- API: Node/Express em VPS.
- Uploads: pasta da VPS.
- Comprovantes: pasta privada da VPS.

## Estado operacional atual

- Publicado: front, API, busca com permissao de localizacao, uploads, dashboard, admin, perfil publico, landing e pitch.
- Implementado localmente e pendente de SQL/deploy: endereco completo do estudio e geocodificacao por endereco.
- Bloqueadores de teste real: aplicar SQL pendente, publicar pacote atual, validar pagamento InfinitePay ponta a ponta e testar cadastro limpo.

## Direcao pos-lancamento

Depois do MVP validado, o TatuApp deve evoluir para algo mais social:

- area de usuario/cliente;
- seguir tatuadores;
- tatuadores seguirem tatuadores;
- descoberta por cidade e estilo;
- perfis mais parecidos com Instagram de tattoo;
- relacionamento cliente/tatuador dentro da plataforma.

Essa evolucao nao deve bloquear o MVP.

## Filosofia

Primeiro: funcionar, cobrar, bloquear e agendar.

Depois: crescer para comunidade visual de tattoo.
