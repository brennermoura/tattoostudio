import { useEffect, useRef, useState } from 'react';
import LandingPage from './components/LandingPage';
import PitchPage from './components/PitchPage';
import AuthPage from './components/AuthPage';
import Dashboard, { type DashSection } from './components/Dashboard';
import PublicProfile from './components/PublicProfile';
import AdminPanel from './components/AdminPanel';
import ExplorePage from './components/ExplorePage';
import { ArtistProfile, Appointment, ExploreArtist } from './types';
import { mockArtist } from './data/mockData';
import { clearStoredArtist, loadStoredArtist, saveStoredArtist, slugify } from './utils/localPrototype';
import {
  createArtistProfileForCurrentUser,
  createPublicAppointment,
  loadArtistByUserId,
  loadPublicArtistBySlug,
  saveDashboardArtist,
} from './services/artistService';
import { signOut } from './services/authService';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { uploadAppointmentProof, uploadProfileImage } from './services/uploadService';

type AppView = 'explore' | 'landing' | 'pitch' | 'login' | 'register' | 'dashboard' | 'admin' | 'public-profile';

function viewFromPath(pathname: string): AppView {
  if (pathname === '/' || pathname === '/explorar') return 'explore';
  if (pathname === '/landing') return 'landing';
  if (pathname === '/pitch') return 'pitch';
  if (pathname === '/login') return 'login';
  if (pathname === '/register') return 'register';
  if (pathname === '/dashboard') return 'dashboard';
  if (pathname === '/admin') return 'admin';
  if (pathname !== '/') return 'public-profile';
  return 'explore';
}

function slugFromPath(pathname: string) {
  const slug = pathname.replace(/^\/+/, '').split('/')[0];
  return slug && !['explorar', 'landing', 'pitch', 'login', 'register', 'dashboard', 'admin'].includes(slug) ? slug : '';
}

function shouldLoadPrivateArtist(pathname: string) {
  const view = viewFromPath(pathname);
  return view === 'dashboard' || view === 'public-profile';
}

function blankArtistFromProfile(profile: Partial<ArtistProfile>): ArtistProfile {
  const artisticName = profile.artisticName || 'Novo artista';
  return {
    ...mockArtist,
    ...profile,
    slug: profile.slug || slugify(artisticName) || `artista-${Date.now()}`,
    artisticName,
    realName: profile.realName || artisticName,
    avatar: profile.avatar || '',
    coverImage: profile.coverImage || '',
    bio: profile.bio || '',
    instagram: profile.instagram || '',
    styles: profile.styles || [],
    portfolio: profile.portfolio || [],
    pixKey: profile.pixKey || '',
    pixType: profile.pixType || 'phone',
    depositValue: profile.depositValue ?? 150,
    depositRequired: profile.depositRequired ?? true,
    availableDays: profile.availableDays || [],
    customSlots: profile.customSlots || {},
    dateSlots: profile.dateSlots || {},
    blockedDates: profile.blockedDates || [],
    appointments: profile.appointments || [],
    likeCount: profile.likeCount || 0,
    viewerLiked: profile.viewerLiked || false,
  };
}

export default function App() {
  const [view, setView] = useState<AppView>(() => viewFromPath(window.location.pathname));
  const [routePath, setRoutePath] = useState(() => window.location.pathname);
  const [publicProfileOrigin, setPublicProfileOrigin] = useState<{
    view: AppView;
    path: string;
  } | null>(null);
  const [artist, setArtist] = useState<ArtistProfile>(mockArtist);
  const [publicArtist, setPublicArtist] = useState<ArtistProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [publicRouteState, setPublicRouteState] = useState<'idle' | 'loading' | 'found' | 'not-found'>(
    () => (viewFromPath(window.location.pathname) === 'public-profile' ? 'loading' : 'idle')
  );
  const [dashboardInitialSection, setDashboardInitialSection] = useState<DashSection>('home');
  const publicArtistCache = useRef(new Map<string, ArtistProfile>());

  useEffect(() => {
    if (isSupabaseConfigured) {
      clearStoredArtist();
      return;
    }
    const storedArtist = loadStoredArtist();
    if (storedArtist) {
      setArtist(storedArtist);
    }
  }, []);

  const cachePrototypeArtist = (nextArtist: ArtistProfile) => {
    if (!isSupabaseConfigured) saveStoredArtist(nextArtist);
  };

  const restoreRegistrationAddress = async (
    profile: ArtistProfile,
    metadata: Record<string, unknown> | undefined
  ) => {
    if (
      profile.postalCode ||
      profile.addressStreet ||
      profile.latitude != null ||
      !metadata ||
      (!metadata.postal_code && !metadata.address_street)
    ) {
      return profile;
    }

    const metadataNumber = (value: unknown) => {
      if (value === null || value === undefined || value === '') return null;
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    };
    const restoredProfile = {
      ...profile,
      addressStreet: String(metadata.address_street || ''),
      addressNumber: String(metadata.address_number || ''),
      addressComplement: String(metadata.address_complement || ''),
      neighborhood: String(metadata.neighborhood || ''),
      postalCode: String(metadata.postal_code || ''),
      publicNeighborhood: String(metadata.public_neighborhood || ''),
      publicAddressLabel: String(metadata.public_address_label || ''),
      city: String(metadata.city || profile.city || ''),
      state: String(metadata.state || profile.state || ''),
      latitude: metadataNumber(metadata.latitude),
      longitude: metadataNumber(metadata.longitude),
    };

    await saveDashboardArtist(restoredProfile);
    return restoredProfile;
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;

    const loadSession = async () => {
      const { data } = await client.auth.getSession();
      const userId = data.session?.user.id;

      if (userId) {
        setIsLoggedIn(true);
        setCurrentUserId(userId);
        setAuthReady(true);

        if (shouldLoadPrivateArtist(window.location.pathname)) {
          const loadedProfile = await loadArtistByUserId(userId);
          const profile = loadedProfile
            ? await restoreRegistrationAddress(
                loadedProfile,
                data.session?.user.user_metadata as Record<string, unknown> | undefined
              ).catch(() => loadedProfile)
            : null;
          if (profile) {
            setArtist(profile);
            cachePrototypeArtist(profile);
          }
        }
        return;
      }

      setAuthReady(true);
    };

    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setCurrentUserId(null);
        return;
      }

      if (session?.user) {
        setIsLoggedIn(true);
        setCurrentUserId(session.user.id);

        if (shouldLoadPrivateArtist(window.location.pathname)) {
          void loadArtistByUserId(session.user.id).then((profile) => {
            if (!profile) return;
            setArtist(profile);
            cachePrototypeArtist(profile);
          });
        }
      }
    });

    void loadSession();

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRouteArtist = async () => {
      if (view !== 'public-profile') {
        setPublicRouteState('idle');
        setPublicArtist(null);
        return;
      }

      const slug = slugFromPath(routePath);
      if (!slug) {
        setPublicRouteState('idle');
        setPublicArtist(null);
        return;
      }

      if (currentUserId && artist.userId === currentUserId && artist.slug === slug) {
        publicArtistCache.current.set(artist.slug, artist);
        setPublicArtist(artist);
        setPublicRouteState('found');
        return;
      }

      const existingArtist = publicArtistCache.current.get(slug);
      if (existingArtist) {
        setPublicArtist(existingArtist);
        setPublicRouteState('found');
      } else {
        setPublicRouteState('loading');
      }

      const routeArtist = await loadPublicArtistBySlug(slug);
      if (cancelled) return;

      if (routeArtist) {
        publicArtistCache.current.set(routeArtist.slug, routeArtist);
        setPublicArtist(routeArtist);
        setPublicRouteState('found');
        return;
      }

      if (isSupabaseConfigured) {
        setPublicArtist(null);
        setPublicRouteState('not-found');
        return;
      }

      setPublicArtist(mockArtist);
      setPublicRouteState('found');
    };

    void loadRouteArtist();

    return () => {
      cancelled = true;
    };
  }, [routePath, view, currentUserId, artist.id, artist.slug, artist.userId]);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUserId || view !== 'dashboard') return;

    let cancelled = false;

    const loadPrivateDashboardArtist = async () => {
      const profile = await loadArtistByUserId(currentUserId);
      if (!profile || cancelled) return;

      setArtist(profile);
      cachePrototypeArtist(profile);
    };

    void loadPrivateDashboardArtist();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, view]);

  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      const nextView = viewFromPath(pathname);

      setRoutePath(pathname);
      if (nextView === 'public-profile') {
        setPublicArtist(null);
        setPublicRouteState('loading');
      } else {
        setPublicProfileOrigin(null);
      }
      setView(nextView);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (nextView: AppView, path: string) => {
    if (nextView === 'public-profile' && view !== 'public-profile') {
      setPublicProfileOrigin({ view, path: routePath });
    } else if (nextView !== 'public-profile') {
      setPublicProfileOrigin(null);
    }

    window.history.pushState({}, '', path);
    setRoutePath(path);
    if (nextView === 'public-profile' && path !== routePath) {
      setPublicArtist(null);
      setPublicRouteState('loading');
    }
    setView(nextView);
  };

  const openDashboardSection = (section: DashSection = 'home') => {
    setDashboardInitialSection(section);
    navigate('dashboard', '/dashboard');
  };

  const returnFromPublicProfile = (canEditCurrentProfile: boolean) => {
    if (publicProfileOrigin) {
      window.history.back();
      return;
    }

    if (canEditCurrentProfile) {
      openDashboardSection('home');
      return;
    }

    navigate('explore', '/');
  };

  const openOwnPublicProfile = async () => {
    if (currentUserId && artist.userId !== currentUserId) {
      const profile = await loadArtistByUserId(currentUserId);
      if (profile) {
        setArtist(profile);
        navigate('public-profile', `/${profile.slug}`);
        setPublicArtist(profile);
        setPublicRouteState('found');
        publicArtistCache.current.set(profile.slug, profile);
        cachePrototypeArtist(profile);
        return;
      }
    }

    navigate('public-profile', `/${artist.slug}`);
    setPublicArtist(artist);
    setPublicRouteState('found');
    publicArtistCache.current.set(artist.slug, artist);
  };

  const openPublicArtistFromExplore = (preview: ExploreArtist) => {
    const cachedArtist = publicArtistCache.current.get(preview.slug);
    navigate('public-profile', `/${preview.slug}`);
    setPublicArtist(cachedArtist || blankArtistFromProfile(preview));
    if (cachedArtist) setPublicRouteState('found');
  };

  const applyUploadedProfileImage = (
    profileId: string,
    kind: 'avatar' | 'cover',
    url: string
  ) => {
    const field = kind === 'avatar' ? 'avatar' : 'coverImage';
    setArtist((current) => {
      if (current.id !== profileId) return current;
      const nextArtist = { ...current, [field]: url };
      publicArtistCache.current.set(nextArtist.slug, nextArtist);
      return nextArtist;
    });
    setPublicArtist((current) =>
      current?.id === profileId ? { ...current, [field]: url } : current
    );
  };

  const persistArtist = async (nextArtist: ArtistProfile) => {
    const privateArtist =
      artist.id === nextArtist.id
        ? {
            ...artist,
            ...nextArtist,
            userId: artist.userId,
            addressStreet: nextArtist.addressStreet ?? artist.addressStreet,
            addressNumber: nextArtist.addressNumber ?? artist.addressNumber,
            addressComplement: nextArtist.addressComplement ?? artist.addressComplement,
            neighborhood: nextArtist.neighborhood ?? artist.neighborhood,
            postalCode: nextArtist.postalCode ?? artist.postalCode,
            latitude: nextArtist.latitude ?? artist.latitude,
            longitude: nextArtist.longitude ?? artist.longitude,
          }
        : nextArtist;

    setArtist(privateArtist);
    setPublicArtist((current) =>
      current?.id === nextArtist.id ? { ...current, ...nextArtist } : current
    );
    publicArtistCache.current.set(privateArtist.slug, privateArtist);
    cachePrototypeArtist(privateArtist);

    if (isSupabaseConfigured && isLoggedIn) {
      try {
        await saveDashboardArtist(privateArtist);
      } catch (error) {
        console.error('Erro ao salvar dados do dashboard:', error);
        throw error;
      }
    }
  };

  const handleAuthSuccess = async (
    profile?: Partial<ArtistProfile> & {
      avatarFile?: File;
      coverFile?: File;
    }
  ) => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const userId = user?.id;

      if (userId) {
        setCurrentUserId(userId);
        const metadata = user?.user_metadata || {};
        const fallbackName =
          profile?.artisticName ||
          metadata.artistic_name ||
          metadata.real_name ||
          user?.email?.split('@')[0] ||
          'Novo artista';
        const metadataNumber = (value: unknown) => {
          if (value === null || value === undefined || value === '') return null;
          const number = Number(value);
          return Number.isFinite(number) ? number : null;
        };
        const registrationAddress = {
          addressStreet: profile?.addressStreet ?? metadata.address_street ?? '',
          addressNumber: profile?.addressNumber ?? metadata.address_number ?? '',
          addressComplement: profile?.addressComplement ?? metadata.address_complement ?? '',
          neighborhood: profile?.neighborhood ?? metadata.neighborhood ?? '',
          postalCode: profile?.postalCode ?? metadata.postal_code ?? '',
          publicNeighborhood: profile?.publicNeighborhood ?? metadata.public_neighborhood ?? '',
          publicAddressLabel: profile?.publicAddressLabel ?? metadata.public_address_label ?? '',
          city: profile?.city ?? metadata.city ?? '',
          state: profile?.state ?? metadata.state ?? '',
          latitude: profile?.latitude ?? metadataNumber(metadata.latitude),
          longitude: profile?.longitude ?? metadataNumber(metadata.longitude),
        };
        const hasRegistrationLocation = Boolean(
          registrationAddress.postalCode ||
            registrationAddress.addressStreet ||
            registrationAddress.latitude !== null
        );

        let loadedProfile =
          (await loadArtistByUserId(userId)) ||
          (await createArtistProfileForCurrentUser({
            artisticName: fallbackName,
            whatsapp: profile?.whatsapp ?? metadata.whatsapp ?? '',
            ...registrationAddress,
          }));

        if (loadedProfile) {
          if (
            hasRegistrationLocation &&
            !loadedProfile.postalCode &&
            !loadedProfile.addressStreet &&
            loadedProfile.latitude == null
          ) {
            loadedProfile = { ...loadedProfile, ...registrationAddress };
            await saveDashboardArtist(loadedProfile);
          }

          if (profile?.avatarFile) {
            const avatar = await uploadProfileImage('avatar', profile.avatarFile);
            loadedProfile = { ...loadedProfile, avatar };
          }

          if (profile?.coverFile) {
            const coverImage = await uploadProfileImage('cover', profile.coverFile);
            loadedProfile = { ...loadedProfile, coverImage };
          }

          if (profile?.avatarFile || profile?.coverFile) {
            await saveDashboardArtist(loadedProfile);
          }

          setArtist(loadedProfile);
          cachePrototypeArtist(loadedProfile);
        }
      }
    }

    if (profile) {
      if (!isSupabaseConfigured) {
        persistArtist(blankArtistFromProfile(profile));
      }
    }
    setIsLoggedIn(true);
    navigate('dashboard', '/dashboard');
  };

  const handleAdminAuthSuccess = async () => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id || null);
    }

    setIsLoggedIn(true);
    navigate('admin', '/admin');
  };

  const handleBookingComplete = async (
    bookingArtist: ArtistProfile,
    appointment: Appointment,
    proofFile?: File
  ) => {
    if (isSupabaseConfigured) {
      let savedAppointment = await createPublicAppointment(bookingArtist, appointment);
      if (!savedAppointment) return null;

      if (proofFile && savedAppointment.depositRequired !== false && savedAppointment.proofUploadToken) {
        const proofUrl = await uploadAppointmentProof(
          savedAppointment.id,
          bookingArtist.id,
          savedAppointment.proofUploadToken,
          proofFile
        );
        savedAppointment = {
          ...savedAppointment,
          pixProof: proofUrl,
          paymentStatus: 'proof_sent',
          depositPaid: false,
        };
      }

      setPublicArtist((prev) => {
        if (!prev || prev.id !== bookingArtist.id) return prev;

        return {
          ...prev,
          appointments: [savedAppointment, ...prev.appointments],
        };
      });

      setArtist((prev) => {
        if (prev.id !== bookingArtist.id) return prev;

        const nextArtist = {
          ...prev,
          appointments: [savedAppointment, ...prev.appointments],
        };
        cachePrototypeArtist(nextArtist);
        return nextArtist;
      });

      return savedAppointment;
    }

    setPublicArtist((prev) => {
      if (!prev || prev.id !== bookingArtist.id) return prev;

      return {
        ...prev,
        appointments: [appointment, ...prev.appointments],
      };
    });

    setArtist((prev) => {
      if (prev.id !== bookingArtist.id) return prev;

      const nextArtist = {
        ...prev,
        appointments: [appointment, ...prev.appointments],
      };
      cachePrototypeArtist(nextArtist);
      return nextArtist;
    });

    return appointment;
  };

  const handleLogout = () => {
    if (isSupabaseConfigured) {
      void signOut();
    }
    setIsLoggedIn(false);
    setCurrentUserId(null);
    navigate('explore', '/');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-sm text-zinc-400">
        Carregando acesso...
      </div>
    );
  }

  switch (view) {
    case 'explore':
      return (
        <ExplorePage
          isLoggedIn={isLoggedIn}
          onLogin={() => navigate('login', '/login')}
          onRegister={() => navigate('register', '/register')}
          onOpenDashboard={() => openDashboardSection('home')}
          onOpenPublicProfile={() => void openOwnPublicProfile()}
          onOpenLanding={() => navigate('landing', '/landing')}
          onOpenArtist={openPublicArtistFromExplore}
        />
      );

    case 'landing':
      return (
        <LandingPage
          isLoggedIn={isLoggedIn}
          onLogin={() => navigate('login', '/login')}
          onRegister={() => navigate('register', '/register')}
          onOpenDashboard={() => openDashboardSection('home')}
          onOpenPublicProfile={() => void openOwnPublicProfile()}
          onViewDemo={() => navigate('public-profile', `/${artist.slug}`)}
        />
      );

    case 'pitch':
      return (
        <PitchPage
          onBack={() => navigate('landing', '/landing')}
          onOpenLanding={() => navigate('landing', '/landing')}
          onRegister={() => navigate('register', '/register')}
        />
      );

    case 'login':
      return (
        <AuthPage
          mode="login"
          onBack={() => navigate('explore', '/')}
          onSuccess={handleAuthSuccess}
          onSwitchMode={(mode) => navigate(mode, `/${mode}`)}
        />
      );

    case 'register':
      return (
        <AuthPage
          mode="register"
          onBack={() => navigate('explore', '/')}
          onSuccess={handleAuthSuccess}
          onSwitchMode={(mode) => navigate(mode, `/${mode}`)}
        />
      );

    case 'dashboard':
      if (isSupabaseConfigured && !isLoggedIn) {
        return (
          <AuthPage
            mode="login"
            onBack={() => navigate('explore', '/')}
            onSuccess={handleAuthSuccess}
            onSwitchMode={(mode) => navigate(mode, `/${mode}`)}
          />
        );
      }

      if (
        isSupabaseConfigured &&
        currentUserId &&
        artist.userId !== currentUserId
      ) {
        return (
          <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-sm text-zinc-400">
            Carregando seu painel...
          </div>
        );
      }

      return (
        <Dashboard
          artist={artist}
          initialSection={dashboardInitialSection}
          onArtistUpdate={(nextArtist) => {
            void persistArtist(nextArtist).catch((error) => {
              console.error('Erro ao salvar alteracao do painel:', error);
            });
          }}
          onOpenExplore={() => navigate('explore', '/')}
          onViewPublicProfile={() => void openOwnPublicProfile()}
          onLogout={handleLogout}
        />
      );

    case 'admin':
      if (isSupabaseConfigured && !isLoggedIn) {
        return (
          <AuthPage
            mode="login"
            onBack={() => navigate('explore', '/')}
            onSuccess={handleAdminAuthSuccess}
            onSwitchMode={(mode) => navigate(mode, `/${mode}`)}
          />
        );
      }

      return (
        <AdminPanel
          onBack={() => navigate('explore', '/')}
          onLogout={handleLogout}
        />
      );

    case 'public-profile': {
      if (publicRouteState === 'loading') {
        const preview = publicArtist?.slug === slugFromPath(routePath) ? publicArtist : null;
        return (
          <div className="min-h-screen bg-[#0a0a0a] text-white">
            <div className={`h-52 bg-white/[0.045] sm:h-72 ${preview ? '' : 'animate-pulse'}`}>
              {preview?.coverImage && (
                <img src={preview.coverImage} alt="" className="h-full w-full object-cover opacity-75" />
              )}
            </div>
            <div className="mx-auto max-w-2xl px-4 sm:px-6">
              <div className="-mt-14 mb-5 flex items-end gap-4">
                <div className={`h-24 w-24 overflow-hidden rounded-3xl border-4 border-white/5 bg-white/[0.07] ${preview ? '' : 'animate-pulse'}`}>
                  {preview?.avatar && (
                    <img src={preview.avatar} alt="" className="h-full w-full object-cover opacity-90" />
                  )}
                </div>
                <div className="mb-3 space-y-2">
                  {preview ? (
                    <>
                      <p className="text-2xl font-black leading-tight">{preview.artisticName}</p>
                      <p className="text-sm text-zinc-400">{preview.city}</p>
                    </>
                  ) : (
                    <>
                      <div className="h-6 w-40 animate-pulse rounded bg-white/[0.07]" />
                      <div className="h-4 w-24 animate-pulse rounded bg-white/[0.05]" />
                    </>
                  )}
                </div>
              </div>
              <div className="h-12 animate-pulse rounded-xl bg-white/[0.045]" />
            </div>
          </div>
        );
      }

      if (publicRouteState === 'not-found') {
        return (
          <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
            <div className="max-w-sm text-center">
              <p className="text-zinc-500 text-sm mb-2">Perfil não encontrado</p>
              <h1 className="text-2xl font-black mb-3">Esse link não está ativo</h1>
              <p className="text-zinc-400 text-sm mb-6">
                Confira o endereço enviado pelo tatuador ou volte para a página inicial.
              </p>
              <button
                onClick={() => navigate('explore', '/')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-5 py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
              >
                Voltar ao início
              </button>
            </div>
          </div>
        );
      }

      const viewedArtist = publicArtist || artist;
      const canEditCurrentProfile = Boolean(
        isLoggedIn &&
          currentUserId &&
          artist.userId === currentUserId &&
          viewedArtist.id === artist.id
      );

      return (
        <PublicProfile
          artist={viewedArtist}
          canEdit={canEditCurrentProfile}
          onArtistUpdate={canEditCurrentProfile ? persistArtist : undefined}
          onProfileImageUploaded={
            canEditCurrentProfile
              ? (kind, url) => applyUploadedProfileImage(viewedArtist.id, kind, url)
              : undefined
          }
          onOpenDashboard={canEditCurrentProfile ? openDashboardSection : undefined}
          onOpenExplore={() => navigate('explore', '/')}
          onBack={() => returnFromPublicProfile(canEditCurrentProfile)}
          onBookingComplete={(appointment, proofFile) =>
            handleBookingComplete(viewedArtist, appointment, proofFile)
          }
        />
      );
    }

    default:
      return null;
  }
}
