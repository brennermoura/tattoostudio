import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  ChevronDown,
  Clock,
  Flame,
  Heart,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { ExploreArtist } from '../types';
import { listPublicExploreArtists } from '../services/artistService';
import {
  inferBrazilianStateFromText,
  cityLabel,
  loadFeaturedBrazilianCities,
  normalizeBrazilianState,
  normalizeLocationTerm,
  searchBrazilianCities,
  searchBrazilianStates,
  stateLabel,
  type BrazilianCityOption,
} from '../constants/locations';
import {
  distanceInKm,
  requestBrowserLocation,
  type Coordinates,
} from '../utils/geolocation';
import {
  SERVICE_CATEGORIES,
  getProfileTypeLabel,
  getServiceSummaryLabel,
  normalizeServiceCategories,
} from '../utils/serviceCategories';
import type { ServiceCategory } from '../types';

interface ExplorePageProps {
  isLoggedIn?: boolean;
  onLogin: () => void;
  onRegister: () => void;
  onOpenDashboard: () => void;
  onOpenPublicProfile: () => void;
  onOpenArtist: (artist: ExploreArtist) => void;
  onOpenLanding: () => void;
}

type SortMode = 'latest' | 'trending';

interface SearchFilters {
  query: string;
  city: string;
  stateFilter: string;
  style: string;
  serviceCategory: '' | ServiceCategory;
}

const emptySearchFilters: SearchFilters = {
  query: '',
  city: '',
  stateFilter: '',
  style: '',
  serviceCategory: '',
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getArtistImage(artist: ExploreArtist) {
  return artist.coverImage || artist.avatar;
}

function getAccentColor(artist: ExploreArtist) {
  return artist.accentColor || '#c084fc';
}

function getArtistState(artist: ExploreArtist) {
  return artist.state || inferBrazilianStateFromText(artist.city);
}

function formatFoundArtists(count: number) {
  return `${count} ${count === 1 ? 'profissional encontrado' : 'profissionais encontrados'}`;
}

function getArtistAgeInDays(artist: ExploreArtist) {
  const createdAt = Date.parse(artist.createdAt);
  if (Number.isNaN(createdAt)) return null;
  return Math.max(0, Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000)));
}

function isRecentlyRegistered(artist: ExploreArtist) {
  const ageInDays = getArtistAgeInDays(artist);
  return ageInDays !== null && ageInDays <= 7;
}

function isNewArtist(artist: ExploreArtist) {
  const ageInDays = getArtistAgeInDays(artist);
  return ageInDays !== null && ageInDays <= 30;
}

function getSocialProofLabel(artist: ExploreArtist) {
  if (artist.likeCount > 0) {
    return `${artist.likeCount} curtida${artist.likeCount === 1 ? '' : 's'}`;
  }

  return isRecentlyRegistered(artist) ? 'Recém cadastrado' : 'Novo artista';
}

export default function ExplorePage({
  isLoggedIn = false,
  onLogin,
  onRegister,
  onOpenDashboard,
  onOpenPublicProfile,
  onOpenArtist,
  onOpenLanding,
}: ExplorePageProps) {
  const [artists, setArtists] = useState<ExploreArtist[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [style, setStyle] = useState('');
  const [serviceCategory, setServiceCategory] = useState<'' | ServiceCategory>('');
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(emptySearchFilters);
  const [sort, setSort] = useState<SortMode>('trending');
  const [cityOptions, setCityOptions] = useState<BrazilianCityOption[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  const [citySuggestionsOpen, setCitySuggestionsOpen] = useState(false);
  const [stateSuggestionsOpen, setStateSuggestionsOpen] = useState(false);

  useEffect(() => {
    void listPublicExploreArtists()
      .then(setArtists)
      .catch((error) => {
        console.error('Failed to load explore artists:', error);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadFeaturedBrazilianCities().then(setCityOptions);
  }, []);

  const citySuggestions = useMemo(() => {
    return searchBrazilianCities(cityOptions, city, stateFilter);
  }, [cityOptions, city, stateFilter]);

  const styles = useMemo(
    () =>
      Array.from(new Set(artists.flatMap((artist) => artist.styles))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [artists]
  );

  const stateSuggestions = useMemo(
    () => searchBrazilianStates(stateFilter).slice(0, 6),
    [stateFilter]
  );

  const filteredArtists = useMemo(() => {
    const cleanQuery = normalize(appliedFilters.query);
    const cleanCity = normalize(appliedFilters.city);
    const cleanState = normalizeLocationTerm(normalizeBrazilianState(appliedFilters.stateFilter));

    const result = artists.filter((artist) => {
      const artistState = getArtistState(artist);

      const searchableText = [
        artist.artisticName,
        artist.city,
        artistState,
        artist.instagram,
        getProfileTypeLabel(artist.profileType),
        getServiceSummaryLabel(artist),
        artist.styles.join(' '),
      ]
        .filter(Boolean)
        .join(' ');

      const matchesQuery = !cleanQuery || normalize(searchableText).includes(cleanQuery);
      const matchesCity = !cleanCity || normalize(artist.city || '').includes(cleanCity);
      const matchesState = !cleanState || normalizeLocationTerm(artistState).includes(cleanState);
      const matchesStyle =
        !appliedFilters.style || artist.styles.some((item) => item === appliedFilters.style);
      const matchesService =
        !appliedFilters.serviceCategory ||
        normalizeServiceCategories(artist.serviceCategories).includes(appliedFilters.serviceCategory);
      return matchesQuery && matchesCity && matchesState && matchesStyle && matchesService;
    });

    return result.sort((a, b) => {
      if (userLocation) {
        const distanceA = getDistanceFromUser(a);
        const distanceB = getDistanceFromUser(b);

        return distanceA - distanceB || b.likeCount - a.likeCount;
      }

      if (sort === 'trending') {
        return b.likeCount - a.likeCount || Date.parse(b.createdAt) - Date.parse(a.createdAt);
      }

      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  }, [appliedFilters, artists, sort, userLocation]);

  const hasActiveFilters = Boolean(
    appliedFilters.query ||
      appliedFilters.city ||
      appliedFilters.stateFilter ||
      appliedFilters.style ||
      appliedFilters.serviceCategory ||
      userLocation
  );

  function getDistanceFromUser(artist: ExploreArtist) {
    if (!userLocation || typeof artist.latitude !== 'number' || typeof artist.longitude !== 'number') {
      return Number.POSITIVE_INFINITY;
    }

    return distanceInKm(userLocation, {
      latitude: artist.latitude,
      longitude: artist.longitude,
    });
  }

  function formatDistance(artist: ExploreArtist) {
    const distance = getDistanceFromUser(artist);
    if (!Number.isFinite(distance)) return '';

    const value = distance < 10 ? distance.toFixed(1).replace('.', ',') : String(Math.round(distance));
    return `${value} km de você`;
  }

  function formatPlaceLabel(artist: ExploreArtist) {
    if (artist.publicAddressLabel) return artist.publicAddressLabel;
    if (artist.publicNeighborhood) return `Próximo ao ${artist.publicNeighborhood}`;
    if (artist.city) return `Em ${artist.city}`;
    return 'Localização a combinar';
  }

  function applyFilters() {
    setAppliedFilters({
      query: query.trim(),
      city: city.trim(),
      stateFilter: stateFilter.trim(),
      style,
      serviceCategory,
    });
  }

  function applyServiceFilter(category: '' | ServiceCategory) {
    setServiceCategory(category);
    setAppliedFilters({
      query: query.trim(),
      city: city.trim(),
      stateFilter: stateFilter.trim(),
      style,
      serviceCategory: category,
    });
  }

  function clearFilters() {
    setQuery('');
    setCity('');
    setStateFilter('');
    setStyle('');
    setServiceCategory('');
    setAppliedFilters(emptySearchFilters);
    setUserLocation(null);
    setLocationError('');
  }

  async function useNearMe() {
    setLocationLoading(true);
    setLocationError('');

    try {
      const location = await requestBrowserLocation();
      setUserLocation(location);
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'Nao foi possivel obter sua localizacao.');
    } finally {
      setLocationLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function requestLocationOnEntry() {
      setLocationLoading(true);
      setLocationError('');

      try {
        const location = await requestBrowserLocation();
        if (!cancelled) {
          setUserLocation(location);
        }
      } catch (error) {
        if (!cancelled) {
          setLocationError(
            error instanceof Error
              ? error.message
              : 'Nao foi possivel obter sua localizacao.'
          );
        }
      } finally {
        if (!cancelled) {
          setLocationLoading(false);
        }
      }
    }

    void requestLocationOnEntry();

    return () => {
      cancelled = true;
    };
  }, []);

  function closeCitySuggestionsSoon() {
    window.setTimeout(() => setCitySuggestionsOpen(false), 120);
  }

  function closeStateSuggestionsSoon() {
    window.setTimeout(() => setStateSuggestionsOpen(false), 120);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2"
            aria-label="Voltar ao topo"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-950/40">
              <span className="text-white font-bold text-sm">T</span>
            </div>

            <span className="font-bold text-lg tracking-tight">TatuApp</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onOpenLanding}
              className="hidden sm:inline-flex text-sm text-zinc-400 hover:text-white transition-colors px-3 py-2"
            >
              Sou tatuador
            </button>

            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-2"
                >
                  Painel
                </button>

                <button
                  type="button"
                  onClick={onOpenPublicProfile}
                  className="text-sm bg-white text-black font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  Perfil público
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onLogin}
                  className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-2"
                >
                  Entrar
                </button>

                <button
                  type="button"
                  onClick={onRegister}
                  className="text-sm bg-white text-black font-semibold px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  Criar conta
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="relative overflow-hidden">
        <div className="absolute top-[-180px] left-1/2 -translate-x-1/2 w-[860px] h-[500px] bg-purple-600/15 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-40 right-[-160px] w-[360px] h-[360px] bg-pink-600/10 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute bottom-20 left-[-160px] w-[320px] h-[320px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

        <section className="relative pt-24 sm:pt-28 pb-7 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-7">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-full px-3 py-1.5 text-xs sm:text-sm text-zinc-400 mb-5 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_14px_rgba(74,222,128,0.8)]" />
                  Catálogo profissional
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.02] tracking-tight">
                  Encontre o artista certo.
                  <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-purple-300 bg-clip-text text-transparent">
                    Sem perder tempo.
                  </span>
                </h1>

                <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mt-5 leading-relaxed">
                  Pesquise por nome, cidade, estado ou estilo. Ative sua localização para ver quem
                  está realmente perto de você.
                </p>
              </div>

              <div className="hidden lg:flex items-center gap-4 bg-white/[0.035] border border-white/10 rounded-3xl px-5 py-4 backdrop-blur-sm">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-950/40">
                  <Users size={21} />
                </div>

                <div>
                  <p className="text-3xl font-black leading-none">{loading ? '...' : artists.length}</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    {loading ? 'carregando perfis' : 'profissionais disponíveis'}
                  </p>
                </div>
              </div>
            </div>

            <div className="sticky top-20 z-30">
              <div className="rounded-[32px] bg-gradient-to-r from-white/10 via-purple-500/25 to-pink-500/20 p-[1px] shadow-2xl shadow-black/60">
                <div className="rounded-[31px] bg-[#101010]/95 border border-white/[0.03] p-3 sm:p-4 backdrop-blur-xl">
                  <form
                    className="grid xl:grid-cols-[1fr_180px_180px_180px_150px] gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      applyFilters();
                    }}
                  >
                    <label className="relative group">
                      <Search
                        size={23}
                        className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-purple-300 transition-colors duration-300"
                      />

                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar por profissional, cidade ou estilo..."
                        className="w-full h-14 sm:h-16 bg-white/[0.045] border border-white/10 rounded-2xl pl-14 pr-12 text-base text-white placeholder-zinc-600 outline-none focus:border-purple-400/70 focus:bg-white/[0.07] transition-all duration-300"
                      />

                      {query.trim() && (
                        <button
                          type="button"
                          onClick={() => setQuery('')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                          aria-label="Limpar busca"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </label>

                    <label className="relative">
                      <span className="absolute left-4 top-2 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                        Estado
                      </span>

                      <input
                        value={stateFilter}
                        onFocus={() => setStateSuggestionsOpen(true)}
                        onChange={(event) => {
                          setStateFilter(event.target.value);
                          setCity('');
                          setStateSuggestionsOpen(true);
                        }}
                        onBlur={closeStateSuggestionsSoon}
                        placeholder="RJ ou SP"
                        className="w-full h-14 sm:h-16 bg-white/[0.045] border border-white/10 rounded-2xl px-4 pt-5 text-sm font-semibold text-white placeholder-zinc-600 outline-none focus:border-purple-400/70 focus:bg-white/[0.07] transition-all duration-300"
                        aria-label="Filtrar por estado"
                      />

                      {stateSuggestionsOpen && stateSuggestions.length > 0 && (
                        <div className="absolute z-40 left-0 right-0 mt-2 bg-[#151515]/95 border border-white/10 rounded-2xl p-1 shadow-2xl shadow-black/50 backdrop-blur-xl">
                          {stateSuggestions.map((option) => (
                            <button
                              key={option.uf}
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                setStateFilter(option.name);
                                setCity('');
                                setStateSuggestionsOpen(false);
                              }}
                              className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              {stateLabel(option)}
                            </button>
                          ))}
                        </div>
                      )}
                    </label>

                    <label className="relative">
                      <span className="absolute left-4 top-2 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                        Cidade
                      </span>

                      <input
                        value={city}
                        disabled={!stateFilter.trim()}
                        onFocus={() => setCitySuggestionsOpen(true)}
                        onChange={(event) => {
                          setCity(event.target.value);
                          setCitySuggestionsOpen(true);
                        }}
                        onBlur={closeCitySuggestionsSoon}
                        placeholder={stateFilter.trim() ? 'Cidade' : 'Escolha o estado'}
                        className="w-full h-14 sm:h-16 bg-white/[0.045] border border-white/10 rounded-2xl px-4 pt-5 text-sm font-semibold text-white placeholder-zinc-600 outline-none focus:border-purple-400/70 focus:bg-white/[0.07] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-45"
                        aria-label="Filtrar por cidade"
                      />

                      {citySuggestionsOpen && citySuggestions.length > 0 && (
                        <div className="absolute z-40 left-0 right-0 mt-2 bg-[#151515]/95 border border-white/10 rounded-2xl p-1 shadow-2xl shadow-black/50 backdrop-blur-xl">
                          {citySuggestions.map((item) => (
                            <button
                              key={`${item.uf}-${item.name}`}
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                setCity(item.name);
                                setStateFilter(item.state);
                                setCitySuggestionsOpen(false);
                              }}
                              className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              {cityLabel(item)}
                            </button>
                          ))}
                        </div>
                      )}
                    </label>

                    <label className="relative">
                      <span className="absolute left-4 top-2 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                        Estilo
                      </span>

                      <select
                        value={style}
                        onChange={(event) => setStyle(event.target.value)}
                        className="w-full h-14 sm:h-16 appearance-none bg-white/[0.045] border border-white/10 rounded-2xl pl-4 pr-11 pt-5 text-sm font-semibold text-white outline-none focus:border-purple-400/70 focus:bg-white/[0.07] transition-all duration-300"
                        aria-label="Filtrar por estilo"
                      >
                        <option value="" className="bg-[#151515] text-zinc-300">
                          Todos
                        </option>

                        {styles.map((item) => (
                          <option key={item} value={item} className="bg-[#151515] text-zinc-300">
                            {item}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        size={17}
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500"
                      />
                    </label>

                    <button
                      type="submit"
                      className="inline-flex h-14 sm:h-16 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 text-sm font-black text-white shadow-lg shadow-purple-950/30 transition-all duration-300 hover:from-purple-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
                    >
                      <Search size={17} />
                      Pesquisar
                    </button>
                  </form>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyServiceFilter('')}
                      className={`rounded-full border px-3 py-2 text-xs font-black transition-colors ${
                        serviceCategory === ''
                          ? 'border-purple-400/50 bg-purple-500/15 text-white'
                          : 'border-white/10 bg-white/[0.035] text-zinc-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      Todos
                    </button>
                    {SERVICE_CATEGORIES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => applyServiceFilter(item.value)}
                        className={`rounded-full border px-3 py-2 text-xs font-black transition-colors ${
                          serviceCategory === item.value
                            ? 'border-purple-400/50 bg-purple-500/15 text-white'
                            : 'border-white/10 bg-white/[0.035] text-zinc-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={useNearMe}
                    disabled={locationLoading}
                    className={`mt-3 flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-all disabled:opacity-60 ${
                      userLocation
                        ? 'border-purple-400/40 bg-purple-500/12 text-purple-100'
                        : 'border-white/10 bg-white/[0.035] text-zinc-300 hover:border-purple-400/40 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                        <MapPin size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-black">
                          {locationLoading
                            ? 'Localizando...'
                            : userLocation
                            ? 'Distância ativada'
                            : 'Usar minha localização'}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">
                          {userLocation
                            ? 'Ordenando por proximidade e mostrando km nos cards.'
                            : 'Mostra resultados tipo “1,2 km de você” no catálogo.'}
                        </span>
                      </span>
                    </span>
                    <span className="hidden rounded-full bg-black/25 px-3 py-1 text-[11px] font-bold text-zinc-300 sm:inline-flex">
                      Perto de mim
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-2 sm:px-3 pt-3">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <span>
                    {loading ? 'Buscando artistas...' : formatFoundArtists(filteredArtists.length)}
                  </span>

                  {hasActiveFilters && <span className="hidden sm:inline text-zinc-700">•</span>}

                  {hasActiveFilters && (
                    <span className="hidden sm:inline text-zinc-500">filtros aplicados</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {locationError && (
                    <span className="text-xs font-semibold text-red-300">{locationError}</span>
                  )}

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex w-fit items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                    >
                      <X size={14} />
                      Limpar filtros
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative px-4 sm:px-6 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div>
                <p className="text-sm text-purple-300 font-semibold mb-2">
                  {hasActiveFilters ? 'Resultado da busca' : 'Catálogo completo'}
                </p>

                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {loading ? 'Carregando catálogo' : formatFoundArtists(filteredArtists.length)}
                </h2>
              </div>

              <div className="grid grid-cols-2 bg-white/[0.04] border border-white/10 rounded-2xl p-1 h-12 min-w-full sm:min-w-[220px] shadow-lg shadow-black/20">
                <button
                  type="button"
                  onClick={() => setSort('trending')}
                  className={`rounded-xl text-sm font-bold transition-all duration-300 ${
                    sort === 'trending'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-950/40'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  Em alta
                </button>

                <button
                  type="button"
                  onClick={() => setSort('latest')}
                  className={`rounded-xl text-sm font-bold transition-all duration-300 ${
                    sort === 'latest'
                      ? 'bg-white text-black shadow-lg'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  Últimos
                </button>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, index) => (
                  <div
                    key={index}
                    className="bg-white/[0.035] border border-white/10 rounded-[28px] overflow-hidden"
                  >
                    <div className="h-40 sm:h-44 bg-white/[0.06] animate-pulse" />

                    <div className="p-5">
                      <div className="h-5 w-2/3 bg-white/[0.08] rounded-full animate-pulse mb-3" />
                      <div className="h-3 w-full bg-white/[0.06] rounded-full animate-pulse mb-2" />
                      <div className="h-3 w-4/5 bg-white/[0.06] rounded-full animate-pulse mb-5" />

                      <div className="border-l-2 border-white/10 pl-3">
                        <div className="h-2.5 w-14 bg-white/[0.06] rounded-full animate-pulse mb-2" />
                        <div className="h-3 w-36 bg-white/[0.08] rounded-full animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredArtists.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredArtists.map((artist) => {
                  const accentColor = getAccentColor(artist);
                  const artistImage = getArtistImage(artist);
                  const distanceLabel = formatDistance(artist);
                  const placeLabel = formatPlaceLabel(artist);
                  const locationLabel = distanceLabel || placeLabel;
                  const serviceLabel = getServiceSummaryLabel(artist);
                  const profileTypeLabel = getProfileTypeLabel(artist.profileType);
                  const isNearby = Boolean(userLocation && distanceLabel);
                  const isTrending = artist.likeCount >= 3;
                  const recentlyRegistered = isRecentlyRegistered(artist);
                  const newArtist = isNewArtist(artist);
                  const hasContact = Boolean(artist.instagram);
                  const hasOpenSchedule = true;
                  const primaryBadges = [
                    hasOpenSchedule
                      ? {
                          label: 'Agenda aberta',
                          icon: Calendar,
                        }
                      : null,
                  ];

                  const contextualBadges = [
                    isNearby
                      ? {
                          label: 'Perto de você',
                          icon: MapPin,
                        }
                      : null,
                    isTrending
                      ? {
                          label: 'Em alta',
                          icon: Flame,
                        }
                      : null,
                    recentlyRegistered
                      ? {
                          label: 'Recém cadastrado',
                          icon: Sparkles,
                        }
                      : null,
                    !recentlyRegistered && newArtist
                      ? {
                          label: 'Novo artista',
                          icon: Sparkles,
                        }
                      : null,
                    hasContact
                      ? {
                          label: 'Responde rápido',
                          icon: MessageCircle,
                        }
                      : null,
                  ];

                  const badges = [
                    {
                      label: serviceLabel,
                      icon: BadgeCheck,
                    },
                    ...primaryBadges.filter(Boolean),
                    ...contextualBadges.filter(Boolean).slice(0, 1),
                  ] as Array<{
                    label: string;
                    icon: typeof Calendar;
                  }>;

                  return (
                    <button
                      key={artist.id}
                      type="button"
                      onClick={() => onOpenArtist(artist)}
                      className="group cursor-pointer bg-white/[0.035] border border-white/10 rounded-[28px] overflow-hidden text-left transition-all duration-300 hover:-translate-y-1 hover:border-purple-400/40 hover:bg-white/[0.055] hover:shadow-2xl hover:shadow-purple-950/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      <div
                        className="relative h-40 sm:h-44 bg-zinc-950 overflow-hidden"
                        style={{ borderBottom: `1px solid ${accentColor}55` }}
                      >
                        {artistImage ? (
                          <img
                            src={artistImage}
                            alt={artist.artisticName}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-950/50 via-zinc-950 to-pink-950/30" />
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/95 to-transparent" />

                        {badges.length > 0 && (
                          <div className="absolute left-3 right-3 top-3 flex min-w-0 gap-1.5">
                            {badges.map((badge) => {
                              const Icon = badge.icon;

                              return (
                                <span
                                  key={badge.label}
                                  className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border border-white/12 bg-black/40 px-2.5 text-[10px] font-semibold tracking-[0.01em] text-zinc-100 shadow-sm backdrop-blur-md"
                                >
                                  <Icon size={11} strokeWidth={1.8} className="shrink-0 text-zinc-300" />
                                  <span className="truncate">{badge.label}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <div className="absolute left-4 right-4 bottom-4">
                          <div className="flex items-end gap-3">
                            <img
                              src={artist.avatar}
                              alt={artist.artisticName}
                              className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 bg-zinc-900 shadow-xl"
                            />

                            <div className="min-w-0 pb-1">
                              <p className="font-black text-xl truncate">
                                {artist.artisticName}
                              </p>

                              {artist.instagram && (
                                <p className="text-xs text-zinc-400 truncate">
                                  @{artist.instagram.replace('@', '')}
                                </p>
                              )}

	                              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-zinc-300/80">
	                                <span className="inline-flex min-w-0 items-center gap-1.5">
	                                  <MapPin size={13} className="shrink-0 text-purple-300" />
	                                  <span className="truncate">{locationLabel}</span>
	                                </span>

                                <span className="inline-flex items-center gap-1.5 text-zinc-300">
                                  {artist.likeCount > 0 ? (
                                    <Heart size={13} className="text-pink-400" fill="#f472b6" />
                                  ) : (
                                    <Sparkles size={13} className="text-zinc-400" />
                                  )}
                                  {getSocialProofLabel(artist)}
                                </span>

	                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-5">
                        <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2 min-h-[40px]">
                          {artist.bio || 'Perfil profissional com portfólio e agenda online.'}
                        </p>

                        <div
                          className="mt-4 min-h-[42px] border-l-2 pl-3"
                          style={{ borderColor: `${accentColor}aa` }}
                        >
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                            Estilos
                          </p>

                          <p className="mt-1 text-sm font-semibold leading-snug text-zinc-300 line-clamp-2">
                            {artist.styles.length > 0
                              ? artist.styles.join(' · ')
                              : `${profileTypeLabel} · ${serviceLabel}`}
                          </p>
                        </div>

                        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                          <span className="relative inline-flex items-center gap-2 text-sm font-black text-white transition-colors duration-300 after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-purple-300 after:transition-transform after:duration-300 group-hover:text-purple-200 group-hover:after:scale-x-100">
                            <span>Ver perfil</span>
                            <ArrowRight
                              size={15}
                              className="transition-transform duration-300 group-hover:translate-x-1"
                            />
                          </span>

                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                            {hasOpenSchedule ? <Calendar size={13} /> : <Clock size={13} />}
                            {hasOpenSchedule ? 'Agenda aberta' : 'Agenda online'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/[0.035] border border-white/10 rounded-[32px] p-10 sm:p-14 text-center shadow-2xl shadow-black/20">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto mb-5">
                  <UserPlus size={24} className="text-zinc-400" />
                </div>

                <p className="text-2xl font-black mb-2">Nenhum tatuador encontrado.</p>

                <p className="text-zinc-500 text-sm max-w-md mx-auto mb-7">
                  Tenta ajustar a cidade, trocar o estilo ou limpar os filtros. A busca ficou fina,
                  mas ainda não faz milagre bíblico em banco vazio.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
