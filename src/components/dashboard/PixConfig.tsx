import { useState, useEffect, useRef } from 'react';
import {
  Building2,
  ArrowLeft,
  Check,
  CheckCircle,
  Copy,
  Info,
  KeyRound,
  Mail,
  Phone,
  QrCode,
  Save,
  User,
} from 'lucide-react';
import { ArtistProfile } from '../../types';
import QRCode from 'qrcode';
import { buildStaticPixPayload } from '../../utils/pix';

interface PixConfigProps {
  artist: ArtistProfile;
  onUpdate: (artist: ArtistProfile) => void;
  onBack?: () => void;
}

const PIX_TYPES = [
  { value: 'phone', label: 'Celular', icon: Phone },
  { value: 'cpf', label: 'CPF', icon: User },
  { value: 'cnpj', label: 'CNPJ', icon: Building2 },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'random', label: 'Chave aleatória', icon: KeyRound },
] as const;

export default function PixConfig({ artist, onUpdate, onBack }: PixConfigProps) {
  const [form, setForm] = useState({
    pixKey: artist.pixKey,
    pixType: artist.pixType,
    depositValue: artist.depositValue,
    depositRequired: artist.depositRequired !== false,
  });
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewPixPayload = buildStaticPixPayload({
    pixKey: form.pixKey,
    merchantName: artist.artisticName,
    merchantCity: artist.city,
    amount: form.depositValue,
    txid: 'SINALPREVIEW',
    description: 'Sinal de agendamento',
  });

  useEffect(() => {
    if (canvasRef.current && previewPixPayload && form.depositRequired) {
      QRCode.toCanvas(canvasRef.current, previewPixPayload, {
        width: 200,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: '#1a1a2e',
        },
      }).catch(console.error);
    }
  }, [previewPixPayload, form.depositRequired]);

  const handleSave = () => {
    onUpdate({ ...artist, ...form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(form.pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-sm font-bold text-purple-100 transition-colors hover:border-purple-400/35 hover:bg-purple-500/15"
        >
          <ArrowLeft size={16} />
          Voltar ao painel
        </button>
      )}
      <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/[0.14] via-pink-500/[0.06] to-transparent p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-400/25 bg-purple-500/15 text-purple-100">
            <QrCode size={19} />
          </span>
          <div>
            <p className="text-[11px] font-black uppercase text-purple-300">Recebimento</p>
            <h1 className="text-xl font-black text-white">Configurar Pix</h1>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          Receba o sinal dos clientes antes de confirmar o agendamento
        </p>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl border border-purple-500/15 bg-purple-500/[0.055] p-4">
        <div className="flex gap-3">
          <Info size={17} className="mt-0.5 shrink-0 text-purple-200" />
          <div>
            <h3 className="mb-1 text-sm font-semibold text-white">Como funciona</h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              O cliente paga diretamente na sua conta pelo QR Code gerado. Depois, você confirma
              o recebimento e aprova o agendamento.
            </p>
          </div>
        </div>
      </div>

      {/* Pix Key */}
      <div className="space-y-4 rounded-2xl border border-purple-500/15 bg-white/[0.055] p-5">
        <h2 className="text-sm font-bold text-white">Chave Pix</h2>

        <div>
          <label className="text-zinc-400 text-xs mb-1.5 block">Tipo de chave</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PIX_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setForm({ ...form, pixType: type.value })}
                className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  form.pixType === type.value
                    ? 'border-purple-400/40 bg-purple-500/15 text-white'
                    : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:border-purple-400/20 hover:bg-white/[0.075] hover:text-white'
                }`}
              >
                <type.icon size={14} className="text-white" />
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-zinc-400 text-xs mb-1.5 block">
            Sua chave{' '}
            {PIX_TYPES.find((t) => t.value === form.pixType)?.label}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.pixKey}
              onChange={(e) => setForm({ ...form, pixKey: e.target.value })}
              placeholder={
                form.pixType === 'phone'
                  ? '11999999999'
                  : form.pixType === 'email'
                  ? 'seu@email.com'
                  : form.pixType === 'cpf'
                  ? '000.000.000-00'
                  : 'Sua chave Pix'
              }
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm text-white placeholder-zinc-600 transition-colors focus:border-purple-400/60 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-zinc-300 transition-colors hover:border-purple-400/25 hover:bg-white/[0.12] hover:text-white"
            >
              {copied ? <CheckCircle size={18} className="text-green-400" /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Deposit value */}
      <div className="rounded-2xl border border-purple-500/15 bg-white/[0.055] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-bold text-sm mb-1">Sinal de reserva</h2>
            <p className="text-zinc-500 text-xs">
              Escolha se o cliente precisa pagar entrada antes da aprovação.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, depositRequired: !form.depositRequired })}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              form.depositRequired
                ? 'border-purple-400/40 bg-purple-500/15 text-purple-100'
                : 'bg-white/5 border-white/10 text-zinc-400'
            }`}
          >
            {form.depositRequired ? 'Ativo' : 'Inativo'}
          </button>
        </div>

        <h2 className="font-bold text-sm mb-1">Valor do sinal</h2>
        <p className="text-zinc-500 text-xs mb-4">
          Valor cobrado quando o sinal estiver ativo. Recomendamos entre R$ 50 e R$ 200.
        </p>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-medium">
            R$
          </span>
          <input
            type="number"
            value={form.depositValue}
            onChange={(e) => setForm({ ...form, depositValue: Number(e.target.value) })}
            disabled={!form.depositRequired}
            min={10}
            max={1000}
            step={10}
            className="w-full rounded-xl border border-white/10 bg-white/[0.08] py-3 pl-10 pr-4 text-sm text-white transition-colors focus:border-purple-400/60 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div className="flex gap-2 mt-3">
          {[50, 100, 150, 200].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setForm({ ...form, depositValue: val })}
              disabled={!form.depositRequired}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                form.depositValue === val
                  ? 'border-purple-400/40 bg-purple-500/15 text-white'
                  : 'bg-white/5 border-white/10 text-zinc-500 hover:border-purple-400/20 hover:text-zinc-300'
              }`}
            >
              R$ {val}
            </button>
          ))}
        </div>
      </div>

      {/* QR Code Preview */}
      {form.pixKey && form.depositRequired && (
        <div className="rounded-2xl border border-purple-500/15 bg-white/[0.055] p-5">
          <h2 className="font-bold text-sm mb-1">Pré-visualização do QR Code</h2>
          <p className="text-zinc-500 text-xs mb-4">
            Este é o QR Code que o cliente verá ao agendar
          </p>
          <div className="flex flex-col items-center">
            <div className="bg-[#1a1a2e] rounded-2xl p-4 inline-block">
              <canvas ref={canvasRef} className="rounded-xl" />
            </div>
            <div className="mt-4 text-center">
              <p className="text-zinc-400 text-xs mb-1">Chave Pix</p>
              <p className="text-white font-medium text-sm font-mono bg-white/5 rounded-lg px-4 py-2">
                {form.pixKey}
              </p>
              <p className="text-purple-400 text-sm font-bold mt-2">
                Sinal: R$ {form.depositValue},00
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl transition-all text-sm ${
          saved
            ? 'bg-green-600 text-white'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
        }`}
      >
        {saved ? (
          <>
            <Check size={18} /> Salvo!
          </>
        ) : (
          <>
            <Save size={18} /> Salvar configurações Pix
          </>
        )}
      </button>
    </div>
  );
}
