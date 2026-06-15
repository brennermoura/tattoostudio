import { useState } from 'react';
import {
  Calendar,
  Image,
  Zap,
  CheckCircle,
  ArrowRight,
  QrCode,
  Star,
  Smartphone,
  Shield,
} from 'lucide-react';

interface LandingPageProps {
  isLoggedIn?: boolean;
  onLogin: () => void;
  onRegister: () => void;
  onOpenDashboard: () => void;
  onOpenPublicProfile: () => void;
  onViewDemo: () => void;
}

const features = [
  {
    icon: Smartphone,
    title: 'Mini site profissional',
    desc: 'Seu link exclusivo tatu.app/seunome para compartilhar com clientes.',
  },
  {
    icon: Image,
    title: 'Portfólio enxuto',
    desc: 'Até 10 fotos dos seus melhores trabalhos. Simples e impactante.',
  },
  {
    icon: Calendar,
    title: 'Agenda inteligente',
    desc: 'Configure seus horários e deixe clientes agendarem sozinhos.',
  },
  {
    icon: QrCode,
    title: 'Reserva com sinal via Pix',
    desc: 'QR Code automático para pagamento do sinal. Zero burocracia.',
  },
  {
    icon: Shield,
    title: 'Chega de calote',
    desc: 'Sinal obrigatório antes da confirmação. Sem comprovante, sem vaga.',
  },
  {
    icon: Zap,
    title: 'Ultra rápido',
    desc: 'Setup em menos de 5 minutos. Tudo pronto para receber clientes.',
  },
];

const testimonials = [
  {
    name: 'João Ink',
    city: 'São Paulo, SP',
    text: 'Antes eu perdia horas no WhatsApp marcando horário. Agora minha agenda fica cheia sozinha e nunca mais tive cliente furando.',
    rating: 5,
  },
  {
    name: 'Mariana Tattoo',
    city: 'Rio de Janeiro, RJ',
    text: 'O sinal via Pix mudou minha vida. Recebi 3 cancelamentos em um mês mas o dinheiro já estava na minha conta.',
    rating: 5,
  },
  {
    name: 'Bruno Ink Studio',
    city: 'Campinas, SP',
    text: 'Meu link ficou profissional demais. Os clientes chegam já sabendo o que esperar, com referência e tudo organizado.',
    rating: 5,
  },
];

export default function LandingPage({
  isLoggedIn = false,
  onLogin,
  onRegister,
  onOpenDashboard,
  onOpenPublicProfile,
  onViewDemo,
}: LandingPageProps) {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-lg tracking-tight">TatuApp</span>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <button
                  onClick={onOpenDashboard}
                  className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-2"
                >
                  Painel
                </button>
                <button
                  onClick={onOpenPublicProfile}
                  className="text-sm bg-white text-black font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  Perfil público
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onLogin}
                  className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-2"
                >
                  Entrar
                </button>
                <button
                  onClick={onRegister}
                  className="text-sm bg-white text-black font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  Criar conta
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 left-1/3 w-[300px] h-[300px] bg-pink-600/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-zinc-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Plataforma para tattoo, piercing e estudios
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            Sua agenda,{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              seu site,
            </span>
            <br />
            sem bagunça.
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Mini site profissional + portfólio + agendamento + sinal via Pix.{' '}
            <strong className="text-zinc-200">Tudo em um link só.</strong> Chega de WhatsApp
            caótico.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onRegister}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity text-lg shadow-lg shadow-purple-900/40"
            >
              Criar meu perfil grátis
              <ArrowRight size={20} />
            </button>
            <button
              onClick={onViewDemo}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors text-lg"
            >
              Ver exemplo
            </button>
          </div>

          <p className="text-zinc-500 text-sm mt-4">
            Setup em 5 minutos · Sem cartão de crédito
          </p>
        </div>

        {/* Mock URL pill */}
        <div className="max-w-sm mx-auto mt-16 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            </div>
            <div className="flex-1 bg-white/10 rounded-md px-3 py-1 text-xs text-zinc-400 text-center">
              tatu.app/<span className="text-purple-400">seulink</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-24 bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-xl" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/10" />
              <div className="space-y-1.5">
                <div className="h-3 w-28 bg-white/[0.02]0 rounded-full" />
                <div className="h-2 w-20 bg-white/10 rounded-full" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-white/10 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Você ainda organiza sua agenda{' '}
              <span className="text-red-400">assim?</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {[
              {
                emoji: '😤',
                title: 'WhatsApp caótico',
                desc: 'Mensagens perdidas, clientes esquecidos, horários duplicados.',
              },
              {
                emoji: '😰',
                title: 'Cliente fura sem aviso',
                desc: 'Perdeu o horário, não pagou sinal, sumiu no dia.',
              },
              {
                emoji: '🗂️',
                title: 'Portfólio bagunçado',
                desc: 'Fotos espalhadas em grupos, Google Drive, sem organização.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-red-950/20 border border-red-900/30 rounded-2xl p-6 text-center"
              >
                <div className="text-4xl mb-3">{item.emoji}</div>
                <h3 className="font-bold text-red-300 mb-2">{item.title}</h3>
                <p className="text-zinc-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-200">
              O TatuApp resolve tudo isso.{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Em um link só.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Tudo que você precisa,{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                nada que não precisa
              </span>
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Sem funcionalidades desnecessárias. Sem curva de aprendizado. Pronto em minutos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
                className={`relative bg-white/5 border rounded-2xl p-6 transition-all duration-300 cursor-default ${
                  hoveredFeature === i
                    ? 'border-purple-500/50 bg-purple-950/20'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                    hoveredFeature === i ? 'bg-purple-600' : 'bg-white/10'
                  }`}
                >
                  <f.icon size={22} className="text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Como funciona</h2>
            <p className="text-zinc-400">Para você e para o seu cliente</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Artist side */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold">
                  T
                </div>
                <span className="font-bold text-purple-300">Para o profissional</span>
              </div>
              <div className="space-y-4">
                {[
                  'Cria conta em 2 minutos',
                  'Monta perfil com foto, bio e portfólio',
                  'Configura dias e horários disponíveis',
                  'Coloca a chave Pix e o valor do sinal',
                  'Compartilha o link com clientes',
                  'Aprova ou recusa agendamentos',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-900 border border-purple-600 flex items-center justify-center text-xs font-bold text-purple-300 flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-zinc-300 text-sm">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Client side */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-sm font-bold">
                  C
                </div>
                <span className="font-bold text-pink-300">Para o cliente</span>
              </div>
              <div className="space-y-4">
                {[
                  'Acessa o link do tatuador',
                  'Vê o portfólio e se apaixona',
                  'Escolhe data e horário disponível',
                  'Descreve o procedimento e envia referência',
                  'Paga o sinal via Pix (QR Code automático)',
                  'Aguarda confirmação e está agendado!',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-pink-900 border border-pink-600 flex items-center justify-center text-xs font-bold text-pink-300 flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-zinc-300 text-sm">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Tatuadores que <span className="text-purple-400">amaram</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="font-bold text-sm">{t.name}</p>
                  <p className="text-zinc-500 text-xs">{t.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">Um plano. Simples assim.</h2>
          <p className="text-zinc-400 mb-10">
            Sem tier gratuito com limitação, sem plano premium confuso. Um plano completo para
            quem leva a sério.
          </p>

          <div className="bg-gradient-to-b from-purple-950/40 to-pink-950/20 border border-purple-500/30 rounded-3xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                MAIS POPULAR
              </span>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-zinc-400 text-lg">R$</span>
                <span className="text-6xl font-black">49</span>
                <span className="text-zinc-400">/mês</span>
              </div>
              <p className="text-zinc-500 text-sm mt-1">ou R$ 490/ano (2 meses grátis)</p>
            </div>

            <div className="space-y-3 mb-8 text-left">
              {[
                'Mini site profissional exclusivo',
                'Link personalizado tatu.app/você',
                'Portfólio de até 10 fotos',
                'Agenda online configurável',
                'Reserva com sinal via Pix',
                'QR Code gerado automaticamente',
                'Painel de agendamentos',
                'Suporte por WhatsApp',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                  <span className="text-zinc-300 text-sm">{item}</span>
                </div>
              ))}
            </div>

            <button
              onClick={onRegister}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity text-lg"
            >
              Começar agora
            </button>
            <p className="text-zinc-500 text-xs mt-3">7 dias grátis para testar</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/20 rounded-3xl p-10 sm:p-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Pronto para ter uma agenda que{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                trabalha por você?
              </span>
            </h2>
            <p className="text-zinc-400 mb-8">
              Configure seu perfil em minutos e comece a receber agendamentos ainda hoje.
            </p>
            <button
              onClick={onRegister}
              className="flex items-center justify-center gap-2 mx-auto bg-white text-black font-bold px-10 py-4 rounded-xl hover:bg-zinc-200 transition-colors text-lg"
            >
              Criar meu perfil <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <span className="font-bold text-sm">TatuApp</span>
          </div>
          <p className="text-zinc-600 text-xs">
            © {new Date().getFullYear()} TatuApp. Feito para tattoo, piercing e estudios criativos.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">
              Termos
            </a>
            <a href="#" className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">
              Privacidade
            </a>
            <a href="#" className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">
              Suporte
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
