import { useState } from 'react';
import { KeyRound, Loader2, X } from 'lucide-react';
import { updatePassword } from '../services/authService';
import { useModalHistory } from '../hooks/useModalHistory';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useModalHistory(open, onClose, 'change-password');

  if (!open) return null;

  const handleSubmit = async () => {
    setError('');
    setSuccess(false);

    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setSaving(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
      window.setTimeout(onClose, 1000);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Não foi possível alterar a senha.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Alterar senha">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111111] p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zinc-200">
              <KeyRound size={19} />
            </span>
            <div>
              <h2 className="text-lg font-black text-white">Alterar senha</h2>
              <p className="text-xs text-zinc-500">Use uma senha com no mínimo 8 caracteres.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">Nova senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-purple-500"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">Confirmar senha</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-purple-500"
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-4 rounded-xl border border-green-900/40 bg-green-950/30 px-3 py-2 text-xs text-green-200">
            Senha alterada.
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={saving}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-black transition-colors hover:bg-zinc-200 disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </div>
    </div>
  );
}
