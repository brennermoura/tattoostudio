import { useEffect, useState } from 'react';
import { Eye, EyeOff, ArrowLeft, CheckCircle, Loader2, MapPin } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  sendPasswordResetEmail,
  signInWithEmail,
  signOut,
  signUpArtist,
  updatePassword,
} from '../services/authService';
import { normalizeBrazilianState } from '../constants/locations';
import {
  formatBrazilianPostalCode,
  geocodePublicBrazilianAddress,
  lookupBrazilianPostalCode,
  requestBrowserLocation,
  reverseGeocodeBrazilianLocation,
} from '../utils/geolocation';

interface AuthPageProps {
  mode: 'login' | 'register';
  onBack: () => void;
  onSuccess: (profile?: {
    artisticName?: string;
    realName?: string;
    whatsapp?: string;
    addressStreet?: string;
    addressNumber?: string;
    addressComplement?: string;
    neighborhood?: string;
    postalCode?: string;
    publicNeighborhood?: string;
    publicAddressLabel?: string;
    city?: string;
    state?: string;
    latitude?: number | null;
    longitude?: number | null;
    avatar?: string;
    coverImage?: string;
  }) => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

export default function AuthPage({ mode, onBack, onSuccess, onSwitchMode }: AuthPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [authError, setAuthError] = useState('');
  const [notice, setNotice] = useState('');
  const [postalCodeLoading, setPostalCodeLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(
    () =>
      mode === 'login' &&
      (new URLSearchParams(window.location.search).get('recovery') === '1' ||
        window.location.hash.includes('type=recovery'))
  );
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    artisticName: '',
    whatsapp: '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    neighborhood: '',
    postalCode: '',
    publicNeighborhood: '',
    publicAddressLabel: '',
    city: '',
    state: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const normalizedFormState = normalizeBrazilianState(form.state);
  const hasResolvedAddress = Boolean(form.city && form.state && (form.postalCode || form.latitude));

  useEffect(() => {
    const pendingNotice = window.localStorage.getItem('tatuapp:auth-notice');
    if (!pendingNotice) return;

    setNotice(pendingNotice);
    window.localStorage.removeItem('tatuapp:auth-notice');
  }, []);

  async function useCurrentLocation() {
    resetFeedback();
    setLocationLoading(true);
    try {
      const location = await requestBrowserLocation();
      const address = await reverseGeocodeBrazilianLocation(location);
      setForm((current) => ({
        ...current,
        addressStreet: address.street,
        neighborhood: address.neighborhood,
        postalCode: formatBrazilianPostalCode(address.postalCode),
        publicNeighborhood: address.neighborhood,
        publicAddressLabel: [address.neighborhood, address.city].filter(Boolean).join(', '),
        city: address.city,
        state: address.state,
        latitude: address.latitude,
        longitude: address.longitude,
      }));
      setNotice('Localizacao encontrada. Complete o numero e a referencia do estudio.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Nao foi possivel obter sua localizacao.');
    } finally {
      setLocationLoading(false);
    }
  }

  async function lookupPostalCode() {
    if (postalCodeLoading) return;

    resetFeedback();
    setPostalCodeLoading(true);
    try {
      const address = await lookupBrazilianPostalCode(form.postalCode);
      setForm((current) => ({
        ...current,
        addressStreet: address.street,
        neighborhood: address.neighborhood,
        postalCode: formatBrazilianPostalCode(address.postalCode),
        publicNeighborhood: address.neighborhood,
        publicAddressLabel: [address.neighborhood, address.city].filter(Boolean).join(', '),
        city: address.city,
        state: address.state,
        latitude: null,
        longitude: null,
      }));
      setNotice('Endereco encontrado. Informe numero e referencia.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Nao foi possivel consultar esse CEP.');
    } finally {
      setPostalCodeLoading(false);
    }
  }

  const resetFeedback = () => {
    setAuthError('');
    setNotice('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();
    setLoading(true);

    if (!isSupabaseConfigured) {
      setTimeout(() => {
        setLoading(false);
        if (mode === 'register') {
          window.localStorage.setItem('tatuapp:auth-notice', 'Cadastro criado. Entre para acessar seu painel.');
          onSwitchMode('login');
          return;
        }

        onSuccess();
      }, 1200);
      return;
    }

    try {
      if (mode === 'login') {
        await signInWithEmail(form.email, form.password);
        await onSuccess();
        return;
      }

      if (!hasResolvedAddress || !form.addressNumber.trim()) {
        throw new Error('Consulte o CEP ou use sua localizacao e informe o numero do estudio.');
      }

      let latitude = form.latitude;
      let longitude = form.longitude;
      if (latitude === null || longitude === null) {
        const location = await geocodePublicBrazilianAddress({
          street: form.addressStreet,
          number: form.addressNumber,
          neighborhood: form.neighborhood,
          city: form.city,
          state: normalizedFormState,
          postalCode: form.postalCode,
        });
        latitude = location.latitude;
        longitude = location.longitude;
      }

      const result = await signUpArtist({
        email: form.email,
        password: form.password,
        artisticName: form.artisticName,
        whatsapp: form.whatsapp,
        addressStreet: form.addressStreet,
        addressNumber: form.addressNumber,
        addressComplement: form.addressComplement,
        neighborhood: form.neighborhood,
        postalCode: form.postalCode,
        publicNeighborhood: form.publicNeighborhood,
        publicAddressLabel: form.publicAddressLabel,
        city: form.city,
        state: normalizedFormState,
        latitude,
        longitude,
      });

      if (result.session) {
        await signOut();
      }

      const confirmationNotice = result.session
        ? 'Cadastro criado. Entre para acessar seu painel.'
        : 'Cadastro criado. Confirme seu email e entre para acessar seu painel.';
      window.localStorage.setItem('tatuapp:auth-notice', confirmationNotice);
      onSwitchMode('login');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Não foi possível concluir o acesso.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!form.email) {
      setAuthError('Digite seu email para receber o link de recuperação.');
      return;
    }

    if (!isSupabaseConfigured) {
      setAuthError('Configure o Supabase para enviar recuperação de senha por email.');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(form.email);
      setNotice('Link de recuperação enviado. Confira sua caixa de entrada.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Não foi possível enviar o link.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (newPassword.length < 8) {
      setAuthError('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);

    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setRecoveryMode(false);
      window.history.replaceState({}, '', '/login');
      setNotice('Senha atualizada. Agora você já pode entrar no painel.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Não foi possível atualizar a senha.');
    } finally {
      setLoading(false);
    }
  };

  const loginTitle = recoveryMode
    ? 'Criar nova senha'
    : forgotPasswordMode
    ? 'Recuperar senha'
    : 'Bem-vindo de volta';

  const loginSubtitle = recoveryMode
    ? 'Defina uma senha segura para voltar ao painel'
    : forgotPasswordMode
    ? 'Informe seu email para receber o link de recuperação'
    : 'Acesse seu painel';

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 font-inter">
      {/* Back */}
      <button
        onClick={onBack}
        className="fixed top-6 left-6 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-3">
          <span className="text-white font-black text-xl">T</span>
        </div>
        <span className="font-bold text-xl text-white">TatuApp</span>
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
          {mode === 'login' ? (
            <>
              <h1 className="text-2xl font-black text-white mb-1">{loginTitle}</h1>
              <p className="text-zinc-400 text-sm mb-6">{loginSubtitle}</p>

              {authError && (
                <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3 mb-4">
                  <p className="text-red-300 text-xs">{authError}</p>
                </div>
              )}

              {notice && (
                <div className="bg-green-950/30 border border-green-900/30 rounded-xl p-3 mb-4">
                  <p className="text-green-300 text-xs">{notice}</p>
                </div>
              )}

              {recoveryMode ? (
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <label className="text-zinc-300 text-sm font-medium block mb-1.5">
                      Nova senha
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      minLength={8}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                  >
                    {loading ? 'Atualizando...' : 'Atualizar senha'}
                  </button>
                </form>
              ) : forgotPasswordMode ? (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <label className="text-zinc-300 text-sm font-medium block mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="seu@email.com"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                      </span>
                    ) : (
                      'Enviar link de recuperação'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetFeedback();
                      setForgotPasswordMode(false);
                    }}
                    className="w-full bg-white/5 border border-white/10 text-white font-semibold py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm"
                  >
                    Voltar para login
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-zinc-300 text-sm font-medium block mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="seu@email.com"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-300 text-sm font-medium block mb-1.5">
                      Senha
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="••••••••"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Entrando...
                      </span>
                    ) : (
                      'Entrar no painel'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetFeedback();
                      setForgotPasswordMode(true);
                    }}
                    disabled={loading}
                    className="w-full text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                  >
                    Esqueci minha senha
                  </button>
                </form>
              )}

              {!recoveryMode && !forgotPasswordMode && (
                <p className="text-center text-zinc-500 text-sm mt-6">
                  Ainda não tem conta?{' '}
                  <button
                    onClick={() => onSwitchMode('register')}
                    className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                  >
                    Criar conta
                  </button>
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="text-2xl font-black text-white mb-1">Criar meu perfil</h1>
              <p className="text-zinc-400 text-sm mb-6">
                {step === 1 ? 'Informações básicas' : 'Dados do artista'}
              </p>

              {authError && (
                <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3 mb-4">
                  <p className="text-red-300 text-xs">{authError}</p>
                </div>
              )}

              {notice && (
                <div className="bg-green-950/30 border border-green-900/30 rounded-xl p-3 mb-4">
                  <p className="text-green-300 text-xs">{notice}</p>
                </div>
              )}

              {/* Step indicator */}
              <div className="flex gap-1.5 mb-6">
                {[1, 2].map((s) => (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      s <= step ? 'bg-purple-500' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              <form
                onSubmit={
                  step === 1
                    ? (e) => {
                        e.preventDefault();
                        setStep(2);
                      }
                    : handleSubmit
                }
                className="space-y-4"
              >
                {step === 1 ? (
                  <>
                    <div>
                      <label className="text-zinc-300 text-sm font-medium block mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="seu@email.com"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-300 text-sm font-medium block mb-1.5">
                        Senha
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder="Mínimo 8 caracteres"
                          required
                          minLength={8}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
                    >
                      Continuar
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-zinc-300 text-sm font-medium block mb-1.5">
                        Nome artístico
                      </label>
                      <input
                        type="text"
                        value={form.artisticName}
                        onChange={(e) => setForm({ ...form, artisticName: e.target.value })}
                        placeholder="Ex: João Ink, Maria Tattoo"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-300 text-sm font-medium block mb-1.5">
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={form.whatsapp}
                        onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                        placeholder="(11) 99999-9999"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                      />
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                      <label className="text-zinc-300 text-sm font-medium block mb-1.5">
                        CEP do estudio
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={form.postalCode}
                          onChange={(e) => {
                            const postalCode = formatBrazilianPostalCode(e.target.value);
                            setForm((current) => ({
                              ...current,
                              postalCode,
                              addressStreet: '',
                              neighborhood: '',
                              publicNeighborhood: '',
                              publicAddressLabel: '',
                              city: '',
                              state: '',
                              latitude: null,
                              longitude: null,
                            }));
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void lookupPostalCode();
                            }
                          }}
                          placeholder="00000-000"
                          className="min-w-0 flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => void lookupPostalCode()}
                          disabled={postalCodeLoading}
                          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-60"
                        >
                          {postalCodeLoading ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void useCurrentLocation()}
                        disabled={locationLoading}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-xs font-bold text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-60"
                      >
                        {locationLoading ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
                        Nao sei o CEP: usar minha localizacao
                      </button>
                    </div>

                    {hasResolvedAddress && (
                      <>
                        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs text-zinc-400">
                          <div className="flex gap-2">
                            <MapPin size={15} className="mt-0.5 shrink-0 text-purple-300" />
                            <div>
                              <p className="font-bold text-zinc-200">
                                {[form.addressStreet, form.neighborhood].filter(Boolean).join(' - ')}
                              </p>
                              <p className="mt-0.5">{[form.city, normalizedFormState].filter(Boolean).join(' - ')}</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-[104px_1fr] gap-3">
                          <div>
                            <label className="text-zinc-300 text-sm font-medium block mb-1.5">Numero</label>
                            <input
                              type="text"
                              value={form.addressNumber}
                              onChange={(e) => setForm({ ...form, addressNumber: e.target.value })}
                              placeholder="123"
                              required
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-zinc-300 text-sm font-medium block mb-1.5">Complemento</label>
                            <input
                              type="text"
                              value={form.addressComplement}
                              onChange={(e) => setForm({ ...form, addressComplement: e.target.value })}
                              placeholder="Sala, andar (opcional)"
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-zinc-300 text-sm font-medium block mb-1.5">
                            Referencia para clientes
                          </label>
                          <input
                            type="text"
                            value={form.publicAddressLabel}
                            onChange={(e) => setForm({ ...form, publicAddressLabel: e.target.value })}
                            placeholder="Ex: perto do shopping (opcional)"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                          />
                        </div>
                      </>
                    )}

                    <div className="bg-green-950/30 border border-green-900/30 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                        <p className="text-green-300 text-xs">
                          7 dias grátis para explorar tudo. Sem cartão de crédito.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 bg-white/5 border border-white/10 text-white font-semibold py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Criando...
                          </span>
                        ) : (
                          'Criar perfil'
                        )}
                      </button>
                    </div>
                  </>
                )}
              </form>

              <p className="text-center text-zinc-500 text-sm mt-6">
                Já tem conta?{' '}
                <button
                  onClick={() => onSwitchMode('login')}
                  className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                >
                  Entrar
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
