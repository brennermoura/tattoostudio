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
  Search,
  ArrowLeft,
  X,
} from 'lucide-react';
import { ArtistProfile, Appointment, type ArtistNotification } from '../types';
import ProfileEditor from './dashboard/ProfileEditor';
import PortfolioEditor from './dashboard/PortfolioEditor';
import ScheduleConfig from './dashboard/ScheduleConfig';
import AppointmentsList from './dashboard/AppointmentsList';
import PixConfig from './dashboard/PixConfig';
import BillingNotice from './dashboard/BillingNotice';
import PaymentsHistory from './dashboard/PaymentsHistory';
import { useModalHistory } from '../hooks/useModalHistory';
import ChangePasswordModal from './ChangePasswordModal';
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';

export type DashSection = 'home' | 'profile' | 'portfolio' | 'schedule' | 'appointments' | 'pix' | 'payments';

interface DashboardProps {
  artist: ArtistProfile;
  initialSection?: DashSection;
  onArtistUpdate: (artist: ArtistProfile) => void;
  onOpenExplore: () => void;
  onViewPublicProfile: () => void;
  onLogout: () => void;
}

const navItems: { id: DashSection; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Início', icon: LayoutDashboard },
  { id: 'appointments', label: 'Agendamentos', icon: ClipboardList },
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

function ProfileShareModal({
  artist,
  open,
  onClose,
}: {
  artist: ArtistProfile;
  open: boolean;
  onClose: () => void;
}) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [generatingQr, setGeneratingQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const profileUrl = useMemo(() => buildProfileUrl(artist.slug), [artist.slug]);
  const shareText = `${artist.artisticName} no TatuApp: ${profileUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  useEffect(() => {
    if (open) return;
    setQrCodeUrl('');
    setGeneratingQr(false);
    setCopied(false);
  }, [open]);

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

  const generateQrCode = async () => {
    setGeneratingQr(true);
    try {
      const url = await QRCode.toDataURL(profileUrl, {
        margin: 1,
        width: 360,
        color: {
          dark: '#111111',
          light: '#ffffff',
        },
      });
      setQrCodeUrl(url);
    } finally {
      setGeneratingQr(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Compartilhar perfil">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-purple-300">Compartilhar</p>
            <h2 className="mt-1 text-xl font-black text-white">Perfil público</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
          <p className="truncate text-sm font-semibold text-zinc-200">{profileUrl}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void copyProfileLink()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-white/10"
          >
            <Copy size={16} />
            {copied ? 'Copiado' : 'Copiar link'}
          </button>
          <button
            type="button"
            onClick={() => void shareProfile()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-white/10"
          >
            <Share2 size={16} />
            Enviar
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-500/25 bg-green-500/10 px-3 py-3 text-sm font-bold text-green-100 transition-colors hover:bg-green-500/15"
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => void generateQrCode()}
            disabled={generatingQr}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-60"
          >
            <QrCode size={16} />
            {generatingQr ? 'Gerando...' : 'Gerar QR'}
          </button>
        </div>

        {qrCodeUrl && (
          <div className="mt-4 flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <img
              src={qrCodeUrl}
              alt={`QR Code do perfil de ${artist.artisticName}`}
              className="h-24 w-24 rounded-lg bg-white p-1"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">QR Code pronto</p>
              <a
                href={qrCodeUrl}
                download={`qr-${artist.slug}.png`}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-black transition-colors hover:bg-zinc-200"
              >
                <Download size={14} />
                Baixar PNG
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function NotificationsModal({
  notifications,
  open,
  onClose,
  onReadAll,
  onSelect,
}: {
  notifications: ArtistNotification[];
  open: boolean;
  onClose: () => void;
  onReadAll: () => void;
  onSelect: (notification: ArtistNotification) => void;
}) {
  if (!open) return null;

  const icons = {
    like: User,
    appointment: Calendar,
    support: MessageCircle,
    billing: ReceiptText,
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4">
      <section className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111111] shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <p className="text-xs font-black uppercase text-purple-300">Atividade</p>
            <h2 className="mt-1 text-xl font-black text-white">Notificações</h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some((notification) => !notification.readAt) && (
              <button
                type="button"
                onClick={onReadAll}
                className="rounded-lg px-2 py-2 text-xs font-bold text-zinc-400 transition-colors hover:text-white"
              >
                Marcar lidas
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>
        </header>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {notifications.length === 0 ? (
            <div className="py-10 text-center">
              <Bell size={22} className="mx-auto text-zinc-700" />
              <p className="mt-3 text-sm font-bold text-zinc-400">Nenhuma atividade nova</p>
              <p className="mt-1 text-xs text-zinc-600">Curtidas, agendamentos e mensagens aparecem aqui.</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = icons[notification.type];
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => onSelect(notification)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-white/[0.07] ${
                    notification.readAt
                      ? 'border-white/5 bg-white/[0.02]'
                      : 'border-purple-500/20 bg-purple-500/[0.07]'
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-300">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-white">{notification.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{notification.message}</span>
                    <span className="mt-1.5 block text-[11px] text-zinc-600">
                      {new Date(notification.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                  {!notification.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-purple-400" />}
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

const configurationActions: { id: DashSection; label: string; detail: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Perfil', detail: 'Dados, endereço e apresentação', icon: User },
  { id: 'portfolio', label: 'Portfólio', detail: 'Fotos e destaques do trabalho', icon: Image },
  { id: 'schedule', label: 'Agenda', detail: 'Disponibilidade e horários', icon: Calendar },
  { id: 'pix', label: 'Pix', detail: 'Sinal e chave de recebimento', icon: QrCode },
];

export default function Dashboard({
  artist,
  initialSection = 'home',
  onArtistUpdate,
  onOpenExplore,
  onViewPublicProfile,
  onLogout,
}: DashboardProps) {
  const [section, setSection] = useState<DashSection>(initialSection);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ArtistNotification[]>([]);

  useModalHistory(mobileMenuOpen, () => setMobileMenuOpen(false), 'dashboard-mobile-menu');
  useModalHistory(shareModalOpen, () => setShareModalOpen(false), 'dashboard-share-profile');
  useModalHistory(notificationsOpen, () => setNotificationsOpen(false), 'dashboard-notifications');

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const pendingCount = artist.appointments.filter((a) => a.status === 'pending').length;
  const unreadNotifications = notifications.filter((notification) => !notification.readAt).length;
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

  useEffect(() => {
    let cancelled = false;
    const refreshNotifications = async () => {
      try {
        const nextNotifications = await listMyNotifications();
        if (!cancelled) setNotifications(nextNotifications);
      } catch {
        if (!cancelled) setNotifications([]);
      }
    };

    void refreshNotifications();
    const timer = window.setInterval(() => void refreshNotifications(), 45000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [artist.id]);

  const openNotifications = async () => {
    setNotificationsOpen(true);
    try {
      setNotifications(await listMyNotifications());
    } catch {
      setNotifications([]);
    }
  };

  const handleNotificationSelect = async (notification: ArtistNotification) => {
    if (!notification.readAt) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item
        )
      );
      void markNotificationRead(notification.id);
    }

    setNotificationsOpen(false);
    if (notification.action === 'appointments') handleNav('appointments');
    if (notification.action === 'payments') handleNav('payments');
    if (notification.action === 'profile') onViewPublicProfile();
  };

  const handleReadAllNotifications = async () => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        readAt: notification.readAt || new Date().toISOString(),
      }))
    );
    await markAllNotificationsRead().catch(() => undefined);
  };

  const configurationView = (content: React.ReactNode) => (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setSection('home')}
        className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-sm font-bold text-purple-100 transition-colors hover:border-purple-400/35 hover:bg-purple-500/15"
      >
        <ArrowLeft size={16} />
        Voltar ao painel
      </button>
      {content}
    </div>
  );

  const renderSection = () => {
    if (billingLocked && section !== 'home' && section !== 'payments') {
      return (
        <DashHome
          artist={artist}
          setSection={setSection}
          billingLocked={billingLocked}
          onOpenShare={() => setShareModalOpen(true)}
        />
      );
    }

    switch (section) {
      case 'profile':
        return configurationView(<ProfileEditor artist={artist} onUpdate={onArtistUpdate} />);
      case 'portfolio':
        return configurationView(<PortfolioEditor artist={artist} onUpdate={onArtistUpdate} />);
      case 'schedule':
        return configurationView(<ScheduleConfig artist={artist} onUpdate={onArtistUpdate} />);
      case 'appointments':
        return configurationView(<AppointmentsList artist={artist} onUpdate={onArtistUpdate} />);
      case 'pix':
        return (
          <PixConfig
            artist={artist}
            onUpdate={onArtistUpdate}
            onBack={() => setSection('home')}
          />
        );
      case 'payments':
        return configurationView(<PaymentsHistory />);
      default:
        return <DashHome
          artist={artist}
          setSection={setSection}
          billingLocked={billingLocked}
          onOpenShare={() => setShareModalOpen(true)}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#0d0d0d] border-r border-white/5 fixed top-0 left-0 bottom-0 z-40">
        {/* Logo */}
        <div className="flex items-center justify-between gap-2 border-b border-purple-500/10 px-5 py-5">
          <button type="button" onClick={() => handleNav('home')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-lg">TatuApp</span>
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onViewPublicProfile}
              title="Ver perfil público"
              aria-label="Ver perfil público"
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <User size={18} />
            </button>
            <button
              type="button"
              onClick={() => void openNotifications()}
              title="Notificações"
              aria-label="Notificações"
              className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Bell size={18} />
              {unreadNotifications > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
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
            onClick={onOpenExplore}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Search size={18} />
            Pesquisar artistas
          </button>
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
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between border-b border-purple-500/15 bg-[#121016]/95 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <button type="button" onClick={() => handleNav('home')} className="text-sm font-black text-white">
            Tatu<span className="text-purple-300">App</span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onViewPublicProfile}
            aria-label="Ver perfil público"
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <User size={20} />
          </button>
          <button
            type="button"
            onClick={() => void openNotifications()}
            aria-label="Notificações"
            className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Bell size={20} />
            {unreadNotifications > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>
        <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-purple-500/70 via-pink-500/30 to-transparent" />
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
              <button
                onClick={() => handleNav('home')}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-zinc-300 hover:bg-white/5 transition-all"
              >
                <LayoutDashboard size={20} />
                Painel inicial
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenExplore();
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-zinc-300 hover:bg-white/5 transition-all"
              >
                <Search size={20} />
                Pesquisar artistas
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onViewPublicProfile();
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-zinc-300 hover:bg-white/5 transition-all"
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
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 min-h-screen bg-[linear-gradient(180deg,rgba(168,85,247,0.12)_0%,rgba(236,72,153,0.045)_170px,transparent_330px)]">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">{renderSection()}</div>
      </main>

      <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
      <ProfileShareModal artist={artist} open={shareModalOpen} onClose={() => setShareModalOpen(false)} />
      <NotificationsModal
        notifications={notifications}
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onReadAll={() => void handleReadAllNotifications()}
        onSelect={(notification) => void handleNotificationSelect(notification)}
      />
    </div>
  );
}

function DashHome({
  artist,
  setSection,
  billingLocked = false,
  onOpenShare,
}: {
  artist: ArtistProfile;
  setSection: (s: DashSection) => void;
  billingLocked?: boolean;
  onOpenShare: () => void;
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black">
            Olá, {artist.artisticName.split(' ')[0]}!
          </h1>
          <p className="text-zinc-500 text-sm">Resumo rápido da agenda e acesso.</p>
        </div>
        {!billingLocked && (
          <button
            type="button"
            onClick={onOpenShare}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold text-zinc-200 transition-colors hover:bg-white/10"
          >
            <Share2 size={16} />
            Compartilhar
          </button>
        )}
      </div>

      <BillingNotice artist={artist} />

      {billingLocked && (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-100">
          Seu login continua ativo, mas as ferramentas do painel ficam travadas até a assinatura ser confirmada.
        </div>
      )}

      {/* Quick actions */}
      {billingLocked ? (
        <button
          type="button"
          onClick={() => setSection('payments')}
          className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 text-left transition-colors hover:bg-white/[0.07]"
        >
          <ReceiptText size={19} className="text-zinc-400" />
          <span className="flex-1 text-sm font-bold text-white">Ver pagamentos</span>
          <ChevronRight size={17} className="text-zinc-500" />
        </button>
      ) : (
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="mb-4">
            <p className="text-[11px] font-black uppercase text-purple-300">Acesso rápido</p>
            <h2 className="mt-1 text-lg font-black text-white">Configurar e acompanhar</h2>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            {[
              { id: 'appointments' as DashSection, label: 'Agendamentos', icon: ClipboardList },
              { id: 'payments' as DashSection, label: 'Pagamentos', icon: ReceiptText },
            ].map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => setSection(action.id)}
                className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-white/[0.08]"
              >
                <action.icon size={17} className="text-zinc-400" />
                <span className="truncate">{action.label}</span>
                {action.id === 'appointments' && pending.length > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                    {pending.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <p className="mb-2 text-[11px] font-black uppercase text-zinc-600">Configurações do perfil</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {configurationActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => setSection(action.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left transition-colors hover:bg-white/[0.08]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-900/20 text-purple-300">
                  <action.icon size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-white">{action.label}</span>
                  <span className="block truncate text-xs text-zinc-500">{action.detail}</span>
                </span>
                <ChevronRight size={16} className="text-zinc-600" />
              </button>
            ))}
          </div>
        </section>
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
