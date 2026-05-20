// import {
//   ArrowLeft,
//   ArrowRight,
//   BarChart3,
//   CheckCircle,
//   CircleDollarSign,
//   Compass,
//   Calendar,
//   LineChart,
//   MessageCircle,
//   Search,
//   Target,
//   Users,
// } from 'lucide-react';

// interface PitchPageProps {
//   onBack: () => void;
//   onOpenLanding: () => void;
//   onRegister: () => void;
// }

// const monthlyPrice = 49;
// const estimatedTam = 26000;

// const costPremises = {
//   100: { ads: 1500, server: 300, devSupport: 4500 },
//   1000: { ads: 8000, server: 700, devSupport: 5500 },
//   10000: { ads: 30000, server: 2500, devSupport: 6500 },
// } as const;

// const scenarios = [100, 1000, 10000].map((users) => ({
//   users,
//   mrr: users * monthlyPrice,
//   arr: users * monthlyPrice * 12,
//   penetration: (users / estimatedTam) * 100,
//   costs: costPremises[users as keyof typeof costPremises],
// }));

// const resultBlocks = [
//   {
//     title: 'Resultado para o tatuador',
//     points: ['perfil profissional compartilhável', 'agenda organizada', 'menos perda de horário', 'mais confiança antes do primeiro contato'],
//   },
//   {
//     title: 'Resultado para o cliente',
//     points: ['busca por cidade e estilo', 'portfólio fácil de comparar', 'agendamento direto', 'menos fricção para escolher um artista'],
//   },
//   {
//     title: 'Resultado para a plataforma',
//     points: ['receita recorrente', 'base proprietária de artistas', 'dados de procura por região', 'caminho natural para comunidade visual de tattoo'],
//   },
// ];

// const marketBlocks = [
//   { city: 'São Paulo', range: '15k a 20k', text: 'profissionais ativos estimados' },
//   { city: 'Rio de Janeiro', range: '7k a 10k', text: 'profissionais ativos estimados' },
//   { city: 'RJ + SP', range: '~26k', text: 'clientes potenciais no foco inicial' },
// ];

// const techExamples = [
//   {
//     side: 'Para profissionais',
//     icon: Calendar,
//     items: [
//       ['Agenda por data', 'evita horários duplicados e reduz negociação manual.'],
//       ['Perfil com QR Code', 'transforma balcão, bio e stories em canal direto de reserva.'],
//       ['Painel de pagamentos', 'mostra acesso ativo, histórico e bloqueio automático quando vence.'],
//       ['Relatórios de agenda', 'ajudam a resolver divergência de horário, cliente e comprovante.'],
//     ],
//   },
//   {
//     side: 'Para quem busca tattoo',
//     icon: Search,
//     items: [
//       ['Busca local', 'mostra artistas por cidade, proximidade e estilo.'],
//       ['Portfólio visual', 'facilita comparar traço, especialidade e confiança.'],
//       ['Horários disponíveis', 'o cliente escolhe sem esperar resposta no WhatsApp.'],
//       ['Prova social', 'curtidas, badges e perfil ativo ajudam na decisão.'],
//     ],
//   },
// ];

// const upsells = [
//   'Taxa de garantia ou sinal de agendamento transacionada pela plataforma.',
//   'Destaque pago no marketplace para tatuadores locais.',
//   'Planos premium com lembretes automatizados via WhatsApp.',
// ];

// function money(value: number) {
//   return new Intl.NumberFormat('pt-BR', {
//     style: 'currency',
//     currency: 'BRL',
//     maximumFractionDigits: 0,
//   }).format(value);
// }

// export default function PitchPage({ onBack, onOpenLanding, onRegister }: PitchPageProps) {
//   return (
//     <div className="min-h-screen bg-[#090909] text-white font-inter">
//       <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090909]/90 backdrop-blur-xl">
//         <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
//           <button
//             type="button"
//             onClick={onBack}
//             className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 transition-colors hover:text-white"
//           >
//             <ArrowLeft size={16} />
//             Home
//           </button>
//           <button
//             type="button"
//             onClick={onOpenLanding}
//             className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-zinc-200 transition-colors hover:bg-white/10"
//           >
//             Ver produto
//           </button>
//         </div>
//       </header>

//       <main>
//         <section className="px-4 py-14 sm:px-6 sm:py-20">
//           <div className="mx-auto max-w-6xl">
//             <div className="max-w-4xl">
//               <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1.5 text-xs font-black text-purple-100">
//                 <LineChart size={14} />
//                 Pitch de investimento
//               </div>

//               <h1 className="text-4xl font-black leading-[1.03] sm:text-6xl">
//                 TatuApp é infraestrutura comercial para um mercado criativo que ainda vende no improviso.
//               </h1>

//               <p className="mt-5 max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg">
//                 O mercado tattoo já tem demanda, influência visual e decisão local. Falta uma camada simples
//                 para transformar descoberta em relacionamento, agenda e receita recorrente.
//               </p>
//             </div>

//             <div className="mt-10 grid gap-4 md:grid-cols-3">
//               {[
//                 { icon: Target, label: 'Nicho', value: 'Tattoo e studios independentes' },
//                 { icon: CircleDollarSign, label: 'Modelo', value: 'SaaS mensal de R$ 49' },
//                 { icon: Compass, label: 'Foco inicial', value: 'Rio de Janeiro e São Paulo' },
//               ].map((item) => (
//                 <article key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
//                   <item.icon size={22} className="text-purple-300" />
//                   <p className="mt-4 text-xs font-black uppercase text-zinc-600">{item.label}</p>
//                   <p className="mt-1 text-lg font-black text-white">{item.value}</p>
//                 </article>
//               ))}
//             </div>
//           </div>
//         </section>

//         <section className="border-y border-white/10 bg-white/[0.025] px-4 py-12 sm:px-6">
//           <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
//             {resultBlocks.map((block) => (
//               <article key={block.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
//                 <h2 className="text-lg font-black">{block.title}</h2>
//                 <div className="mt-4 space-y-3">
//                   {block.points.map((point) => (
//                     <div key={point} className="flex gap-2">
//                       <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-green-300" />
//                       <p className="text-sm leading-relaxed text-zinc-400">{point}</p>
//                     </div>
//                   ))}
//                 </div>
//               </article>
//             ))}
//           </div>
//         </section>

//         <section className="px-4 py-16 sm:px-6">
//           <div className="mx-auto max-w-6xl">
//             <div className="mb-8 max-w-3xl">
//               <p className="text-xs font-black uppercase text-purple-300">Mercado inicial</p>
//               <h2 className="mt-2 text-3xl font-black sm:text-4xl">RJ-SP já é grande o bastante para validar e tracionar.</h2>
//               <p className="mt-3 text-sm leading-relaxed text-zinc-400">
//                 O eixo Rio-São Paulo concentra volume, cultura visual, studios independentes e profissionais MEI.
//                 A tese inicial não depende de dominar o Brasil: começa com captura local pequena e mensurável.
//               </p>
//             </div>

//             <div className="grid gap-4 md:grid-cols-3">
//               {marketBlocks.map((item) => (
//                 <article key={item.city} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
//                   <p className="text-sm font-black text-zinc-300">{item.city}</p>
//                   <p className="mt-2 text-3xl font-black text-white">{item.range}</p>
//                   <p className="mt-1 text-xs leading-relaxed text-zinc-500">{item.text}</p>
//                 </article>
//               ))}
//             </div>
//           </div>
//         </section>

//         <section className="px-4 pb-16 sm:px-6">
//           <div className="mx-auto max-w-6xl">
//             <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
//               <div>
//                 <p className="text-xs font-black uppercase text-purple-300">Projeção financeira</p>
//                 <h2 className="mt-2 text-3xl font-black sm:text-4xl">Receita recorrente com preço simples.</h2>
//               </div>
//               <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
//                 Receita bruta com usuários pagantes a R$ 49/mês. Não inclui impostos, gateway,
//                 inadimplência, churn ou pró-labore.
//               </p>
//             </div>

//             <div className="overflow-x-auto rounded-2xl border border-white/10">
//               <div className="grid min-w-[640px] grid-cols-4 gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase text-zinc-500">
//                 <span>Pagantes</span>
//                 <span>MRR</span>
//                 <span>ARR</span>
//                 <span>Penetração RJ-SP</span>
//               </div>
//               {scenarios.map((scenario) => (
//                 <div key={scenario.users} className="grid min-w-[640px] grid-cols-4 gap-3 border-b border-white/10 px-4 py-5 last:border-b-0">
//                   <span className="text-xl font-black text-white">{scenario.users.toLocaleString('pt-BR')}</span>
//                   <span className="text-lg font-black text-green-300">{money(scenario.mrr)}</span>
//                   <span className="text-lg font-black text-purple-200">{money(scenario.arr)}</span>
//                   <span className="text-sm font-black text-zinc-300">{scenario.penetration.toFixed(1).replace('.', ',')}%</span>
//                 </div>
//               ))}
//             </div>

//             <div className="mt-4 grid gap-3 md:grid-cols-3">
//               {scenarios.map((scenario) => (
//                 <article key={scenario.users} className="rounded-2xl border border-white/10 bg-black/20 p-4">
//                   <p className="text-xs font-black uppercase text-zinc-600">{scenario.users.toLocaleString('pt-BR')} clientes</p>
//                   <div className="mt-3 space-y-1.5 text-xs text-zinc-500">
//                     <p>Publicidade: <strong className="text-zinc-300">{money(scenario.costs.ads)}/mês</strong></p>
//                     <p>Servidor: <strong className="text-zinc-300">{money(scenario.costs.server)}/mês</strong></p>
//                     <p>Dev jr/suporte: <strong className="text-zinc-300">{money(scenario.costs.devSupport)}/mês</strong></p>
//                   </div>
//                   <p className="mt-3 border-t border-white/10 pt-3 text-sm font-black text-white">
//                     Simulação enxuta: {money(scenario.costs.ads + scenario.costs.server + scenario.costs.devSupport)}/mês
//                   </p>
//                 </article>
//               ))}
//             </div>

//             <p className="mt-4 text-xs leading-relaxed text-zinc-600">
//               Custos simulados apenas com publicidade, servidor e um desenvolvedor junior atuando também como suporte.
//               Não substitui pesquisa de CAC, impostos, gateway, contabilidade e equipe futura.
//             </p>
//           </div>
//         </section>

//         <section className="px-4 pb-16 sm:px-6">
//           <div className="mx-auto max-w-6xl">
//             <div className="mb-8 max-w-3xl">
//               <p className="text-xs font-black uppercase text-purple-300">Tecnologia aplicada</p>
//               <h2 className="mt-2 text-3xl font-black sm:text-4xl">A tecnologia entra onde o mercado perde tempo.</h2>
//               <p className="mt-3 text-sm leading-relaxed text-zinc-400">
//                 O valor não está em parecer complexo. Está em deixar simples uma jornada que hoje depende de print,
//                 conversa solta, memória do profissional e paciência do cliente.
//               </p>
//             </div>

//             <div className="grid gap-4 lg:grid-cols-2">
//               {techExamples.map((group) => (
//                 <article key={group.side} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
//                   <div className="mb-5 flex items-center gap-3">
//                     <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-purple-200">
//                       <group.icon size={20} />
//                     </span>
//                     <h3 className="text-xl font-black">{group.side}</h3>
//                   </div>
//                   <div className="space-y-3">
//                     {group.items.map(([title, text]) => (
//                       <div key={title} className="rounded-xl border border-white/10 bg-black/20 p-4">
//                         <p className="text-sm font-black text-white">{title}</p>
//                         <p className="mt-1 text-xs leading-relaxed text-zinc-500">{text}</p>
//                       </div>
//                     ))}
//                   </div>
//                 </article>
//               ))}
//             </div>
//           </div>
//         </section>

//         <section className="px-4 pb-16 sm:px-6">
//           <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[0.9fr_1.1fr]">
//             <article className="rounded-2xl border border-purple-500/25 bg-purple-500/10 p-6">
//               <BarChart3 size={24} className="text-purple-200" />
//               <h2 className="mt-4 text-2xl font-black">Modelo de investimento</h2>
//               <p className="mt-3 text-sm leading-relaxed text-zinc-300">
//                 Proposta enxuta para MVP: aporte entre <strong>R$ 40 mil e R$ 50 mil</strong> para acelerar produto,
//                 aquisição local e suporte inicial sem criar uma valuation artificial cedo demais.
//               </p>
//               <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-4">
//                 <p className="text-xs font-black uppercase text-zinc-500">Retorno proposto</p>
//                 <p className="mt-1 text-2xl font-black text-white">35% até payback · 10% depois</p>
//                 <p className="mt-1 text-xs leading-relaxed text-zinc-500">
//                   O investidor recebe 35% do lucro operacional até recuperar o aporte. Após o payback,
//                   a participação cai para 10%, ajustável conforme o valor final investido.
//                 </p>
//               </div>
//               <p className="mt-3 text-xs leading-relaxed text-zinc-600">
//                 Alternativa possível: aplicar os 35% sobre faturamento até o payback, se as partes preferirem
//                 uma regra mais simples de auditoria.
//               </p>
//             </article>

//             <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
//               <Users size={24} className="text-zinc-300" />
//               <h2 className="mt-4 text-2xl font-black">Uso do capital</h2>
//               <div className="mt-5 grid gap-3 sm:grid-cols-2">
//                 {[
//                   ['Produto', 'refinar agenda, perfil social, notificações e pagamentos'],
//                   ['Aquisição', 'campanhas locais, parcerias com studios e criadores'],
//                   ['Operação', 'suporte, onboarding e materiais comerciais'],
//                   ['Dados', 'métricas de conversão, retenção, regiões e estilos'],
//                 ].map(([title, text]) => (
//                   <div key={title} className="rounded-xl border border-white/10 bg-black/20 p-4">
//                     <p className="text-sm font-black text-white">{title}</p>
//                     <p className="mt-1 text-xs leading-relaxed text-zinc-500">{text}</p>
//                   </div>
//                 ))}
//               </div>
//             </article>
//           </div>
//         </section>

//         <section className="px-4 pb-16 sm:px-6">
//           <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.1fr_0.9fr]">
//             <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
//               <MessageCircle size={24} className="text-zinc-300" />
//               <h2 className="mt-4 text-2xl font-black">Alavancas de crescimento</h2>
//               <div className="mt-5 space-y-3">
//                 {upsells.map((item) => (
//                   <div key={item} className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
//                     <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-green-300" />
//                     <p className="text-sm leading-relaxed text-zinc-400">{item}</p>
//                   </div>
//                 ))}
//               </div>
//             </article>

//             <article className="rounded-2xl border border-green-500/25 bg-green-500/10 p-6">
//               <CircleDollarSign size={24} className="text-green-200" />
//               <h2 className="mt-4 text-2xl font-black">Preço psicológico</h2>
//               <p className="mt-3 text-sm leading-relaxed text-zinc-300">
//                 R$ 49/mês fica abaixo do custo de muitos insumos de uma sessão. Se o TatuApp economiza tempo,
//                 organiza agenda ou gera um cliente novo, a compra fica fácil de justificar.
//               </p>
//             </article>
//           </div>
//         </section>

//         <section className="px-4 pb-20 sm:px-6">
//           <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-center sm:p-10">
//             <h2 className="text-3xl font-black">Tese curta: primeiro agenda. Depois rede.</h2>
//             <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
//               O TatuApp entra por uma dor operacional clara, cobra recorrência e constrói a base para descoberta,
//               prova social, relacionamento cliente-artista e marketplace especializado.
//             </p>
//             <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
//               <button
//                 type="button"
//                 onClick={onRegister}
//                 className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black text-black transition-colors hover:bg-zinc-200"
//               >
//                 Criar conta
//                 <ArrowRight size={17} />
//               </button>
//               <button
//                 type="button"
//                 onClick={onOpenLanding}
//                 className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-black text-white transition-colors hover:bg-white/10"
//               >
//                 Voltar para landing
//               </button>
//             </div>
//           </div>
//         </section>
//       </main>
//     </div>
//   );
// }

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Calendar,
  CheckCircle,
  CircleDollarSign,
  Compass,
  Image,
  LineChart,
  MapPin,
  QrCode,
  Search,
  Shield,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface PitchPageProps {
  onBack: () => void;
  onOpenLanding: () => void;
  onRegister: () => void;
}

const monthlyPrice = 49;
const annualPrice = 490;
const targetInvestment = 50000;

const revenueScenarios = [
  {
    artists: 100,
    title: 'Validação paga',
    note: 'primeira base real',
  },
  {
    artists: 500,
    title: 'Tração inicial',
    note: 'operação com caixa',
  },
  {
    artists: 1000,
    title: 'Meta 12 meses',
    note: 'negócio validado',
  },
  {
    artists: 5000,
    title: 'Escala regional',
    note: 'expansão forte',
  },
].map((scenario) => ({
  ...scenario,
  mrr: scenario.artists * monthlyPrice,
  arr: scenario.artists * monthlyPrice * 12,
}));

const thesisCards: Array<{
  icon: LucideIcon;
  label: string;
  value: string;
  desc: string;
}> = [
  {
    icon: Target,
    label: 'Dor de entrada',
    value: 'Agenda paga',
    desc: 'O artista precisa vender melhor antes de precisar de mais uma rede social.',
  },
  {
    icon: CircleDollarSign,
    label: 'Receita inicial',
    value: `R$ ${monthlyPrice}/mês`,
    desc: `Assinatura simples, com plano anual de R$ ${annualPrice}.`,
  },
  {
    icon: Compass,
    label: 'Próxima fase',
    value: 'Marketplace',
    desc: 'Com base ativa, a plataforma vira busca local, reputação e transação.',
  },
];

const problemCards = [
  {
    emoji: '😵‍💫',
    title: 'Venda fragmentada',
    desc: 'Instagram para mostrar, WhatsApp para negociar, agenda manual para tentar não se perder.',
  },
  {
    emoji: '💸',
    title: 'Horário sem garantia',
    desc: 'Sem sinal obrigatório, o cliente marca, desaparece e o artista perde janela de venda.',
  },
  {
    emoji: '🔎',
    title: 'Descoberta ruim',
    desc: 'O cliente ainda escolhe tatuador por indicação, hashtag, print e sorte.',
  },
];

const productCards: Array<{
  icon: LucideIcon;
  title: string;
  desc: string;
}> = [
  {
    icon: Smartphone,
    title: 'Mini site',
    desc: 'Um link profissional para bio, stories e cartão.',
  },
  {
    icon: Image,
    title: 'Portfólio',
    desc: 'Trabalhos selecionados por estilo e especialidade.',
  },
  {
    icon: Calendar,
    title: 'Agenda online',
    desc: 'Disponibilidade clara, sem conversa infinita.',
  },
  {
    icon: QrCode,
    title: 'Sinal via Pix',
    desc: 'Reserva com compromisso antes da confirmação.',
  },
  {
    icon: Search,
    title: 'Busca local',
    desc: 'Artistas por cidade, estilo e disponibilidade.',
  },
  {
    icon: Shield,
    title: 'Confiança',
    desc: 'Perfil organizado para vender antes do primeiro contato.',
  },
];

const marketSignals: Array<{
  icon: LucideIcon;
  value: string;
  label: string;
  desc: string;
}> = [
  {
    icon: TrendingUp,
    value: '35%',
    label: 'crescimento do setor',
    desc: 'Novos estúdios de tattoo e piercing cresceram entre 2019 e 2022.',
  },
  {
    icon: BadgeCheck,
    value: '97%',
    label: 'MEI nos novos estúdios',
    desc: 'Mercado pulverizado, com muitos profissionais independentes.',
  },
  {
    icon: MapPin,
    value: '2.869',
    label: 'novos negócios em SP + RJ',
    desc: 'Aberturas em 2022 nos dois principais polos iniciais.',
  },
];

const investorReasons = [
  'Produto simples de entender e vender.',
  'Ticket baixo, recorrente e próximo da dor operacional.',
  'Mercado visual, local e altamente dependente de redes sociais.',
  'Expansão natural para busca, destaque pago e transações.',
];

const expansionCards = [
  {
    title: 'SaaS para tatuadores',
    desc: 'Assinatura mensal para perfil, portfólio, agenda e reserva.',
  },
  {
    title: 'Marketplace local',
    desc: 'Busca por cidade, estilo, disponibilidade e reputação.',
  },
  {
    title: 'Receita transacional',
    desc: 'Taxa sobre sinal, destaque pago e serviços premium.',
  },
];

const roadmap = [
  {
    phase: 'Fase 1',
    title: 'MVP comercial',
    desc: 'Perfil, portfólio, agenda, Pix e onboarding de artistas.',
  },
  {
    phase: 'Fase 2',
    title: 'Tração local',
    desc: 'Campanhas com tatuadores, studios e criadores de conteúdo.',
  },
  {
    phase: 'Fase 3',
    title: 'Marketplace',
    desc: 'Busca aberta para clientes e monetização por destaque/transação.',
  },
];

const useOfFunds = [
  ['Produto', 'evolução do MVP, UX, agenda, Pix e painel.'],
  ['Crescimento', 'campanhas locais e aquisição de artistas.'],
  ['Operação', 'onboarding, suporte e materiais comerciais.'],
  ['Expansão', 'base para marketplace e automações futuras.'],
];

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

function IconBox({ icon: Icon, featured = false }: { icon: LucideIcon; featured?: boolean }) {
  return (
    <div
      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
        featured
          ? 'bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg shadow-purple-900/30'
          : 'bg-white/10'
      }`}
    >
      <Icon size={22} className="text-white" />
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  desc,
  center = false,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  center?: boolean;
}) {
  return (
    <div className={`mb-10 min-w-0 ${center ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}`}>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-300">{eyebrow}</p>
      <h2 className="mt-3 break-words text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      {desc ? <p className="mt-3 break-words text-sm leading-relaxed text-zinc-400 sm:text-base">{desc}</p> : null}
    </div>
  );
}

function CheckLine({ children }: { children: string }) {
  return (
    <div className="flex min-w-0 gap-3">
      <CheckCircle size={16} className="mt-0.5 flex-shrink-0 text-green-300" />
      <p className="min-w-0 break-words text-sm leading-relaxed text-zinc-400">{children}</p>
    </div>
  );
}

export default function PitchPage({ onBack, onOpenLanding, onRegister }: PitchPageProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0a0a] text-white font-inter">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0a]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={16} />
            Home
          </button>

          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <span className="truncate text-lg font-bold tracking-tight">TatuApp</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
              Investor Pitch
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenLanding}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-zinc-200 transition-colors hover:bg-white/10"
          >
            Ver produto
          </button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-28">
          <div className="pointer-events-none absolute left-1/2 top-16 h-[360px] w-[520px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[110px] sm:h-[420px] sm:w-[680px]" />
          <div className="pointer-events-none absolute left-[12%] top-44 h-[260px] w-[260px] rounded-full bg-pink-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute right-[8%] top-24 h-[220px] w-[220px] rounded-full bg-fuchsia-500/10 blur-[80px]" />

          <div className="relative mx-auto max-w-6xl">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-8 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-zinc-400 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-green-400" />
                <span className="truncate">Plataforma comercial para tatuadores</span>
              </div>

              <h1 className="break-words text-4xl font-black leading-[1.06] tracking-tight sm:text-6xl md:text-7xl">
                A arte atrai.{' '}
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Agendar transforma talento em negócio.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
                O TatuApp transforma presença digital em reserva paga: mini site, portfólio,
                agenda online e sinal via Pix em um único link.
              </p>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-purple-500/30 bg-purple-950/30 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-200">Aporte buscado</p>
                  <p className="mt-2 text-3xl font-black text-white">{money(targetInvestment)}</p>
                </div>
                <div className="rounded-2xl border border-green-500/25 bg-green-500/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-green-100/80">Meta 12 meses</p>
                  <p className="mt-2 text-3xl font-black text-white">{money(49000)}/mês</p>
                </div>
                <div className="rounded-2xl border border-pink-500/25 bg-pink-950/25 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-pink-100/80">Potencial 24 meses</p>
                  <p className="mt-2 text-3xl font-black text-white">{money(245000)}/mês</p>
                </div>
              </div>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onRegister}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-purple-900/40 transition-opacity hover:opacity-90 sm:w-auto sm:text-lg"
                >
                  Criar conta
                  <ArrowRight size={20} />
                </button>
                <button
                  type="button"
                  onClick={onOpenLanding}
                  className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto sm:text-lg"
                >
                  Ver landing
                </button>
              </div>
            </div>

            <div className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-3">
              {thesisCards.map((item, index) => (
                <article
                  key={item.label}
                  className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/50 hover:bg-purple-950/20"
                >
                  <IconBox icon={item.icon} featured={index === 1} />
                  <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                    {item.label}
                  </p>
                  <h2 className="mt-1 break-words text-2xl font-black leading-tight text-white">{item.value}</h2>
                  <p className="mt-2 break-words text-sm leading-relaxed text-zinc-400">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              eyebrow="Problema"
              title="O tatuador vende no improviso."
              desc="O mercado já usa redes sociais para vender, mas a operação ainda depende de conversa manual, agenda solta e confirmação sem garantia."
              center
            />

            <div className="grid gap-4 md:grid-cols-3">
              {problemCards.map((item) => (
                <article
                  key={item.title}
                  className="min-w-0 rounded-2xl border border-red-900/30 bg-red-950/20 p-6 text-center"
                >
                  <div className="mb-3 text-4xl">{item.emoji}</div>
                  <h3 className="break-words text-lg font-bold text-red-300">{item.title}</h3>
                  <p className="mt-2 break-words text-sm leading-relaxed text-zinc-400">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-white/[0.02] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              eyebrow="Produto"
              title="Um link para vender, agendar e receber sinal."
              desc="Simples para o tatuador. Claro para o cliente. Forte o suficiente para virar canal de venda recorrente."
              center
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {productCards.map((item) => (
                <article
                  key={item.title}
                  className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-purple-500/50 hover:bg-purple-950/20"
                >
                  <IconBox icon={item.icon} />
                  <h3 className="mt-4 break-words text-lg font-bold leading-tight text-white">{item.title}</h3>
                  <p className="mt-2 break-words text-sm leading-relaxed text-zinc-400">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              eyebrow="Mercado"
              title="Um setor visual, local e pulverizado."
              desc="Tatuagem combina influência digital, decisão por confiança e profissionais independentes que precisam vender melhor."
            />

            <div className="grid gap-4 md:grid-cols-3">
              {marketSignals.map((item, index) => (
                <article
                  key={item.label}
                  className={`min-w-0 rounded-2xl border p-6 ${
                    index === 0
                      ? 'border-purple-500/30 bg-purple-950/25'
                      : index === 1
                        ? 'border-pink-500/25 bg-pink-950/20'
                        : 'border-white/10 bg-white/5'
                  }`}
                >
                  <item.icon size={24} className="text-purple-200" />
                  <p className="mt-5 break-words text-4xl font-black leading-none text-white">{item.value}</p>
                  <h3 className="mt-3 break-words text-base font-black leading-tight text-zinc-200">
                    {item.label}
                  </h3>
                  <p className="mt-2 break-words text-sm leading-relaxed text-zinc-500">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              eyebrow="Receita"
              title="Potencial de receita recorrente."
              desc="Com um ticket simples de R$ 49/mês, a escala vem da quantidade de artistas ativos na plataforma."
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {revenueScenarios.map((scenario) => (
                <article
                  key={scenario.artists}
                  className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.04] p-6"
                >
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-600">
                    {scenario.title}
                  </p>
                  <p className="mt-3 text-sm font-bold text-zinc-300">
                    {formatNumber(scenario.artists)} assinantes
                  </p>
                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-xs text-zinc-500">Receita mensal</p>
                      <p className="mt-1 break-words text-3xl font-black leading-none text-green-300">
                        {money(scenario.mrr)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Receita anual</p>
                      <p className="mt-1 break-words text-2xl font-black leading-tight text-purple-200">
                        {money(scenario.arr)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-center text-xs font-bold text-zinc-400">
                    {scenario.note}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <article className="min-w-0 rounded-3xl border border-green-500/25 bg-green-500/10 p-6">
                <BarChart3 size={26} className="text-green-200" />
                <h3 className="mt-4 break-words text-2xl font-black leading-tight">
                  Potencial de lucro em escala
                </h3>
                <p className="mt-3 break-words text-sm leading-relaxed text-zinc-300">
                  A partir de 1.000 assinantes, o TatuApp alcança R$ 49 mil/mês de receita recorrente.
                  Em 5.000 assinantes, chega a R$ 245 mil/mês. O modelo é digital, recorrente e com alto potencial
                  de margem após a estrutura inicial estar pronta.
                </p>
              </article>

              <article className="min-w-0 rounded-3xl border border-purple-500/25 bg-purple-500/10 p-6">
                <Sparkles size={26} className="text-purple-200" />
                <h3 className="mt-4 break-words text-2xl font-black leading-tight">
                  Um cliente novo paga vários meses
                </h3>
                <p className="mt-3 break-words text-sm leading-relaxed text-zinc-300">
                  Para o tatuador, R$ 49/mês é baixo perto do valor de uma sessão. Se o produto reduz furo,
                  organiza a agenda ou ajuda a fechar um cliente, a assinatura se paga rápido.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-white/[0.02] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              eyebrow="Investimento"
              title="R$ 50 mil para acelerar produto e tração."
              desc="O aporte coloca o MVP na rua com força comercial, aquisição inicial e base para abrir o marketplace."
              center
            />

            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <article className="min-w-0 rounded-3xl border border-purple-500/25 bg-gradient-to-b from-purple-950/40 to-pink-950/20 p-6 sm:p-8">
                <WalletCards size={28} className="text-purple-200" />
                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-purple-100/70">
                  Valor buscado
                </p>
                <h2 className="mt-2 break-words text-5xl font-black leading-none text-white">
                  {money(targetInvestment)}
                </h2>
                <p className="mt-4 break-words text-sm leading-relaxed text-zinc-300">
                  Capital para sair de produto promissor e entrar em validação comercial com artistas pagantes,
                  campanhas locais e operação inicial.
                </p>
              </article>

              <article className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
                <Users size={28} className="text-zinc-300" />
                <h2 className="mt-5 break-words text-3xl font-black leading-tight">Uso do capital</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {useOfFunds.map(([title, text]) => (
                    <div key={title} className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="break-words text-sm font-black text-white">{title}</p>
                      <p className="mt-1 break-words text-xs leading-relaxed text-zinc-500">{text}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              eyebrow="Expansão"
              title="A entrada é SaaS. O destino é marketplace."
              desc="O TatuApp começa resolvendo agenda e reserva. Com base ativa, evolui para descoberta, reputação e transações."
            />

            <div className="grid gap-4 md:grid-cols-3">
              {expansionCards.map((item, index) => (
                <article key={item.title} className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 break-words text-xl font-black leading-tight">{item.title}</h3>
                  <p className="mt-2 break-words text-sm leading-relaxed text-zinc-400">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_1fr]">
            <article className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
              <Zap size={28} className="text-zinc-300" />
              <h2 className="mt-5 break-words text-3xl font-black leading-tight">Por que investir</h2>
              <div className="mt-6 space-y-3">
                {investorReasons.map((item) => (
                  <CheckLine key={item}>{item}</CheckLine>
                ))}
              </div>
            </article>

            <article className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
              <LineChart size={28} className="text-zinc-300" />
              <h2 className="mt-5 break-words text-3xl font-black leading-tight">Plano de execução</h2>
              <div className="mt-6 space-y-3">
                {roadmap.map((item) => (
                  <div key={item.phase} className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-300">{item.phase}</p>
                    <p className="mt-1 break-words text-base font-black text-white">{item.title}</p>
                    <p className="mt-1 break-words text-xs leading-relaxed text-zinc-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6">
          <div className="mx-auto max-w-4xl rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-900/30 to-pink-900/30 p-8 text-center sm:p-14">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg shadow-purple-900/40">
              <Sparkles size={24} className="text-white" />
            </div>
            <h2 className="break-words text-3xl font-black leading-tight sm:text-4xl">
              Primeiro agenda. Depois marketplace.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl break-words text-sm leading-relaxed text-zinc-400">
              O TatuApp entra por uma dor simples, cobra recorrência e constrói a base para descoberta,
              reputação e transações no mercado de tattoo.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onRegister}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-black text-black transition-colors hover:bg-zinc-200"
              >
                Criar conta
                <ArrowRight size={17} />
              </button>
              <button
                type="button"
                onClick={onOpenLanding}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-8 py-4 text-sm font-black text-white transition-colors hover:bg-white/10"
              >
                Voltar para landing
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
