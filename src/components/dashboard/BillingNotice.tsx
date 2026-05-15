import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import type { ArtistProfile, ArtistAccessStatus } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getArtistAccessStatus } from '../../services/adminService';
import { createPlatformCheckout } from '../../services/billingService';

interface BillingNoticeProps {
  artist: ArtistProfile;
}

const monthlyPrice = import.meta.env.VITE_PLATFORM_MONTHLY_PRICE || '49';

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
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured || !artist.id) {
      setLoading(false);
      return;
    }

    void getArtistAccessStatus(artist.id)
      .then(setStatus)
      .finally(() => setLoading(false));
  }, [artist.id]);

  const handleCheckout = async () => {
    setCreatingCheckout(true);
    setPaymentError('');

    try {
      const checkout = await createPlatformCheckout();
      const url = checkout.checkoutUrl || checkout.sandboxCheckoutUrl;
      if (!url) throw new Error('Mercado Pago nao retornou uma URL de pagamento.');
      window.location.href = url;
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Nao foi possivel iniciar o pagamento.');
    } finally {
      setCreatingCheckout(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 text-zinc-400 text-sm">
        <Loader2 size={16} className="animate-spin" />
        Conferindo status da mensalidade...
      </div>
    );
  }

  if (artist.plan === 'blocked') {
    return (
      <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-900/40 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={22} className="text-red-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-red-200 text-sm font-bold">Perfil bloqueado por falta de confirmação de pagamento</p>
            <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
              Seu perfil público e novos agendamentos ficam indisponíveis até a confirmação da mensalidade.
              Pague pelo Mercado Pago para liberar automaticamente após a aprovação.
            </p>
          </div>
          <button
            onClick={handleCheckout}
            disabled={creatingCheckout}
            className="bg-red-600 text-white font-bold px-4 py-3 rounded-xl text-sm hover:bg-red-500 transition-colors"
          >
            {creatingCheckout ? 'Abrindo...' : 'Pagar mensalidade'}
          </button>
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
      <div className="bg-green-950/30 border border-green-900/40 rounded-2xl p-4 flex items-center gap-3">
        <ShieldCheck size={20} className="text-green-400" />
        <div>
          <p className="text-green-200 text-sm font-bold">Acesso vitalício liberado</p>
          <p className="text-green-700 text-xs mt-0.5">Sua conta está ativa sem vencimento.</p>
        </div>
      </div>
    );
  }

  if (status?.hasAccess) {
    return (
      <div className="bg-green-950/30 border border-green-900/40 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle size={20} className="text-green-400" />
        <div>
          <p className="text-green-200 text-sm font-bold">
            Acesso liberado até {formatDate(status.accessUntil)}
          </p>
          <p className="text-green-700 text-xs mt-0.5">
            Quando estiver perto de vencer, pague a mensalidade por aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-purple-950/20 border border-purple-900/40 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-purple-900/40 flex items-center justify-center flex-shrink-0">
          <CreditCard size={22} className="text-purple-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-purple-200 text-sm font-bold">Mensalidade do TatuApp</p>
          <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
            Pague pelo Mercado Pago. Quando o pagamento for aprovado, o acesso é liberado automaticamente.
          </p>
        </div>
        <button
          onClick={handleCheckout}
          disabled={creatingCheckout}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-4 py-3 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {creatingCheckout && <Loader2 size={16} className="animate-spin" />}
          {creatingCheckout ? 'Abrindo...' : 'Pagar mensalidade'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <span>Valor mensal: R$ {monthlyPrice}</span>
        <span className="hidden sm:inline">•</span>
        <span>Liberação automática após aprovação do Mercado Pago</span>
      </div>

      {paymentError && (
        <p className="mt-4 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-xs text-red-200">
          {paymentError}
        </p>
      )}
    </div>
  );
}
