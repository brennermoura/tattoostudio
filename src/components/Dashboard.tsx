import { useEffect, useMemo, useState } from 'react';
import * as QRCode from 'qrcode';
import {
  LayoutDashboard,
  User,
  Image,
  Calendar,
  ClipboardList,
  QrCode,
  ReceiptText,
  LogOut,
  ExternalLink,
  Bell,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  Copy,
  Download,
  KeyRound,
  MessageCircle,
  Menu,
  Share2,
  X,
} from 'lucide-react';
import { ArtistProfile, Appointment } from '../types';
import ProfileEditor from './dashboard/ProfileEditor';
import PortfolioEditor from './dashboard/PortfolioEditor';
import ScheduleConfig from './dashboard/ScheduleConfig';
import AppointmentsList from './dashboard/AppointmentsList';
import PixConfig from './dashboard/PixConfig';
import BillingNotice from './dashboard/BillingNotice';
import PaymentsHistory from './dashboard/PaymentsHistory';
import { useModalHistory } from '../hooks/useModalHistory';
import ChangePasswordModal from './ChangePasswordModal';

export type DashSection = 'home' | 'profile' | 'portfolio' | 'schedule' | 'appointments' | 'pix' | 'payments';

interface DashboardProps {
  artist: ArtistProfile;
  initialSection?: DashSection;
  onArtistUpdate: (artist: ArtistProfile) => void;
  onViewPublicProfile: () => void;
  onLogout: () => void;
}

const navItems: { id: DashSection; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Início', icon: LayoutDashboard },
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'portfolio', label: 'Portfólio', icon: Image },
  { id: 'schedule', label: 'Agenda', icon: Calendar },
  { id: 'appointments', label: 'Agendamentos', icon: ClipboardList },
  { id: 'pix', label: 'Pix', icon: QrCode },
  { id: 'payments', label: 'Pagamentos', icon: ReceiptText },
];

function StatusBadge({ status }: { status: Appointment['status'] }) {
  if (status === 'approved')
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-950/50 border border-green-900/50 px-2 py-0.5 rounded-full">
        <CheckCircle size={11} /> Aprovado
      </span>
    );
  if (status === 'pending')
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-yellow-400 bg-yellow-950/50 border border-yellow-900/50 px-2 py-0.5 rounded-full">
        <Clock size={11} /> Pendente
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-950/50 border border-red-900/50 px-2 py-0.5 rounded-full">
      <XCircle size={11} /> Recusado
    </span>
  );
}

function buildProfileUrl(slug: string) {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://danielbrenner.online';
  return `${origin}/${slug}`;
}

function ProfileShareCard({ artist }: { artist: ArtistProfile }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const profileUrl = useMemo(() => buildProfileUrl(artist.slug), [artist.slug]);
  const shareText = `${artist.artisticName} no TatuApp: ${profileUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  useEffect(() => {
    let active = true;

    void QRCode.toDataURL(profileUrl, {
      margin: 1,
      width: 320,
      color: {
        dark: '#111111',
        light: '#ffffff',
      },
    }).then((url) => {
      if (active) setQrCodeUrl(url);
    });

    return () => {
      active = false;
    };
  }, [profileUrl]);

  const copyProfileLink = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const shareProfile = async () => {
    if (navigator.share) {
      await navigator.share({
        title: artist.artisticName,
        text: `Conheça meu perfil no TatuApp`,
        url: profileUrl,
      });
      return;
    }

    await copyProfileLink();
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="grid gap-4 p-4 sm:grid-cols-[148px_minmax(0,1fr)] sm:p-5">
        <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-2xl border border-white/10 bg-white p-2 shadow-xl shadow-black/20 sm:mx-0">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt={`QR Code do perfil de ${artist.artisticName}`} className="h-full w-full" />
          ) : (
            <QrCode size={42} className="text-zinc-300" />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-300">
            Divulgar perfil
          </p>
          <h2 className="mt-1 text-xl font-black text-white">Seu link público</h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            Use o QR code no estúdio, copie o link para bio/stories ou envie direto pelo WhatsApp.
          </p>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
            <p className="truncate text-sm font-semibold text-zinc-200">{profileUrl}</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => void copyProfileLink()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-black text-zinc-200 transition-colors hover:bg-white/10"
            >
              <Copy size={15} />
              {copied ? 'Copiado' : 'Copiar link'}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-500/25 bg-green-500/10 px-3 py-2.5 text-xs font-black text-green-100 transition-colors hover:bg-green-500/15"
            >
              <MessageCircle size={15} />
              WhatsApp
            </a>

            <button
              type="button"
              onClick={() => void shareProfile()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-black text-zinc-200 transition-colors hover:bg-white/10"
            >
              <Share2 size={15} />
              Compartilhar
            </button>

            {qrCodeUrl && (
              <a
                href={qrCodeUrl}
                download={`qr-${artist.slug}.png`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-black text-zinc-200 transition-colors hover:bg-white/10"
              >
                <Download size={15} />
                Baixar QR
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Dashboard({
  artist,
  initialSection = 'home',
  onArtistUpdate,
  onViewPublicProfile,
  onLogout,
}: DashboardProps) {
  const [section, setSection] = useState<DashSection>(initialSection);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useModalHistory(mobileMenuOpen, () => setMobileMenuOpen(false), 'dashboard-mobile-menu');

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const pendingCount = artist.appointments.filter((a) => a.status === 'pending').length;
  const billingLocked = artist.plan === 'blocked';
  const availableNavItems = billingLocked
    ? navItems.filter((item) => item.id === 'home' || item.id === 'payments')
    : navItems;

  const handleNav = (id: DashSection) => {
    if (billingLocked && id !== 'home' && id !== 'payments') {
      setSection('home');
      setMobileMenuOpen(false);
      return;
    }

    setSection(id);
    setMobileMenuOpen(false);
  };

  const renderSection = () => {
    if (billingLocked && section !== 'home' && section !== 'payments') {
      return <DashHome artist={artist} setSection={setSection} billingLocked={billingLocked} />;
    }

    switch (section) {
      case 'profile':
        return <ProfileEditor artist={artist} onUpdate={onArtistUpdate} />;
      case 'portfolio':
        return <PortfolioEditor artist={artist} onUpdate={onArtistUpdate} />;
      case 'schedule':
        return <ScheduleConfig artist={artist} onUpdate={onArtistUpdate} />;
      case 'appointments':
        return <AppointmentsList artist={artist} onUpdate={onArtistUpdate} />;
      case 'pix':
        return <PixConfig artist={artist} onUpdate={onArtistUpdate} />;
      case 'payments':
        return <PaymentsHistory />;
      default:
        return <DashHome artist={artist} setSection={setSection} billingLocked={billingLocked} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#111111] border-r border-white/5 fixed top-0 left-0 bottom-0 z-40">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-lg">TatuApp</span>
          </div>
        </div>

        {/* Artist Info */}
        <div className="px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800">
              <img
                src={artist.avatar}
                alt={artist.artisticName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{artist.artisticName}</p>
              <p className="text-zinc-500 text-xs truncate">tatu.app/{artist.slug}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {availableNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                section === item.id
                  ? 'bg-purple-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={18} />
              {item.label}
              {item.id === 'appointments' && pendingCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-white/5 space-y-0.5">
          <button
            onClick={onViewPublicProfile}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <ExternalLink size={18} />
            Ver meu perfil
          </button>
          <button
            onClick={() => setPasswordModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <KeyRound size={18} />
            Alterar senha
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#111111] border-b border-white/5 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white font-bold text-xs">T</span>
          </div>
          <span className="font-bold">TatuApp</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-zinc-400 hover:text-white"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm pt-14">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-6 p-4 bg-white/5 rounded-2xl">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800">
                <img
                  src={artist.avatar}
                  alt={artist.artisticName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-bold">{artist.artisticName}</p>
                <p className="text-zinc-500 text-sm">tatu.app/{artist.slug}</p>
              </div>
            </div>

            <nav className="space-y-1">
              {availableNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                    section === item.id
                      ? 'bg-purple-600 text-white'
                      : 'text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <item.icon size={20} />
                  {item.label}
                  {item.id === 'appointments' && pendingCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                  <ChevronRight size={16} className="ml-auto text-zinc-600" />
                </button>
              ))}
            </nav>

            <div className="mt-6 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onViewPublicProfile();
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-zinc-400 hover:bg-white/5 transition-all"
              >
                <ExternalLink size={20} />
                Ver meu perfil público
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setPasswordModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-zinc-400 hover:bg-white/5 transition-all"
              >
                <KeyRound size={20} />
                Alterar senha
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/20 transition-all"
              >
                <LogOut size={20} />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">{renderSection()}</div>
      </main>

      <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </div>
  );
}

function DashHome({
  artist,
  setSection,
  billingLocked = false,
}: {
  artist: ArtistProfile;
  setSection: (s: DashSection) => void;
  billingLocked?: boolean;
}) {
  const pending = artist.appointments.filter((a) => a.status === 'pending');
  const approved = artist.appointments.filter((a) => a.status === 'approved');
  const today = new Date().toISOString().split('T')[0];
  const todayAppts = artist.appointments.filter((a) => a.date === today);

  const stats = [
    {
      label: 'Agendamentos pendentes',
      value: pending.length,
      color: 'text-yellow-400',
      bg: 'bg-yellow-950/20 border-yellow-900/30',
    },
    {
      label: 'Agendamentos confirmados',
      value: approved.length,
      color: 'text-green-400',
      bg: 'bg-green-950/20 border-green-900/30',
    },
    {
      label: 'Fotos no portfólio',
      value: artist.portfolio.length,
      color: 'text-purple-400',
      bg: 'bg-purple-950/20 border-purple-900/30',
    },
    {
      label: 'Agendamentos hoje',
      value: todayAppts.length,
      color: 'text-pink-400',
      bg: 'bg-pink-950/20 border-pink-900/30',
    },
  ];

  const quickActions = billingLocked
    ? [{ label: 'Ver pagamentos', icon: ReceiptText, section: 'payments' as DashSection }]
    : [
        { label: 'Editar perfil', icon: User, section: 'profile' as DashSection },
        { label: 'Gerenciar portfólio', icon: Image, section: 'portfolio' as DashSection },
        { label: 'Configurar agenda', icon: Calendar, section: 'schedule' as DashSection },
        { label: 'Ver agendamentos', icon: ClipboardList, section: 'appointments' as DashSection },
        { label: 'Ver pagamentos', icon: ReceiptText, section: 'payments' as DashSection },
      ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black">
          Olá, {artist.artisticName.split(' ')[0]}! 👋
        </h1>
        <p className="text-zinc-500 text-sm">Resumo rápido da agenda e acesso.</p>
      </div>

      <BillingNotice artist={artist} />

      {!billingLocked && <ProfileShareCard artist={artist} />}

      {billingLocked && (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-100">
          Seu login continua ativo, mas as ferramentas do painel ficam travadas até a assinatura ser confirmada.
        </div>
      )}

      {/* Alert if pending */}
      {!billingLocked && pending.length > 0 && (
        <button
          onClick={() => setSection('appointments')}
          className="w-full flex items-center gap-3 bg-yellow-950/30 border border-yellow-900/40 rounded-2xl p-4 hover:bg-yellow-950/40 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-yellow-900/50 flex items-center justify-center flex-shrink-0">
            <Bell size={20} className="text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-yellow-300 text-sm">
              {pending.length} agendamento{pending.length > 1 ? 's' : ''} aguardando aprovação
            </p>
            <p className="text-yellow-700 text-xs mt-0.5">Clique para ver e responder</p>
          </div>
          <ChevronRight size={18} className="text-yellow-600 flex-shrink-0" />
        </button>
      )}

      {/* Stats */}
      {!billingLocked && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className={`border rounded-2xl p-4 ${s.bg}`}>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-zinc-400 text-xs mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Ações rápidas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => setSection(action.section)}
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 hover:border-purple-500/30 transition-all text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <action.icon size={18} className="text-purple-400" />
              </div>
              <span className="text-sm font-medium text-zinc-200">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Profile completion */}
      {!billingLocked && <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm">Completude do perfil</h2>
          <span className="text-purple-400 font-bold text-sm">
            {Math.round(
              (([artist.avatar, artist.bio, artist.instagram, artist.pixKey].filter(Boolean).length /
                4) * 100)
            )}
            %
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full mb-4">
          <div
            className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
            style={{
              width: `${Math.round(
                ([artist.avatar, artist.bio, artist.instagram, artist.pixKey].filter(Boolean)
                  .length /
                  4) *
                  100
              )}%`,
            }}
          />
        </div>
        <div className="space-y-2">
          {[
            { label: 'Foto de perfil', done: !!artist.avatar },
            { label: 'Bio preenchida', done: !!artist.bio },
            { label: 'Instagram conectado', done: !!artist.instagram },
            { label: 'Pix configurado', done: !!artist.pixKey },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {item.done ? (
                <CheckCircle size={15} className="text-green-400 flex-shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-zinc-600 flex-shrink-0" />
              )}
              <span
                className={`text-xs ${item.done ? 'text-zinc-300' : 'text-zinc-500'}`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>}

      {/* Recent appointments */}
      {!billingLocked && artist.appointments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Últimos agendamentos
            </h2>
            <button
              onClick={() => setSection('appointments')}
              className="text-purple-400 text-xs hover:text-purple-300 transition-colors"
            >
              Ver todos
            </button>
          </div>
          <div className="space-y-2">
            {artist.appointments.slice(0, 3).map((appt) => (
              <div
                key={appt.id}
                className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl p-3"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <Calendar size={18} className="text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{appt.clientName}</p>
                  <p className="text-zinc-500 text-xs">
                    {new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}{' '}
                    às {appt.time}
                  </p>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
