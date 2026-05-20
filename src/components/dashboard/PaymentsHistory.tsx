import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  ReceiptText,
  RefreshCw,
  XCircle,
  X,
} from 'lucide-react';
import { listPlatformPayments, type PlatformPayment } from '../../services/billingService';
import { useModalHistory } from '../../hooks/useModalHistory';

const providerLabel: Record<string, string> = {
  infinitepay: 'InfinitePay',
  mercado_pago: 'Pagamento antigo',
};

const statusLabel: Record<PlatformPayment['status'], string> = {
  pending: 'Pendente',
  in_process: 'Em análise',
  approved: 'Aprovado',
  rejected: 'Recusado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  charged_back: 'Contestação',
};

function formatCurrency(amountCents: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format((amountCents || 0) / 100);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getBillingMonth(payment: PlatformPayment) {
  const value = payment.rawPayload.billing_month;
  return typeof value === 'string' && value ? value : '';
}

function groupLabel(payment: PlatformPayment) {
  const billingMonth = getBillingMonth(payment);
  const date = billingMonth ? new Date(`${billingMonth}-01T00:00:00`) : new Date(payment.createdAt);
  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: PlatformPayment['status'] }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-900/50 bg-green-950/40 px-2 py-1 text-xs font-bold text-green-300">
        <CheckCircle size={12} /> {statusLabel[status]}
      </span>
    );
  }

  if (status === 'pending' || status === 'in_process') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-yellow-900/50 bg-yellow-950/40 px-2 py-1 text-xs font-bold text-yellow-300">
        <Clock size={12} /> {statusLabel[status]}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-900/50 bg-red-950/40 px-2 py-1 text-xs font-bold text-red-300">
      <XCircle size={12} /> {statusLabel[status]}
    </span>
  );
}

function PaymentCard({ payment, compact = false }: { payment: PlatformPayment; compact?: boolean }) {
  const isSubscription = payment.rawPayload.mode === 'subscription_plan';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={payment.status} />
            <span className="rounded-full bg-white/5 px-2 py-1 text-xs font-bold text-zinc-400">
              {providerLabel[payment.provider] || payment.provider}
            </span>
          </div>
          <p className="text-lg font-black">
            {formatCurrency(payment.amountCents, payment.currency)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Criado em {formatDate(payment.createdAt)}</p>
          {payment.paidAt && (
            <p className="mt-1 text-xs text-green-400">Pago em {formatDate(payment.paidAt)}</p>
          )}
          {getBillingMonth(payment) && (
            <p className="mt-1 text-xs font-bold text-purple-300">
              Competencia {getBillingMonth(payment)}
            </p>
          )}
        </div>

        {payment.checkoutUrl && (
          <a
            href={payment.checkoutUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-white/10"
          >
            <ExternalLink size={15} />
            {isSubscription ? 'Abrir assinatura' : 'Abrir comprovante'}
          </a>
        )}
      </div>

      {!compact && (
        <div className="mt-4 grid gap-2 border-t border-white/5 pt-4 text-xs text-zinc-500 sm:grid-cols-2">
          <p className="truncate">Referencia: {payment.externalReference}</p>
          <p className="truncate">
            ID pagamento: {payment.providerPaymentId || 'aguardando confirmacao'}
          </p>
        </div>
      )}
    </div>
  );
}

export default function PaymentsHistory() {
  const [payments, setPayments] = useState<PlatformPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useModalHistory(modalOpen, () => setModalOpen(false), 'payments-history');

  const loadPayments = async () => {
    setLoading(true);
    setError('');

    try {
      setPayments(await listPlatformPayments());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar pagamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPayments();
  }, []);

  const latestPayments = payments.slice(0, 3);
  const groupedPayments = payments.reduce<Record<string, PlatformPayment[]>>((acc, payment) => {
    const label = groupLabel(payment);
    acc[label] = [...(acc[label] || []), payment];
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Pagamentos</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Histórico da assinatura, mensalidades e comprovantes da sua conta.
          </p>
        </div>
        <button
          type="button"
          onClick={loadPayments}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Atualizar
        </button>
      </div>

      <div className="rounded-2xl border border-yellow-900/40 bg-yellow-950/20 p-4 text-sm text-yellow-100">
        <div className="flex gap-3">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-yellow-300" />
          <p className="leading-relaxed">
            A assinatura da InfinitePay abre em ambiente externo. Enquanto a confirmação automática não estiver
            conectada, o admin pode validar a assinatura no painel da InfinitePay e confirmar 30 dias de acesso.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-400">
          <Loader2 size={18} className="animate-spin" />
          Carregando pagamentos...
        </div>
      )}

      {!loading && payments.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <ReceiptText size={34} className="mx-auto mb-3 text-zinc-600" />
          <p className="font-bold text-zinc-300">Nenhum pagamento registrado ainda</p>
          <p className="mt-1 text-sm text-zinc-500">
            Quando voce iniciar a assinatura, a tentativa aparece aqui.
          </p>
        </div>
      )}

      {!loading && payments.length > 0 && (
        <div className="space-y-3">
          {latestPayments.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} compact />
          ))}

          {payments.length > 3 && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-white/10"
            >
              Ver todos os pagamentos
            </button>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/80 p-4 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111] shadow-2xl shadow-black">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div>
                <h2 className="text-lg font-black">Todos os pagamentos</h2>
                <p className="text-xs text-zinc-500">Listados por mês e ano.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Fechar pagamentos"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              {Object.entries(groupedPayments).map(([label, group]) => (
                <section key={label} className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                    {label}
                  </h3>
                  {group.map((payment) => (
                    <PaymentCard key={payment.id} payment={payment} />
                  ))}
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
