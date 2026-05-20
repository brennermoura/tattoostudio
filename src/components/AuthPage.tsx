import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, ArrowLeft, CheckCircle, MapPin, Upload } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  sendPasswordResetEmail,
  signInWithEmail,
  signUpArtist,
  updatePassword,
} from '../services/authService';
import {
  cityLabel,
  loadFeaturedBrazilianCities,
  normalizeBrazilianState,
  searchBrazilianCities,
  searchBrazilianStates,
  stateLabel,
  type BrazilianCityOption,
} from '../constants/locations';
import { requestBrowserLocation } from '../utils/geolocation';

interface AuthPageProps {
  mode: 'login' | 'register';
  onBack: () => void;
  onSuccess: (profile?: {
    artisticName?: string;
    realName?: string;
    whatsapp?: string;
    city?: string;
    state?: string;
    latitude?: number | null;
    longitude?: number | null;
    avatarFile?: File;
    coverFile?: File;
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
  const [cityOptions, setCityOptions] = useState<BrazilianCityOption[]>([]);
  const [citySuggestionsOpen, setCitySuggestionsOpen] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(
    () =>
      mode === 'login' &&
      (new URLSearchParams(window.location.search).get('recovery') === '1' ||
        window.location.hash.includes('type=recovery'))
  );
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [stateSuggestionsOpen, setStateSuggestionsOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    artisticName: '',
    whatsapp: '',
    city: '',
    state: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const normalizedFormState = normalizeBrazilianState(form.state);
  const stateSuggestions = searchBrazilianStates(form.state).slice(0, 4);
  const citySuggestions = useMemo(
    () => searchBrazilianCities(cityOptions, form.city, form.state),
    [cityOptions, form.city, form.state]
  );

  useEffect(() => {
    void loadFeaturedBrazilianCities().then(setCityOptions);
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
      if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    };
  }, [avatarPreview, coverPreview]);

  function handleRegisterImage(file: File | undefined, kind: 'avatar' | 'cover') {
    if (!file) return;
    const preview = URL.createObjectURL(file);

    if (kind === 'avatar') {
      if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(preview);
      return;
    }

    if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setCoverPreview(preview);
  }

  async function useCurrentLocation() {
    try {
      const location = await requestBrowserLocation();
      setForm((current) => ({
        ...current,
        latitude: location.latitude,
        longitude: location.longitude,
      }));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Nao foi possivel obter sua localizacao.');
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
        onSuccess(
          mode === 'register'
            ? {
                artisticName: form.artisticName,
                realName: form.artisticName,
                whatsapp: form.whatsapp,
                city: form.city,
                state: normalizedFormState,
                latitude: form.latitude,
                longitude: form.longitude,
                avatar: avatarPreview,
                coverImage: coverPreview,
              }
            : undefined
        );
      }, 1200);
      return;
    }

    try {
      if (mode === 'login') {
        await signInWithEmail(form.email, form.password);
        await onSuccess();
        return;
      }

      const result = await signUpArtist({
        email: form.email,
        password: form.password,
        artisticName: form.artisticName,
        whatsapp: form.whatsapp,
        city: form.city,
        state: normalizedFormState,
        latitude: form.latitude,
        longitude: form.longitude,
      });

      if (!result.session) {
        setNotice('Enviamos um link de confirmação para o seu email. Depois de confirmar, volte para entrar.');
        return;
      }

      await onSuccess({
        artisticName: form.artisticName,
        realName: form.artisticName,
        whatsapp: form.whatsapp,
        city: form.city,
        state: normalizedFormState,
      });
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
                    <div className="relative">
                      <label className="text-zinc-300 text-sm font-medium block mb-1.5">
                        Estado
                      </label>
                      <input
                        type="text"
                        value={form.state}
                        onFocus={() => setStateSuggestionsOpen(true)}
                        onChange={(e) => {
                          setForm({ ...form, state: e.target.value, city: '' });
                          setStateSuggestionsOpen(true);
                        }}
                        onBlur={() => window.setTimeout(() => setStateSuggestionsOpen(false), 120)}
                        placeholder="RJ ou SP"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                      />

                      {stateSuggestionsOpen && stateSuggestions.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 mt-2 bg-[#151515] border border-white/10 rounded-xl p-1 shadow-2xl shadow-black/40">
                          {stateSuggestions.map((option) => (
                            <button
                              key={option.uf}
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                setForm({ ...form, state: option.name, city: '' });
                                setStateSuggestionsOpen(false);
                              }}
                              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              {stateLabel(option)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <label className="text-zinc-300 text-sm font-medium block mb-1.5">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={form.city}
                        disabled={!form.state.trim()}
                        onFocus={() => setCitySuggestionsOpen(true)}
                        onChange={(e) => {
                          setForm({ ...form, city: e.target.value });
                          setCitySuggestionsOpen(true);
                        }}
                        onBlur={() => window.setTimeout(() => setCitySuggestionsOpen(false), 120)}
                        placeholder={form.state.trim() ? 'Cidade' : 'Escolha o estado primeiro'}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm disabled:cursor-not-allowed disabled:opacity-45"
                      />

                      {citySuggestionsOpen && citySuggestions.length > 0 && (
                        <div className="absolute z-20 left-0 right-0 mt-2 bg-[#151515] border border-white/10 rounded-xl p-1 shadow-2xl shadow-black/40">
                          {citySuggestions.map((option) => (
                            <button
                              key={`${option.uf}-${option.name}`}
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                setForm({ ...form, city: option.name, state: option.state });
                                setCitySuggestionsOpen(false);
                              }}
                              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              {cityLabel(option)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <MapPin size={16} />
                      {form.latitude && form.longitude ? 'Localizacao salva' : 'Usar minha localizacao'}
                    </button>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-3">
                        <h2 className="text-sm font-bold text-white">Imagens do perfil</h2>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                          Carregue uma foto de perfil e uma capa. Tambem da para trocar depois no painel.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="group cursor-pointer rounded-xl border border-white/10 bg-black/20 p-3 transition-colors hover:border-purple-500/40">
                          <div className="mb-3 aspect-square overflow-hidden rounded-xl bg-zinc-900">
                            {avatarPreview ? (
                              <img
                                src={avatarPreview}
                                alt="Prévia da foto de perfil"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-zinc-600">
                                <Upload size={24} />
                              </div>
                            )}
                          </div>
                          <span className="block text-xs font-bold text-zinc-200">
                            Carregar foto
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleRegisterImage(e.target.files?.[0], 'avatar')}
                          />
                        </label>

                        <label className="group cursor-pointer rounded-xl border border-white/10 bg-black/20 p-3 transition-colors hover:border-purple-500/40">
                          <div className="mb-3 aspect-square overflow-hidden rounded-xl bg-zinc-900">
                            {coverPreview ? (
                              <img
                                src={coverPreview}
                                alt="Prévia da capa"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-zinc-600">
                                <Upload size={24} />
                              </div>
                            )}
                          </div>
                          <span className="block text-xs font-bold text-zinc-200">
                            Carregar capa
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleRegisterImage(e.target.files?.[0], 'cover')}
                          />
                        </label>
                      </div>
                    </div>

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
