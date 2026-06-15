import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle,
  CreditCard,
  ExternalLink,
  Gift,
  KeyRound,
  Loader2,
  LogOut,
  MessageSquare,
  Search,
  Send,
  Shield,
  Unlock,
  Users,
  X,
  MoreHorizontal,
} from 'lucide-react';
import type { AdminArtistAccount } from '../types';
import {
  getPlatformBillingSettings,
  grantArtistAccess,
  isCurrentUserPlatformAdmin,
  listAdminArtistAccounts,
  sendArtistSupportMessage,
  setArtistBlocked,
  updatePlatformMonthlyPrice,
} from '../services/adminService';
import { isSupabaseConfigured } from '../lib/supabase';
import { useModalHistory } from '../hooks/useModalHistory';
import ChangePasswordModal from './ChangePasswordModal';

interface AdminPanelProps {
  onBack: () => void;
  onLogout: () => void;
}

type BenefitPeriod =
  | 'benefit_1_month'
  | 'benefit_2_months'
  | 'benefit_3_months'
  | 'benefit_lifetime';
type ModalKind = 'paid' | 'trial' | 'overdue' | 'all';

const defaultMonthlyPrice = Number(import.meta.env.VITE_PLATFORM_MONTHLY_PRICE || '49');
const finalBonusOptions: Array<{
  value: BenefitPeriod;
  label: string;
  days?: number;
}> = [
  { value: 'benefit_1_month', label: '30 dias', days: 30 },
  { value: 'benefit_2_months', label: '60 dias', days: 60 },
  { value: 'benefit_3_months', label: '90 dias', days: 90 },
  { value: 'benefit_lifetime', label: 'Vitalício' },
];

function hasActiveAccess(account: AdminArtistAccount) {
  return account.planStatus !== 'blocked' && (account.accessLifetime || Boolean(account.accessUntil));
}

function isPaidAccount(account: AdminArtistAccount) {
  return hasActiveAccess(account) && ['paid_infinitepay', 'paid_mercado_pago', 'paid_pix'].includes(account.accessSource);
}

function formatAccessDate(value: string | null) {
  if (!value) return 'Sem acesso ativo';
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function buildBenefitEndDate(period: BenefitPeriod) {
  if (period === 'benefit_lifetime') return null;

  const option = finalBonusOptions.find((item) => item.value === period);
  const date = new Date();
  date.setDate(date.getDate() + (option?.days ?? 30));
  return date.toISOString();
}

function getBenefitLabel(period: BenefitPeriod) {
  return finalBonusOptions.find((item) => item.value === period)?.label ?? '30 dias';
}

function buildDaysEndDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function getModalTitle(kind: ModalKind) {
  if (kind === 'paid') return 'Pagamentos recebidos';
  if (kind === 'trial') return 'Em teste grátis';
  if (kind === 'overdue') return 'Inadimplentes';
  return 'Cadastrados no site';
}

function getStatusLabel(account: AdminArtistAccount) {
  if (account.planStatus === 'blocked') return 'Bloqueado';
  if (isPaidAccount(account)) return 'Pago';
  if (account.accessSource === 'trial' && account.accessUntil) return 'Teste grátis';
  if (account.accessLifetime) return 'Gratuito vitalício';
  if (account.accessUntil) return 'Gratuito ativo';
  return 'Inadimplente';
}

function StatCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
  onClick,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  tone: 'green' | 'yellow' | 'red' | 'purple';
  onClick: () => void;
}) {
  const toneClasses = {
    green: 'from-green-500 to-emerald-400 text-green-300 border-green-900/40',
    yellow: 'from-yellow-500 to-amber-400 text-yellow-300 border-yellow-900/40',
    red: 'from-red-500 to-rose-400 text-red-300 border-red-900/40',
    purple: 'from-purple-500 to-pink-500 text-purple-300 border-purple-900/40',
  }[tone];

  return (
    <button
      onClick={onClick}
      className="group bg-white/5 border border-white/10 rounded-2xl p-5 text-left hover:bg-white/[0.08] hover:border-white/20 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.16em]">{title}</p>
          <p className="text-3xl font-black mt-3">{value}</p>
          <p className="text-zinc-500 text-xs mt-1">{detail}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl border bg-black/30 flex items-center justify-center ${toneClasses}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-zinc-600 text-[11px] mt-3 group-hover:text-zinc-400 transition-colors">
        Clique para abrir a lista
      </p>
    </button>
  );
}

function AccountRow({
  account,
  isSaving,
  onBonusOpen,
  onTempUnlock,
  onPaidGrant,
  onBlockToggle,
  onMessageOpen,
  onOpenProfile,
}: {
  account: AdminArtistAccount;
  isSaving: boolean;
  onBonusOpen: () => void;
  onTempUnlock: () => void;
  onPaidGrant: () => void;
  onBlockToggle: () => void;
  onMessageOpen: () => void;
  onOpenProfile: () => void;
}) {
  const blocked = account.planStatus === 'blocked';
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <article className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="mb-1 flex min-w-0 items-center gap-2">
            <h2 className="truncate text-sm font-black">{account.artisticName}</h2>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                blocked
                  ? 'bg-red-950/40 border-red-900/50 text-red-300'
                  : isPaidAccount(account)
                  ? 'bg-green-950/40 border-green-900/40 text-green-300'
                  : hasActiveAccess(account)
                  ? 'bg-purple-950/40 border-purple-900/40 text-purple-300'
                  : 'bg-red-950/30 border-red-900/40 text-red-300'
              }`}
            >
              {getStatusLabel(account)}
            </span>
          </div>

          <p className="truncate text-xs text-zinc-500">
            {account.email || 'E-mail vazio'} · ID {account.userId.slice(0, 8)}
          </p>
          <p className="truncate text-[11px] text-zinc-600">
            {account.accessLifetime ? 'Acesso vitalício' : formatAccessDate(account.accessUntil)}
          </p>
        </div>

        <div className="relative flex gap-2 xl:justify-end">
          <button
            type="button"
            onClick={onOpenProfile}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ExternalLink size={14} />
            Perfil
          </button>
          <button
            type="button"
            onClick={() => setActionsOpen((current) => !current)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <MoreHorizontal size={15} />
            Ações
          </button>

          {actionsOpen && (
            <div className="absolute right-0 top-12 z-20 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#151515] p-2 shadow-2xl">
              <button
                type="button"
                onClick={() => {
                  setActionsOpen(false);
                  onMessageOpen();
                }}
                disabled={isSaving}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                <MessageSquare size={14} />
                Enviar mensagem
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionsOpen(false);
                  onTempUnlock();
                }}
                disabled={isSaving}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-sky-200 transition-colors hover:bg-sky-500/10 disabled:opacity-60"
              >
                <Unlock size={14} />
                +7 temporário
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionsOpen(false);
                  onBlockToggle();
                }}
                disabled={isSaving}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-colors disabled:opacity-60 ${
                  blocked ? 'text-green-200 hover:bg-green-500/10' : 'text-red-200 hover:bg-red-500/10'
                }`}
              >
                {blocked ? <Unlock size={14} /> : <Ban size={14} />}
                {blocked ? 'Liberar acesso' : 'Bloquear usuário'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionsOpen(false);
                  onPaidGrant();
                }}
                disabled={isSaving}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-green-200 transition-colors hover:bg-green-500/10 disabled:opacity-60"
              >
                <CreditCard size={14} />
                Pagamento manual +30d
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionsOpen(false);
                  onBonusOpen();
                }}
                disabled={isSaving}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-purple-200 transition-colors hover:bg-purple-500/10 disabled:opacity-60"
              >
                <Gift size={14} />
                Bônus
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function AdminPanel({ onBack, onLogout }: AdminPanelProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingArtistId, setSavingArtistId] = useState('');
  const [accounts, setAccounts] = useState<AdminArtistAccount[]>([]);
  const [query, setQuery] = useState('');
  const [accessQuery, setAccessQuery] = useState('');
  const [activeModal, setActiveModal] = useState<ModalKind | null>(null);
  const [bonusAccount, setBonusAccount] = useState<AdminArtistAccount | null>(null);
  const [messageAccount, setMessageAccount] = useState<AdminArtistAccount | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState(defaultMonthlyPrice);
  const [monthlyPriceDraft, setMonthlyPriceDraft] = useState(String(defaultMonthlyPrice));
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useModalHistory(
    Boolean(activeModal),
    () => {
      setActiveModal(null);
      setQuery('');
    },
    'admin-account-list'
  );
  useModalHistory(Boolean(bonusAccount), () => setBonusAccount(null), 'admin-bonus');
  useModalHistory(
    Boolean(messageAccount),
    () => {
      setMessageAccount(null);
      setMessageDraft('');
    },
    'admin-support-message'
  );

  const stats = useMemo(() => {
    const paid = accounts.filter(isPaidAccount);
    const trial = accounts.filter((account) => account.accessSource === 'trial' && hasActiveAccess(account));
    const overdue = accounts.filter((account) => !hasActiveAccess(account));
    const active = accounts.filter(hasActiveAccess);

    return {
      paid,
      trial,
      overdue,
      active,
      all: accounts,
      paidRevenue: paid.length * monthlyPrice,
      overdueRevenue: overdue.length * monthlyPrice,
    };
  }, [accounts, monthlyPrice]);

  const modalAccounts = useMemo(() => {
    const base =
      activeModal === 'paid'
        ? stats.paid
        : activeModal === 'trial'
        ? stats.trial
        : activeModal === 'overdue'
        ? stats.overdue
        : stats.all;

    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return base;

    return base.filter((account) =>
      [
        account.artisticName,
        account.realName,
        account.email,
        account.artistId,
        account.userId,
        account.slug,
        account.instagram,
        account.whatsapp,
        account.city,
      ]
        .join(' ')
        .toLowerCase()
        .includes(cleanQuery)
    );
  }, [activeModal, query, stats]);

  const benefitSearchResults = useMemo(() => {
    const cleanQuery = accessQuery.trim().toLowerCase();
    const filteredAccounts = cleanQuery
      ? accounts.filter((account) =>
          [
            account.artisticName,
            account.realName,
            account.email,
            account.artistId,
            account.userId,
            account.slug,
            account.instagram,
            account.whatsapp,
            account.city,
            account.state,
          ]
            .join(' ')
            .toLowerCase()
            .includes(cleanQuery)
        )
      : accounts;

    return filteredAccounts;
  }, [accessQuery, accounts]);

  const loadAdminData = async () => {
    setLoading(true);
    setError('');

    try {
      if (!isSupabaseConfigured) {
        setError('Configure o Supabase para usar o painel administrativo.');
        return;
      }

      const admin = await isCurrentUserPlatformAdmin();
      setIsAdmin(admin);

      if (!admin) {
        setError('Seu usuario ainda nao foi liberado como administrador da plataforma.');
        return;
      }

      const [accountRows, billingSettings] = await Promise.all([
        listAdminArtistAccounts(),
        getPlatformBillingSettings(),
      ]);
      const nextPrice = billingSettings.monthlyPriceCents / 100;
      setAccounts(accountRows);
      setMonthlyPrice(nextPrice);
      setMonthlyPriceDraft(String(nextPrice));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar o admin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  const handleBenefitGrant = async (account: AdminArtistAccount, period: BenefitPeriod) => {
    const lifetime = period === 'benefit_lifetime';

    setSavingArtistId(account.artistId);
    setError('');
    setNotice('');

    try {
      await grantArtistAccess(
        account.artistId,
        buildBenefitEndDate(period),
        lifetime,
        `Benefício manual - ${getBenefitLabel(period)}`,
        lifetime ? 'lifetime' : 'manual_free'
      );
      setNotice(`Benefício de ${getBenefitLabel(period)} aplicado para ${account.artisticName}.`);
      setAccounts(await listAdminArtistAccounts());
      setBonusAccount(null);
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : 'Nao foi possivel aplicar beneficio.');
    } finally {
      setSavingArtistId('');
    }
  };

  const handleTempUnlock = async (account: AdminArtistAccount) => {
    setSavingArtistId(account.artistId);
    setError('');
    setNotice('');

    try {
      await grantArtistAccess(
        account.artistId,
        buildDaysEndDate(7),
        false,
        'Desbloqueio temporário administrativo - 7 dias',
        'manual_free'
      );
      setNotice(`Desbloqueio temporário de 7 dias aplicado para ${account.artisticName}.`);
      setAccounts(await listAdminArtistAccounts());
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : 'Nao foi possivel aplicar desbloqueio temporario.');
    } finally {
      setSavingArtistId('');
    }
  };

  const handlePaidGrant = async (account: AdminArtistAccount) => {
    setSavingArtistId(account.artistId);
    setError('');
    setNotice('');

    try {
      await grantArtistAccess(
        account.artistId,
        buildBenefitEndDate('benefit_1_month'),
        false,
        'Pagamento InfinitePay confirmado manualmente - 30 dias corridos',
        'paid_infinitepay'
      );
      setNotice(`Pagamento InfinitePay confirmado para ${account.artisticName}.`);
      setAccounts(await listAdminArtistAccounts());
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : 'Nao foi possivel confirmar pagamento.');
    } finally {
      setSavingArtistId('');
    }
  };

  const handleBlockToggle = async (account: AdminArtistAccount) => {
    const shouldBlock = account.planStatus !== 'blocked';
    setSavingArtistId(account.artistId);
    setError('');
    setNotice('');

    try {
      await setArtistBlocked(account.artistId, shouldBlock);
      setNotice(`${account.artisticName} ${shouldBlock ? 'bloqueado' : 'liberado'} com sucesso.`);
      setAccounts(await listAdminArtistAccounts());
    } catch (blockError) {
      setError(blockError instanceof Error ? blockError.message : 'Nao foi possivel alterar o bloqueio.');
    } finally {
      setSavingArtistId('');
    }
  };

  const handleSupportMessage = async () => {
    if (!messageAccount || !messageDraft.trim() || sendingMessage) return;
    setSendingMessage(true);
    setError('');
    setNotice('');

    try {
      await sendArtistSupportMessage(messageAccount.artistId, messageDraft.trim());
      setNotice(`Mensagem enviada para ${messageAccount.artisticName}.`);
      setMessageAccount(null);
      setMessageDraft('');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Nao foi possivel enviar a mensagem.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handlePriceSave = async () => {
    const parsed = Number(String(monthlyPriceDraft).replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Informe um valor mensal valido.');
      return;
    }

    setError('');
    setNotice('');

    try {
      const cents = await updatePlatformMonthlyPrice(Math.round(parsed * 100));
      const nextPrice = cents / 100;
      setMonthlyPrice(nextPrice);
      setMonthlyPriceDraft(String(nextPrice));
      setNotice(`Mensalidade atualizada para ${formatCurrency(nextPrice)}.`);
    } catch (priceError) {
      setError(priceError instanceof Error ? priceError.message : 'Nao foi possivel alterar o preco.');
    }
  };

  const openPublicProfile = (account: AdminArtistAccount) => {
    window.open(`/${account.slug}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter">
      <header className="border-b border-white/10 bg-[#111111]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Início
          </button>

          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Shield size={16} />
            </span>
            Admin TatuApp
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <KeyRound size={15} />
              <span className="hidden sm:inline">Senha</span>
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <p className="text-purple-300 text-xs font-bold uppercase tracking-[0.2em] mb-2">
                Painel financeiro
              </p>
              <h1 className="text-2xl sm:text-3xl font-black">Admin da plataforma</h1>
              <p className="text-zinc-400 text-sm mt-2 max-w-2xl">
                Gestão objetiva de acessos: pagos, teste grátis, inadimplentes e liberações manuais.
              </p>
            </div>

            <button
              onClick={() => setActiveModal('all')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl px-5 py-3 text-sm hover:opacity-90 transition-opacity"
            >
              Ver cadastrados
            </button>
          </div>
        </section>

        {notice && (
          <div className="bg-green-950/30 border border-green-900/40 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle size={18} className="text-green-400" />
            <p className="text-green-200 text-sm">{notice}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/30 border border-red-900/40 rounded-2xl p-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-10 flex items-center justify-center gap-3 text-zinc-400">
            <Loader2 size={18} className="animate-spin" />
            Carregando painel administrativo...
          </div>
        ) : isAdmin ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Pagamentos recebidos"
              value={formatCurrency(stats.paidRevenue)}
              detail={`${stats.paid.length} usuário${stats.paid.length === 1 ? '' : 's'} pago${stats.paid.length === 1 ? '' : 's'}`}
              icon={CreditCard}
              tone="green"
              onClick={() => setActiveModal('paid')}
            />
            <StatCard
              title="Teste grátis"
              value={`${stats.trial.length}`}
              detail="Usuários dentro dos 7 dias iniciais"
              icon={Shield}
              tone="yellow"
              onClick={() => setActiveModal('trial')}
            />
            <StatCard
              title="Inadimplentes"
              value={`${stats.overdue.length}`}
              detail={`${formatCurrency(stats.overdueRevenue)} em mensalidades abertas`}
              icon={AlertTriangle}
              tone="red"
              onClick={() => setActiveModal('overdue')}
            />
            <StatCard
              title="Cadastrados"
              value={`${stats.all.length}`}
              detail={`${stats.active.length} com acesso ativo`}
              icon={Users}
              tone="purple"
              onClick={() => setActiveModal('all')}
            />
          </div>
        ) : null}

        {isAdmin && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
              <div>
                <p className="text-purple-300 text-xs font-bold uppercase tracking-[0.2em] mb-2">
                  Configuração da plataforma
                </p>
                <h2 className="text-xl font-black">Mensalidade</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Esse valor é usado nos novos checkouts da InfinitePay.
                </p>
              </div>
              <div className="grid grid-cols-[1fr_96px] gap-2">
                <label className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
                    R$
                  </span>
                  <input
                    value={monthlyPriceDraft}
                    onChange={(event) => setMonthlyPriceDraft(event.target.value)}
                    inputMode="decimal"
                    className="h-11 w-full rounded-xl border border-white/10 bg-black/25 pl-10 pr-3 text-sm font-bold text-white outline-none transition-colors focus:border-purple-500"
                  />
                </label>
                <button
                  type="button"
                  onClick={handlePriceSave}
                  className="h-11 rounded-xl bg-white/10 px-4 text-sm font-bold text-white transition-colors hover:bg-white/15"
                >
                  Salvar
                </button>
              </div>
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
              <div>
                <p className="text-purple-300 text-xs font-bold uppercase tracking-[0.2em] mb-2">
                  Usuários
                </p>
                <h2 className="text-xl sm:text-2xl font-black">Gerenciar acessos</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Busque um usuário e tome uma ação: ver perfil, bloquear, liberar +30 dias ou dar bônus.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal('all')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Users size={16} />
                Abrir lista completa
              </button>
            </div>

            <div className="relative mb-4">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={accessQuery}
                onChange={(event) => setAccessQuery(event.target.value)}
                placeholder="Pesquisar por nome, e-mail ou ID"
                className="w-full rounded-2xl border border-white/10 bg-black/30 py-3.5 pl-11 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              {benefitSearchResults.length > 0 ? (
                benefitSearchResults.map((account) => (
                  <AccountRow
                    key={account.artistId}
                    account={account}
                    isSaving={savingArtistId === account.artistId}
                    onBonusOpen={() => setBonusAccount(account)}
                    onTempUnlock={() => handleTempUnlock(account)}
                    onPaidGrant={() => handlePaidGrant(account)}
                    onBlockToggle={() => handleBlockToggle(account)}
                    onMessageOpen={() => setMessageAccount(account)}
                    onOpenProfile={() => openPublicProfile(account)}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center">
                  <p className="text-sm font-bold text-zinc-300">Nenhum usuário encontrado.</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Use a busca por nome, e-mail ou ID para aplicar um benefício manual.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl max-h-[88vh] bg-[#111111] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <header className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-4">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-[0.18em] font-bold">Lista</p>
                <h2 className="font-black text-xl">{getModalTitle(activeModal)}</h2>
              </div>
              <button
                onClick={() => {
                  setActiveModal(null);
                  setQuery('');
                }}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </header>

            <div className="p-4 sm:p-5 border-b border-white/10">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nome, e-mail, ID, Instagram, WhatsApp ou cidade"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {modalAccounts.length > 0 ? (
                modalAccounts.map((account) => (
                  <AccountRow
                    key={account.artistId}
                    account={account}
                    isSaving={savingArtistId === account.artistId}
                    onBonusOpen={() => setBonusAccount(account)}
                    onTempUnlock={() => handleTempUnlock(account)}
                    onPaidGrant={() => handlePaidGrant(account)}
                    onBlockToggle={() => handleBlockToggle(account)}
                    onMessageOpen={() => setMessageAccount(account)}
                    onOpenProfile={() => openPublicProfile(account)}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-zinc-400 text-sm">Nenhum usuário encontrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {bonusAccount && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-300">Bônus manual</p>
                <h2 className="mt-1 text-xl font-black">{bonusAccount.artisticName}</h2>
                <p className="mt-1 text-xs text-zinc-500">{bonusAccount.email || 'E-mail vazio'}</p>
              </div>
              <button
                type="button"
                onClick={() => setBonusAccount(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-2">
              {finalBonusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleBenefitGrant(bonusAccount, option.value)}
                  disabled={savingArtistId === bonusAccount.artistId}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-purple-500/40 hover:bg-purple-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    <span className="block text-sm font-black text-white">{option.label}</span>
                    <span className="text-xs text-zinc-500">
                      {option.value === 'benefit_lifetime' ? 'Acesso sem vencimento' : 'Liberação manual de acesso'}
                    </span>
                  </span>
                  <Gift size={16} className="text-purple-300" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {messageAccount && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-300">Comunicação interna</p>
                <h2 className="mt-1 text-xl font-black">{messageAccount.artisticName}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMessageAccount(null);
                  setMessageDraft('');
                }}
                aria-label="Fechar"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <textarea
              value={messageDraft}
              onChange={(event) => setMessageDraft(event.target.value.slice(0, 500))}
              rows={4}
              placeholder="Escreva a mensagem que aparecerá no painel do profissional"
              className="w-full resize-none rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-purple-500"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-600">{messageDraft.length}/500</span>
              <button
                type="button"
                onClick={() => void handleSupportMessage()}
                disabled={!messageDraft.trim() || sendingMessage}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
              >
                {sendingMessage ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </div>
  );
}
