import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import type { ArtistProfile, ArtistAccessStatus } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  canClaimArtistMonthlyGrace,
  claimArtistMonthlyGrace,
  getArtistAccessStatus,
} from '../../services/adminService';
import {
  createInfinitePayApiCheckout,
  createInfinitePayCheckout,
  getPlatformMonthlyPrice,
  getStaticInfinitePayCheckoutUrl,
} from '../../services/billingService';

interface BillingNoticeProps {
  artist: ArtistProfile;
}

const staticInfinitePayCheckoutUrl = getStaticInfinitePayCheckoutUrl();

function formatDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function BillingNotice({ artist }: BillingNoticeProps) {
  const [status, setStatus] = useState<ArtistAccessStatus | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [claimingGrace, setClaimingGrace] = useState(false);
  const [canClaimGrace, setCanClaimGrace] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState(Number(import.meta.env.VITE_PLATFORM_MONTHLY_PRICE || '49'));
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured || !artist.id) {
      setLoading(false);
      return;
    }

    void getArtistAccessStatus(artist.id)
      .then(async (nextStatus) => {
        setStatus(nextStatus);
        const canAskGrace =
          artist.plan === 'blocked' || !nextStatus?.hasAccess;
        setCanClaimGrace(canAskGrace ? await canClaimArtistMonthlyGrace(artist.id) : false);
      })
      .finally(() => setLoading(false));

    void getPlatformMonthlyPrice().then(setMonthlyPrice);
  }, [artist.id]);

  const handleCheckout = async () => {
    setCreatingCheckout(true);
    setPaymentError('');

    try {
      if (staticInfinitePayCheckoutUrl) {
        await createInfinitePayCheckout();
        window.location.href = staticInfinitePayCheckoutUrl;
        return;
      }

      const checkout = await createInfinitePayApiCheckout();
      const url = checkout.checkoutUrl;
      if (!url) throw new Error('A InfinitePay nao retornou uma URL de checkout.');
      window.location.href = url;
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Nao foi possivel iniciar o pagamento.');
    } finally {
      setCreatingCheckout(false);
    }
  };

  const handleGrace = async () => {
    setClaimingGrace(true);
    setPaymentError('');

    try {
      await claimArtistMonthlyGrace(artist.id);
      window.location.reload();
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Nao foi possivel liberar os 5 dias.');
    } finally {
      setClaimingGrace(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-zinc-400">
        <Loader2 size={16} className="animate-spin" />
        Conferindo status da mensalidade...
      </div>
    );
  }

  if (artist.plan === 'blocked') {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-900/40">
            <AlertTriangle size={18} className="text-red-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-red-200 text-sm font-bold">Perfil bloqueado por falta de confirmação de pagamento</p>
            <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">
              Pague a mensalidade para reativar perfil público e agenda por 30 dias.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:w-auto">
            {canClaimGrace && (
              <button
                onClick={handleGrace}
                disabled={claimingGrace}
                className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/15 disabled:opacity-60"
              >
                {claimingGrace ? 'Liberando...' : 'Liberar 5 dias'}
              </button>
            )}
            <button
              onClick={handleCheckout}
              disabled={creatingCheckout}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
            >
              {creatingCheckout ? 'Abrindo...' : 'Pagar mensalidade'}
            </button>
          </div>
        </div>

        {paymentError && (
          <p className="mt-4 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-xs text-red-200">
            {paymentError}
          </p>
        )}
      </div>
    );
  }

  if (status?.lifetime) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-900/40 bg-green-950/30 px-3 py-2.5">
        <ShieldCheck size={18} className="text-green-400" />
        <div>
          <p className="text-green-200 text-sm font-bold">Acesso vitalício liberado</p>
          <p className="text-green-700 text-xs">Conta ativa sem vencimento.</p>
        </div>
      </div>
    );
  }

  if (status?.hasAccess) {
    const isTrial = status.source === 'trial';

    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-900/40 bg-green-950/30 px-3 py-2.5">
        <CheckCircle size={18} className="text-green-400" />
        <div>
          <p className="text-green-200 text-sm font-bold">
            {isTrial ? 'Teste grátis ativo até' : 'Acesso liberado até'} {formatDate(status.accessUntil)}
          </p>
          <p className="text-green-700 text-xs">
            {isTrial
              ? 'Depois do teste, o pagamento mensal mantém o perfil público no ar.'
              : 'O pagamento mensal mantém seu perfil público e agenda no ar.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-purple-900/40 bg-purple-950/20 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-purple-900/40">
          <CreditCard size={18} className="text-purple-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-purple-200 text-sm font-bold">Mensalidade do TatuApp</p>
          <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">
            Pague para liberar perfil e agenda por 30 dias corridos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canClaimGrace && (
            <button
              onClick={handleGrace}
              disabled={claimingGrace}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/15 disabled:opacity-60"
            >
              {claimingGrace ? 'Liberando...' : 'Liberar 5 dias'}
            </button>
          )}
          <button
              onClick={handleCheckout}
              disabled={creatingCheckout}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
            {creatingCheckout && <Loader2 size={16} className="animate-spin" />}
            {creatingCheckout ? 'Abrindo...' : 'Pagar mensalidade'}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <span>Valor mensal: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyPrice)}</span>
        <span className="hidden sm:inline">•</span>
        <span>Checkout automático via InfinitePay</span>
      </div>

      {paymentError && (
        <p className="mt-4 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-xs text-red-200">
          {paymentError}
        </p>
      )}
    </div>
  );
}
