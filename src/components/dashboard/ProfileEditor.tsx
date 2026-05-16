import { useEffect, useMemo, useState } from 'react';
import { Camera, Save, Check, Link, Loader2, MapPin, Upload } from 'lucide-react';
import { ArtistProfile, TattooStyle } from '../../types';
import { compressImageFile } from '../../utils/localPrototype';
import { isSupabaseConfigured } from '../../lib/supabase';
import { uploadProfileImage } from '../../services/uploadService';
import {
  cityLabel,
  loadFeaturedBrazilianCities,
  normalizeBrazilianState,
  searchBrazilianCities,
  searchBrazilianStates,
  stateLabel,
  type BrazilianCityOption,
} from '../../constants/locations';
import { requestBrowserLocation } from '../../utils/geolocation';

const ALL_STYLES: TattooStyle[] = [
  'Blackwork', 'Fineline', 'Aquarela', 'Realismo', 'Geométrico',
  'Old School', 'New School', 'Tribal', 'Japonês', 'Minimalista',
  'Neo-Tradicional', 'Pontilhismo',
];

const ACCENT_COLORS = [
  '#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#8b5cf6', '#f97316', '#84cc16',
];

interface ProfileEditorProps {
  artist: ArtistProfile;
  onUpdate: (artist: ArtistProfile) => void;
}

export default function ProfileEditor({ artist, onUpdate }: ProfileEditorProps) {
  const [form, setForm] = useState({
    artisticName: artist.artisticName,
    bio: artist.bio,
    instagram: artist.instagram,
    whatsapp: artist.whatsapp,
    city: artist.city,
    state: artist.state,
    latitude: artist.latitude ?? null,
    longitude: artist.longitude ?? null,
    styles: artist.styles,
    accentColor: artist.accentColor,
    slug: artist.slug,
  });
  const [saved, setSaved] = useState(false);
  const [cityOptions, setCityOptions] = useState<BrazilianCityOption[]>([]);
  const [citySuggestionsOpen, setCitySuggestionsOpen] = useState(false);
  const [stateSuggestionsOpen, setStateSuggestionsOpen] = useState(false);
  const [avatar, setAvatar] = useState(artist.avatar);
  const [coverImage, setCoverImage] = useState(artist.coverImage);
  const [imageSaving, setImageSaving] = useState<'avatar' | 'cover' | null>(null);
  const [imageError, setImageError] = useState('');
  const [autoSaved, setAutoSaved] = useState('');

  const BIO_MAX = 200;
  const stateSuggestions = searchBrazilianStates(form.state).slice(0, 4);
  const citySuggestions = useMemo(
    () => searchBrazilianCities(cityOptions, form.city, form.state),
    [cityOptions, form.city, form.state]
  );

  useEffect(() => {
    void loadFeaturedBrazilianCities().then(setCityOptions);
  }, []);

  const toggleStyle = (style: TattooStyle) => {
    setForm((f) => ({
      ...f,
      styles: f.styles.includes(style)
        ? f.styles.filter((s) => s !== style)
        : [...f.styles, style],
    }));
  };

  const markSaved = (message = 'Salvo!') => {
    setSaved(true);
    setAutoSaved(message);
    setTimeout(() => setSaved(false), 2000);
    setTimeout(() => setAutoSaved(''), 2400);
  };

  const nextArtist = (overrides: Partial<ArtistProfile> = {}) => ({
    ...artist,
    ...form,
    state: normalizeBrazilianState(form.state),
    avatar,
    coverImage,
    ...overrides,
  });

  const handleSave = () => {
    onUpdate(nextArtist());
    markSaved();
  };

  const useCurrentLocation = async () => {
    try {
      const location = await requestBrowserLocation();
      const nextForm = {
        ...form,
        latitude: location.latitude,
        longitude: location.longitude,
      };

      setForm(nextForm);
      onUpdate({
        ...nextArtist(),
        ...nextForm,
        state: normalizeBrazilianState(nextForm.state),
      });
      markSaved('Localizacao salva');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Nao foi possivel obter sua localizacao.');
    }
  };

  const applyImageValue = (kind: 'avatar' | 'cover', value: string, message: string) => {
    if (kind === 'avatar') {
      setAvatar(value);
      onUpdate(nextArtist({ avatar: value }));
      markSaved(message);
      return;
    }

    setCoverImage(value);
    onUpdate(nextArtist({ coverImage: value }));
    markSaved(message);
  };

  const applyExternalImageUrl = (kind: 'avatar' | 'cover', value: string) => {
    const cleanUrl = value.trim();
    if (!cleanUrl) {
      applyImageValue(kind, '', kind === 'avatar' ? 'Foto removida' : 'Capa removida');
      return;
    }

    if (!/^https?:\/\//i.test(cleanUrl)) return;
    applyImageValue(kind, cleanUrl, kind === 'avatar' ? 'Foto atualizada' : 'Capa atualizada');
  };

  const handleImageUpload = async (
    file: File | undefined,
    kind: 'avatar' | 'cover'
  ) => {
    if (!file || imageSaving) return;

    setImageSaving(kind);
    setImageError('');

    try {
      const uploadedUrl = isSupabaseConfigured
        ? await uploadProfileImage(kind, file)
        : await compressImageFile(file, kind === 'avatar' ? 800 : 1800);

      applyImageValue(kind, uploadedUrl, kind === 'avatar' ? 'Foto carregada' : 'Capa carregada');
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      setImageError(error instanceof Error ? error.message : 'Nao foi possivel enviar a imagem.');
    } finally {
      setImageSaving(null);
    }
  };

  const renderImageControl = (kind: 'avatar' | 'cover') => {
    const isAvatar = kind === 'avatar';
    const value = isAvatar ? avatar : coverImage;
    const isSaving = imageSaving === kind;
    const label = isAvatar ? 'Foto de perfil' : 'Capa do perfil';
    const hint = isAvatar
      ? 'Imagem quadrada para aparecer no topo do perfil.'
      : 'Banner horizontal usado como destaque do perfil.';

    return (
      <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
        <div
          className={`overflow-hidden border border-white/10 bg-white/5 ${
            isAvatar ? 'h-[72px] w-[72px] rounded-2xl sm:h-24 sm:w-24' : 'h-[72px] w-[72px] rounded-xl sm:h-24 sm:w-24'
          }`}
        >
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-600">
              <Camera size={20} />
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <div>
            <p className="text-sm font-bold text-zinc-100">{label}</p>
            <p className="text-xs text-zinc-500">{hint}</p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
            <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-zinc-200 transition-colors hover:bg-white/10">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {isAvatar ? 'Carregar foto' : 'Carregar capa'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={Boolean(imageSaving)}
                onChange={(event) => void handleImageUpload(event.target.files?.[0], kind)}
              />
            </label>

            <div className="flex min-w-0 items-center rounded-xl border border-white/10 bg-white/5 focus-within:border-purple-500">
              <Link size={15} className="ml-3 shrink-0 text-zinc-500" />
              <input
                type="url"
                value={value.startsWith('data:') ? '' : value}
                onChange={(event) => (isAvatar ? setAvatar(event.target.value) : setCoverImage(event.target.value))}
                onBlur={(event) => applyExternalImageUrl(kind, event.target.value)}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData('text');
                  window.setTimeout(() => applyExternalImageUrl(kind, pasted), 0);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur();
                  }
                }}
                placeholder="Colar link https://..."
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white placeholder-zinc-600 outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Editar Perfil</h1>
        <p className="text-zinc-400 text-sm mt-1">Suas informações públicas no mini site</p>
      </div>

      <div className="space-y-5">
        {/* URL slug */}
        <div>
          <label className="text-zinc-300 text-sm font-medium block mb-1.5">
            Link do perfil
          </label>
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <span className="px-3 py-3 text-zinc-500 text-sm bg-white/5 border-r border-white/10 whitespace-nowrap">
              tatu.app/
            </span>
            <input
              type="text"
              value={form.slug}
              onChange={(e) =>
                setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s/g, '') })
              }
              className="flex-1 px-3 py-3 bg-transparent text-white text-sm focus:outline-none placeholder-zinc-600"
            />
          </div>
        </div>

        {/* Profile images */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
          <div>
            <h2 className="font-bold text-sm">Imagens do perfil</h2>
            <p className="text-zinc-500 text-xs mt-1">
              Carregue arquivos ou use uma URL externa.
            </p>
          </div>
          {imageError && (
            <p className="rounded-xl border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">
              {imageError}
            </p>
          )}
          {autoSaved && (
            <p className="rounded-xl border border-green-900/30 bg-green-950/20 px-3 py-2 text-xs font-semibold text-green-300">
              {autoSaved}
            </p>
          )}
          <div className="space-y-5">
            {renderImageControl('avatar')}
            <div className="h-px bg-white/10" />
            {renderImageControl('cover')}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-zinc-300 text-sm font-medium block mb-1.5">
            Nome artístico
          </label>
          <input
            type="text"
            value={form.artisticName}
            onChange={(e) => setForm({ ...form, artisticName: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
          />
        </div>

        {/* Bio */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-zinc-300 text-sm font-medium">Bio</label>
            <span
              className={`text-xs ${
                form.bio.length > BIO_MAX ? 'text-red-400' : 'text-zinc-500'
              }`}
            >
              {form.bio.length}/{BIO_MAX}
            </span>
          </div>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, BIO_MAX) })}
            rows={3}
            placeholder="Uma breve descrição sobre você e seu trabalho. Emojis são bem-vindos! 🎨"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm resize-none"
          />
          <p className="text-zinc-600 text-xs mt-1">Máximo 200 caracteres. Seja direto e objetivo.</p>
        </div>

        {/* Instagram */}
        <div>
          <label className="text-zinc-300 text-sm font-medium block mb-1.5">Instagram</label>
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-purple-500 transition-colors">
            <span className="px-3 py-3 text-zinc-500 text-sm">@</span>
            <input
              type="text"
              value={form.instagram.replace('@', '')}
              onChange={(e) => setForm({ ...form, instagram: `@${e.target.value}` })}
              placeholder="seuinstagram"
              className="flex-1 px-1 py-3 bg-transparent text-white text-sm focus:outline-none placeholder-zinc-600"
            />
          </div>
        </div>

        {/* WhatsApp */}
        <div>
          <label className="text-zinc-300 text-sm font-medium block mb-1.5">WhatsApp</label>
          <input
            type="tel"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            placeholder="(11) 99999-9999"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
          />
        </div>

        {/* State */}
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

        {/* City */}
        <div className="relative">
          <label className="text-zinc-300 text-sm font-medium block mb-1.5">Cidade</label>
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <MapPin size={16} />
          {form.latitude && form.longitude ? 'Localizacao salva' : 'Usar minha localizacao'}
        </button>

        {/* Styles */}
        <div>
          <label className="text-zinc-300 text-sm font-medium block mb-2">
            Estilos de tattoo
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_STYLES.map((style) => (
              <button
                key={style}
                onClick={() => toggleStyle(style)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  form.styles.includes(style)
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:border-purple-500/50 hover:text-zinc-200'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <label className="text-zinc-300 text-sm font-medium block mb-2">
            Cor de destaque do perfil
          </label>
          <div className="flex gap-2 flex-wrap">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setForm({ ...form, accentColor: color })}
                className={`w-8 h-8 rounded-full transition-all ${
                  form.accentColor === color
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111] scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Save */}
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
              <Save size={18} /> Salvar perfil
            </>
          )}
        </button>
      </div>
    </div>
  );
}
