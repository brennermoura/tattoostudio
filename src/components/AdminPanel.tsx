import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  CreditCard,
  Loader2,
  LogOut,
  Search,
  Shield,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import type { AdminArtistAccount } from '../types';
import {
  grantArtistAccess,
  isCurrentUserPlatformAdmin,
  listAdminArtistAccounts,
} from '../services/adminService';
import { isSupabaseConfigured } from '../lib/supabase';

interface AdminPanelProps {
  onBack: () => void;
  onLogout: () => void;
}

type BenefitPeriod =
  | 'benefit_7_days'
  | 'benefit_1_month'
  | 'benefit_3_months'
  | 'benefit_6_months'
  | 'benefit_1_year'
  | 'benefit_lifetime';
type ModalKind = 'paid' | 'overdue' | 'all';

const monthlyPrice = Number(import.meta.env.VITE_PLATFORM_MONTHLY_PRICE || '49');
const benefitPeriodOptions: Array<{
  value: BenefitPeriod;
  label: string;
  days?: number;
  months?: number;
}> = [
  { value: 'benefit_7_days', label: '7 dias', days: 7 },
  { value: 'benefit_1_month', label: '1 mês', months: 1 },
  { value: 'benefit_3_months', label: '3 meses', months: 3 },
  { value: 'benefit_6_months', label: '6 meses', months: 6 },
  { value: 'benefit_1_year', label: '1 ano', months: 12 },
  { value: 'benefit_lifetime', label: 'Vitalício' },
];

function hasActiveAccess(account: AdminArtistAccount) {
  return account.accessLifetime || Boolean(account.accessUntil);
}

function isPaidAccount(account: AdminArtistAccount) {
  return hasActiveAccess(account) && ['paid_mercado_pago', 'paid_pix'].includes(account.accessSource);
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

  const option = benefitPeriodOptions.find((item) => item.value === period);
  const date = new Date();
  if (option?.days) {
    date.setDate(date.getDate() + option.days);
  } else {
    date.setMonth(date.getMonth() + (option?.months ?? 1));
  }
  return date.toISOString();
}

function getBenefitLabel(period: BenefitPeriod) {
  return benefitPeriodOptions.find((item) => item.value === period)?.label ?? '7 dias';
}

function getModalTitle(kind: ModalKind) {
  if (kind === 'paid') return 'Pagamentos recebidos';
  if (kind === 'overdue') return 'Inadimplentes';
  return 'Cadastrados no site';
}

function getStatusLabel(account: AdminArtistAccount) {
  if (account.planStatus === 'blocked') return 'Bloqueado';
  if (isPaidAccount(account)) return 'Pago';
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
  percent,
  onClick,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  tone: 'green' | 'red' | 'purple';
  percent: number;
  onClick: () => void;
}) {
  const toneClasses = {
    green: 'from-green-500 to-emerald-400 text-green-300 border-green-900/40',
    red: 'from-red-500 to-rose-400 text-red-300 border-red-900/40',
    purple: 'from-purple-500 to-pink-500 text-purple-300 border-purple-900/40',
  }[tone];

  return (
    <button
      onClick={onClick}
      className="group bg-white/5 border border-white/10 rounded-2xl p-5 text-left hover:bg-white/8 hover:border-white/20 transition-all"
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

      <div className="mt-5 h-2 bg-black/40 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${toneClasses.split(' ').slice(0, 2).join(' ')}`}
          style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
        />
      </div>
      <p className="text-zinc-600 text-[11px] mt-3 group-hover:text-zinc-400 transition-colors">
        Clique para abrir a lista
      </p>
    </button>
  );
}

function AccountRow({
  account,
  benefitPeriod,
  isSaving,
  onBenefitPeriodChange,
  onBenefitGrant,
}: {
  account: AdminArtistAccount;
  benefitPeriod: BenefitPeriod;
  isSaving: boolean;
  onBenefitPeriodChange: (period: BenefitPeriod) => void;
  onBenefitGrant: () => void;
}) {
  const blocked = account.planStatus === 'blocked';

  return (
    <article className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
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

        <div className="grid grid-cols-[1fr_90px] gap-2">
          <select
            value={benefitPeriod}
            onChange={(event) => onBenefitPeriodChange(event.target.value as BenefitPeriod)}
            className="app-select h-11 rounded-xl border border-white/10 bg-white/5 pl-3 text-sm font-bold text-white outline-none transition-colors focus:border-purple-500"
            aria-label="Benefício manual"
          >
            {benefitPeriodOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-[#151515] text-zinc-200">
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onBenefitGrant}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 text-xs font-black text-purple-200 transition-all hover:border-purple-500/50 hover:bg-purple-500/15 disabled:opacity-60"
          >
            Bônus
          </button>
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
  const [selectedBenefitPeriods, setSelectedBenefitPeriods] = useState<Record<string, BenefitPeriod>>({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const stats = useMemo(() => {
    const paid = accounts.filter(isPaidAccount);
    const overdue = accounts.filter((account) => !hasActiveAccess(account));
    const active = accounts.filter(hasActiveAccess);

    return {
      paid,
      overdue,
      active,
      all: accounts,
      paidRevenue: paid.length * monthlyPrice,
      overdueRevenue: overdue.length * monthlyPrice,
    };
  }, [accounts]);

  const modalAccounts = useMemo(() => {
    const base =
      activeModal === 'paid'
        ? stats.paid
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

      setAccounts(await listAdminArtistAccounts());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar o admin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  const handleBenefitGrant = async (account: AdminArtistAccount) => {
    const period = selectedBenefitPeriods[account.artistId] ?? 'benefit_7_days';
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
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : 'Nao foi possivel aplicar beneficio.');
    } finally {
      setSavingArtistId('');
    }
  };

  const total = Math.max(1, accounts.length);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter">
      <header className="border-b border-white/10 bg-[#111111]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>

          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Shield size={16} />
            </span>
            Admin TatuApp
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
            Sair
          </button>
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
                Acompanhe a base e aplique benefícios manuais. Pagamentos e inadimplência ficam
                automatizados pelo Mercado Pago.
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
          <div className="grid lg:grid-cols-3 gap-4">
            <StatCard
              title="Pagamentos recebidos"
              value={formatCurrency(stats.paidRevenue)}
              detail={`${stats.paid.length} usuário${stats.paid.length === 1 ? '' : 's'} pago${stats.paid.length === 1 ? '' : 's'}`}
              icon={CreditCard}
              tone="green"
              percent={(stats.paid.length / total) * 100}
              onClick={() => setActiveModal('paid')}
            />
            <StatCard
              title="Inadimplentes"
              value={`${stats.overdue.length}`}
              detail={`${formatCurrency(stats.overdueRevenue)} em mensalidades abertas`}
              icon={AlertTriangle}
              tone="red"
              percent={(stats.overdue.length / total) * 100}
              onClick={() => setActiveModal('overdue')}
            />
            <StatCard
              title="Cadastrados"
              value={`${stats.all.length}`}
              detail={`${stats.active.length} com acesso ativo`}
              icon={Users}
              tone="purple"
              percent={(stats.all.length / total) * 100}
              onClick={() => setActiveModal('all')}
            />
          </div>
        ) : null}

        {isAdmin && (
          <section className="grid lg:grid-cols-[1fr_360px] gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-black text-lg">Distribuição da base</h2>
                  <p className="text-zinc-500 text-xs mt-1">Clique em qualquer indicador para abrir a lista.</p>
                </div>
                <TrendingUp size={20} className="text-purple-300" />
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Pagos', value: stats.paid.length, color: 'bg-green-500' },
                  { label: 'Inadimplentes', value: stats.overdue.length, color: 'bg-red-500' },
                  {
                    label: 'Cortesias/ativos',
                    value: Math.max(0, stats.active.length - stats.paid.length),
                    color: 'bg-purple-500',
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-zinc-400">{item.label}</span>
                      <span className="font-bold">{item.value}</span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                      <div className={`${item.color} h-full`} style={{ width: `${(item.value / total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="font-black text-lg">Resumo</h2>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-sm">Mensalidade</span>
                  <strong>{formatCurrency(monthlyPrice)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-sm">Recebido estimado</span>
                  <strong className="text-green-400">{formatCurrency(stats.paidRevenue)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-sm">Em aberto</span>
                  <strong className="text-red-400">{formatCurrency(stats.overdueRevenue)}</strong>
                </div>
              </div>
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
              <div>
                <p className="text-purple-300 text-xs font-bold uppercase tracking-[0.2em] mb-2">
                  Benefícios manuais
                </p>
                <h2 className="text-xl sm:text-2xl font-black">Aplicar benefício</h2>
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
                    benefitPeriod={selectedBenefitPeriods[account.artistId] ?? 'benefit_7_days'}
                    isSaving={savingArtistId === account.artistId}
                    onBenefitPeriodChange={(period) =>
                      setSelectedBenefitPeriods((current) => ({ ...current, [account.artistId]: period }))
                    }
                    onBenefitGrant={() => handleBenefitGrant(account)}
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
                    benefitPeriod={selectedBenefitPeriods[account.artistId] ?? 'benefit_7_days'}
                    isSaving={savingArtistId === account.artistId}
                    onBenefitPeriodChange={(period) =>
                      setSelectedBenefitPeriods((current) => ({ ...current, [account.artistId]: period }))
                    }
                    onBenefitGrant={() => handleBenefitGrant(account)}
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
    </div>
  );
}
