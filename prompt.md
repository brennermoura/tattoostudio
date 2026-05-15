Prompt — Plataforma SaaS Simples para Tatuadores

Criar uma plataforma SaaS simples, moderna e extremamente fácil de usar para tatuadores, focada em:

- mini site profissional;
- portfólio enxuto;
- agendamento;
- reserva com sinal via Pix;
- organização visual limpa.

A proposta NÃO é criar uma rede social e NÃO é criar um sistema complexo cheio de planos e funcionalidades. O foco é simplicidade, velocidade e facilidade de manutenção.

---

Conceito do Produto

Cada tatuador terá sua própria página personalizada dentro da plataforma.

Exemplos:

- tatu.com/joaoink
- tatu.com/maria.tattoo

A página deve funcionar como:

- vitrine profissional;
- cartão digital;
- agenda online;
- portfólio resumido.

---

Objetivo Principal

Resolver os problemas reais do tatuador:

- organização da agenda;
- evitar clientes furando;
- facilitar reserva;
- centralizar portfólio;
- parecer mais profissional;
- evitar atendimento caótico pelo WhatsApp.

---

Estrutura do Perfil do Tatuador

O tatuador poderá configurar:

Perfil

- nome artístico;
- foto de perfil;
- imagem de capa/banner;
- Instagram;
- WhatsApp;
- localização/cidade;
- estilos de tattoo.

---

Bio

A bio deve ser curta e organizada.

Regras:

- limitar quantidade de caracteres;
- máximo de 1 pequeno parágrafo;
- permitir emojis;
- evitar textos gigantes;
- visual parecido com bio do Instagram.

Objetivo:
manter o layout limpo e bonito sem depender do bom gosto do usuário.

---

Portfólio

O sistema deve limitar:

- máximo de 10 fotos.

Regras:

- exibir apenas os últimos trabalhos;
- imagens comprimidas automaticamente;
- padronizar qualidade;
- limitar tamanho dos arquivos;
- evitar excesso de armazenamento;
- evitar poluição visual.

Se o usuário quiser mostrar mais trabalhos:

- direcionar para Instagram através de botão/link.

Objetivo:
manter o site rápido, bonito e barato de manter.

---

Sistema de Agenda

O tatuador poderá:

- configurar dias disponíveis;
- horários disponíveis;
- pausas;
- dias bloqueados.

Exemplo:

- terça a sábado;
- 10h às 18h;
- pausa de almoço;
- feriados indisponíveis.

---

Fluxo de Agendamento

Cliente:

1. entra no perfil;
2. escolhe horário disponível;
3. envia referência da tattoo;
4. faz pagamento do sinal via Pix;
5. envia comprovante;
6. aguarda aprovação.

Após aprovação:

- horário fica indisponível automaticamente.

---

Sistema Pix

A plataforma NÃO será banco e NÃO processará pagamentos diretamente.

O tatuador apenas configura:

- chave Pix;
  ou
- Pix copia e cola.

O sistema:

- gera QR Code;
- mostra chave Pix;
- permite envio de comprovante.

A confirmação inicial pode ser manual pelo tatuador.

Objetivo:
evitar burocracia financeira e reduzir complexidade técnica.

---

Painel do Tatuador

O painel deve ser extremamente simples.

Funções:

- editar perfil;
- editar bio;
- trocar cores;
- subir até 10 fotos;
- configurar agenda;
- visualizar agendamentos;
- aprovar reservas;
- configurar Pix.

---

Design

Visual:

- minimalista;
- moderno;
- rápido;
- responsivo;
- focado em mobile.

Evitar:

- excesso de informações;
- excesso de personalização;
- layout bagunçado;
- visual poluído.

A plataforma deve manter padrão visual consistente independentemente do usuário.

---

Modelo de Negócio

Plano único.

Sem:

- plano grátis;
- múltiplos planos;
- gamificação;
- rede social;
- funcionalidades desnecessárias.

Objetivo:
baixo custo operacional e simplicidade de manutenção.

---

Tecnologias Sugeridas

Frontend:

- Next.js

Backend:

- Supabase

Banco:

- PostgreSQL

Storage:

- Supabase Storage com compressão e limite de upload.

---

Arquitetura

Sistema multi-tenant:

- cada tatuador acessa apenas seus próprios dados;
- um único sistema atende múltiplos usuários.

---

Filosofia do Produto

Menos funcionalidades.
Mais simplicidade.
Mais velocidade.
Mais facilidade de uso.
Mais foco no problema real.

O sistema deve parecer:
“uma agenda profissional moderna para tatuadores”.