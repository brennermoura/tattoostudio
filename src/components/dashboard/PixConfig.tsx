import { useState, useEffect, useRef } from 'react';
import { Save, Check, Copy, CheckCircle } from 'lucide-react';
import { ArtistProfile } from '../../types';
import QRCode from 'qrcode';
import { buildStaticPixPayload } from '../../utils/pix';

interface PixConfigProps {
  artist: ArtistProfile;
  onUpdate: (artist: ArtistProfile) => void;
}

const PIX_TYPES = [
  { value: 'phone', label: '📱 Celular' },
  { value: 'cpf', label: '🪪 CPF' },
  { value: 'cnpj', label: '🏢 CNPJ' },
  { value: 'email', label: '📧 Email' },
  { value: 'random', label: '🔑 Chave aleatória' },
] as const;

export default function PixConfig({ artist, onUpdate }: PixConfigProps) {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Configurar Pix</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Receba o sinal dos clientes antes de confirmar o agendamento
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-950/30 border border-blue-900/30 rounded-2xl p-4">
        <h3 className="font-semibold text-blue-300 text-sm mb-1">ℹ️ Como funciona</h3>
        <p className="text-zinc-400 text-xs leading-relaxed">
          A plataforma <strong className="text-zinc-200">não processa pagamentos</strong>. Você
          configura sua chave Pix aqui e o sistema gera um QR Code automático para o cliente
          pagar o sinal diretamente na sua conta. Você confirma o recebimento e aprova o
          agendamento.
        </p>
      </div>

      {/* Pix Key */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-sm">Chave Pix</h2>

        <div>
          <label className="text-zinc-400 text-xs mb-1.5 block">Tipo de chave</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PIX_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setForm({ ...form, pixType: type.value })}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                  form.pixType === type.value
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:border-purple-500/30'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-zinc-400 text-xs mb-1.5 block">
            Sua chave{' '}
            {PIX_TYPES.find((t) => t.value === form.pixType)?.label.replace(/.*? /, '')}
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
              className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/20 transition-colors"
            >
              {copied ? <CheckCircle size={18} className="text-green-400" /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Deposit value */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-bold text-sm mb-1">Sinal de reserva</h2>
            <p className="text-zinc-500 text-xs">
              Escolha se o cliente precisa pagar entrada antes da aprovação.
            </p>
          </div>
          <button
            onClick={() => setForm({ ...form, depositRequired: !form.depositRequired })}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              form.depositRequired
                ? 'bg-purple-600 border-purple-500 text-white'
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
            className="w-full bg-white/10 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors text-sm disabled:opacity-50"
          />
        </div>

        <div className="flex gap-2 mt-3">
          {[50, 100, 150, 200].map((val) => (
            <button
              key={val}
              onClick={() => setForm({ ...form, depositValue: val })}
              disabled={!form.depositRequired}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                form.depositValue === val
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-zinc-500 hover:border-purple-500/30 hover:text-zinc-300'
              }`}
            >
              R$ {val}
            </button>
          ))}
        </div>
      </div>

      {/* QR Code Preview */}
      {form.pixKey && form.depositRequired && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
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
