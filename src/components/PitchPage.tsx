import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  CheckCircle,
  Compass,
  Image,
  LineChart,
  MapPin,
  Search,
  Smartphone,
  Sparkles,
  Target,
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

const thesisCards: Array<{
  icon: LucideIcon;
  label: string;
  title: string;
  desc: string;
}> = [
  {
    icon: Target,
    label: 'Entrada',
    title: 'Perfil que vende',
    desc: 'O artista ganha um link profissional para apresentar trabalho, cidade, estilos, agenda e contato.',
  },
  {
    icon: Calendar,
    label: 'Operação',
    title: 'Agenda com compromisso',
    desc: 'O cliente escolhe um horário disponível e a reserva pode exigir sinal antes da confirmação.',
  },
  {
    icon: Compass,
    label: 'Expansão',
    title: 'Busca especializada',
    desc: 'A base de perfis se transforma em descoberta local por estilo, disponibilidade e confiança.',
  },
];

const marketProblems: Array<{
  icon: LucideIcon;
  title: string;
  desc: string;
}> = [
  {
    icon: Smartphone,
    title: 'Venda espalhada demais',
    desc: 'Hoje o tatuador publica em uma rede, responde em outra, controla agenda em outro lugar e tenta lembrar quem pagou sinal.',
  },
  {
    icon: Search,
    title: 'Cliente decide com pouca clareza',
    desc: 'Quem procura uma tattoo compara prints, hashtags e indicações soltas, sem ver disponibilidade, localização e processo de reserva no mesmo lugar.',
  },
  {
    icon: WalletCards,
    title: 'Furo de agenda vira prejuízo',
    desc: 'Sem uma reserva organizada, o profissional perde tempo negociando e pode ficar com horário vazio quando o cliente some.',
  },
];

const featureGroups: Array<{
  icon: LucideIcon;
  title: string;
  desc: string;
  items: string[];
}> = [
  {
    icon: Image,
    title: 'Perfil e portfólio',
    desc: 'A vitrine do artista fica pronta para circular em bio, stories, indicação e link direto.',
    items: [
      'Bio com apresentação profissional e identidade visual.',
      'Capa, foto de perfil, estilos e portfólio selecionado.',
      'Curtidas e sinais de confiança para apoiar a decisão.',
      'Página pública preparada para cliente e para descoberta local.',
    ],
  },
  {
    icon: Calendar,
    title: 'Agenda e reserva',
    desc: 'A conversa deixa de ser o centro da operação e vira consequência de um pedido mais qualificado.',
    items: [
      'Disponibilidade por data, dias e horários.',
      'Reserva com janela temporária para envio do comprovante.',
      'Sinal via Pix configurado pelo profissional.',
      'Aprovação, recusa e histórico de agendamentos no painel.',
    ],
  },
  {
    icon: MapPin,
    title: 'Busca e localização',
    desc: 'O cliente encontra artistas por região e estilo sem depender apenas de indicação informal.',
    items: [
      'Busca por cidade, bairro e proximidade.',
      'Endereço estruturado por CEP e detalhes do estúdio.',
      'Exibição de distância quando o cliente autoriza localização.',
      'Ponto de partida para um marketplace especializado em tattoo.',
    ],
  },
  {
    icon: Zap,
    title: 'Painel do tatuador',
    desc: 'O artista acompanha o que precisa de ação sem transformar o dashboard em um labirinto.',
    items: [
      'Configurações de perfil, portfólio, agenda e Pix.',
      'Notificações para curtidas, novos pedidos e pendências.',
      'Acesso ao perfil público e compartilhamento do link.',
      'Controle de acesso, mensalidade e status da conta.',
    ],
  },
];

const solutionBlocks: Array<{
  icon: LucideIcon;
  title: string;
  problem: string;
  solution: string;
}> = [
  {
    icon: Users,
    title: 'Para quem busca tattoo',
    problem: 'O cliente quer escolher bem, mas precisa garimpar informação em conversas soltas.',
    solution:
      'Com perfil, portfólio, localização e horários disponíveis no mesmo fluxo, a escolha fica mais rápida, visual e segura.',
  },
  {
    icon: BadgeCheck,
    title: 'Para o tatuador',
    problem: 'O artista perde tempo com perguntas repetidas, negociação manual e confirmação sem garantia.',
    solution:
      'O TatuApp organiza a vitrine, qualifica o pedido, reduz retrabalho e cria um processo claro até a aprovação da reserva.',
  },
  {
    icon: LineChart,
    title: 'Para o negócio',
    problem: 'O mercado é grande, visual e local, mas ainda não tem uma camada vertical forte para descoberta e agenda.',
    solution:
      'A plataforma começa resolvendo operação e constrói base para comunidade visual, marketplace e serviços premium para artistas.',
  },
];

const roadmap = [
  {
    phase: 'Agora',
    title: 'Organizar o profissional',
    desc: 'Perfil público, portfólio, agenda, Pix e painel para transformar presença digital em reserva.',
  },
  {
    phase: 'Próxima etapa',
    title: 'Aumentar confiança',
    desc: 'Notificações, prova social, histórico, melhoria do fluxo de sinal e experiência mais simples no mobile.',
  },
  {
    phase: 'Escala',
    title: 'Virar descoberta especializada',
    desc: 'Busca por estilo, região, disponibilidade e reputação, criando uma comunidade visual de tattoo.',
  },
];

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

export default function PitchPage({ onBack, onOpenLanding }: PitchPageProps) {
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
            Voltar
          </button>

          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <span className="truncate text-lg font-bold tracking-tight">TatuApp</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
              Pitch
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
        <section className="px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-8 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-zinc-400">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400" />
                <span className="truncate">Plataforma de descoberta, agenda e reserva para tattoo</span>
              </div>

              <h1 className="break-words text-4xl font-black leading-[1.06] tracking-tight sm:text-6xl md:text-7xl">
                Tattoo nasce no desejo.{' '}
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  O TatuApp transforma em reserva.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
                A proposta é simples: dar ao tatuador uma estrutura comercial leve e profissional,
                enquanto o cliente encontra, compara e agenda com menos dúvida.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onOpenLanding}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-purple-900/40 transition-opacity hover:opacity-90 sm:w-auto sm:text-lg"
                >
                  Ver produto
                  <ArrowRight size={20} />
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto sm:text-lg"
                >
                  Retornar
                </button>
              </div>
            </div>

            <div className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-3">
              {thesisCards.map((item, index) => (
                <article
                  key={item.label}
                  className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-5 transition-all duration-300 hover:border-purple-500/50 hover:bg-purple-950/20"
                >
                  <IconBox icon={item.icon} featured={index === 1} />
                  <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                    {item.label}
                  </p>
                  <h2 className="mt-1 break-words text-2xl font-black leading-tight text-white">{item.title}</h2>
                  <p className="mt-2 break-words text-sm leading-relaxed text-zinc-400">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-white/[0.02] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              eyebrow="Problema de mercado"
              title="O mercado de tattoo é visual, local e ainda opera no improviso."
              desc="A demanda existe, mas a jornada entre ver um trabalho, confiar no artista e reservar um horário ainda é quebrada."
              center
            />

            <div className="grid gap-4 md:grid-cols-3">
              {marketProblems.map((item) => (
                <article key={item.title} className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-6">
                  <IconBox icon={item.icon} />
                  <h3 className="mt-4 break-words text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-2 break-words text-sm leading-relaxed text-zinc-400">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              eyebrow="Funcionalidades"
              title="O produto organiza a jornada inteira."
              desc="Cada módulo nasce de uma dor prática: vender melhor, reduzir retrabalho, confirmar reserva e facilitar a descoberta."
              center
            />

            <div className="grid gap-4 lg:grid-cols-2">
              {featureGroups.map((group) => (
                <article key={group.title} className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    <IconBox icon={group.icon} />
                    <div className="min-w-0">
                      <h3 className="break-words text-xl font-black leading-tight text-white">{group.title}</h3>
                      <p className="mt-2 break-words text-sm leading-relaxed text-zinc-400">{group.desc}</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {group.items.map((item) => (
                      <CheckLine key={item}>{item}</CheckLine>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-white/[0.02] px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              eyebrow="Solução"
              title="Não é só uma agenda. É uma camada comercial para tattoo."
              desc="O TatuApp entra pela operação diária, mas constrói base para descoberta, confiança e relacionamento entre cliente e artista."
            />

            <div className="grid gap-4 lg:grid-cols-3">
              {solutionBlocks.map((block) => (
                <article key={block.title} className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-6">
                  <IconBox icon={block.icon} />
                  <h3 className="mt-5 break-words text-xl font-black leading-tight">{block.title}</h3>
                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-600">Dor atual</p>
                      <p className="mt-1 break-words text-sm leading-relaxed text-zinc-400">{block.problem}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-300">Como resolve</p>
                      <p className="mt-1 break-words text-sm leading-relaxed text-zinc-300">{block.solution}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              eyebrow="Modelo de negócio"
              title="Recorrência primeiro. Marketplace depois."
              desc="A plataforma começa como SaaS para artistas e evolui para uma comunidade visual especializada, onde descoberta e transação acontecem com mais contexto."
            />

            <div className="grid gap-4 md:grid-cols-3">
              {roadmap.map((item, index) => (
                <article key={item.phase} className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-purple-300">{item.phase}</p>
                  <h3 className="mt-2 break-words text-xl font-black leading-tight">{item.title}</h3>
                  <p className="mt-2 break-words text-sm leading-relaxed text-zinc-400">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6">
          <div className="mx-auto max-w-4xl rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-900/30 to-pink-900/30 p-8 text-center sm:p-14">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg shadow-purple-900/40">
              <Sparkles size={24} className="text-white" />
            </div>
            <h2 className="break-words text-3xl font-black leading-tight sm:text-4xl">
              A tese: transformar intenção em agenda confirmada.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl break-words text-sm leading-relaxed text-zinc-400">
              O TatuApp resolve uma dor imediata do profissional, melhora a experiência do cliente
              e cria o caminho para uma plataforma vertical de descoberta, confiança e relacionamento no universo tattoo.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onOpenLanding}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-black text-black transition-colors hover:bg-zinc-200"
              >
                Ver produto
                <ArrowRight size={17} />
              </button>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-8 py-4 text-sm font-black text-white transition-colors hover:bg-white/10"
              >
                Voltar
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
