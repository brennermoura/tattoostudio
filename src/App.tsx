import { useEffect, useState } from 'react';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import PublicProfile from './components/PublicProfile';
import AdminPanel from './components/AdminPanel';
import ExplorePage from './components/ExplorePage';
import { ArtistProfile, Appointment } from './types';
import { mockArtist } from './data/mockData';
import { loadStoredArtist, saveStoredArtist, slugify } from './utils/localPrototype';
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

type AppView = 'explore' | 'landing' | 'login' | 'register' | 'dashboard' | 'admin' | 'public-profile';

function viewFromPath(pathname: string): AppView {
  if (pathname === '/' || pathname === '/explorar') return 'explore';
  if (pathname === '/landing') return 'landing';
  if (pathname === '/login') return 'login';
  if (pathname === '/register') return 'register';
  if (pathname === '/dashboard') return 'dashboard';
  if (pathname === '/admin') return 'admin';
  if (pathname !== '/') return 'public-profile';
  return 'explore';
}

function slugFromPath(pathname: string) {
  const slug = pathname.replace(/^\/+/, '').split('/')[0];
  return slug && !['explorar', 'landing', 'login', 'register', 'dashboard', 'admin'].includes(slug) ? slug : '';
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
    blockedDates: profile.blockedDates || [],
    appointments: profile.appointments || [],
    likeCount: profile.likeCount || 0,
    viewerLiked: profile.viewerLiked || false,
  };
}

export default function App() {
  const [view, setView] = useState<AppView>(() => viewFromPath(window.location.pathname));
  const [artist, setArtist] = useState<ArtistProfile>(mockArtist);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [publicRouteState, setPublicRouteState] = useState<'idle' | 'loading' | 'found' | 'not-found'>('idle');

  useEffect(() => {
    const storedArtist = loadStoredArtist();
    if (storedArtist) {
      setArtist(storedArtist);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;

    const loadSession = async () => {
      const { data } = await client.auth.getSession();
      const userId = data.session?.user.id;

      if (userId) {
        setIsLoggedIn(true);
        const profile = await loadArtistByUserId(userId);
        if (profile) {
          setArtist(profile);
          saveStoredArtist(profile);
        }
      }

      setAuthReady(true);
    };

    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        return;
      }

      if (session?.user) {
        setIsLoggedIn(true);
        void loadArtistByUserId(session.user.id).then((profile) => {
          if (!profile) return;
          setArtist(profile);
          saveStoredArtist(profile);
        });
      }
    });

    void loadSession();

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadRouteArtist = async () => {
      if (view !== 'public-profile') {
        setPublicRouteState('idle');
        return;
      }

      const slug = slugFromPath(window.location.pathname);
      if (!slug) {
        setPublicRouteState('idle');
        return;
      }

      setPublicRouteState('loading');

      const publicArtist = await loadPublicArtistBySlug(slug);
      if (publicArtist) {
        setArtist(publicArtist);
        setPublicRouteState('found');
        return;
      }

      if (isSupabaseConfigured) {
        setPublicRouteState('not-found');
        return;
      }

      setPublicRouteState('found');
    };

    void loadRouteArtist();
  }, [view]);

  useEffect(() => {
    const handlePopState = () => {
      setView(viewFromPath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (nextView: AppView, path: string) => {
    window.history.pushState({}, '', path);
    setView(nextView);
  };

  const persistArtist = (nextArtist: ArtistProfile) => {
    setArtist(nextArtist);
    saveStoredArtist(nextArtist);

    if (isSupabaseConfigured && isLoggedIn) {
      void saveDashboardArtist(nextArtist).catch((error) => {
        console.error('Erro ao salvar dados do dashboard:', error);
      });
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
        const metadata = user?.user_metadata || {};
        const fallbackName =
          profile?.artisticName ||
          metadata.artistic_name ||
          metadata.real_name ||
          user?.email?.split('@')[0] ||
          'Novo artista';

        let loadedProfile =
          (await loadArtistByUserId(userId)) ||
          (await createArtistProfileForCurrentUser({
            artisticName: fallbackName,
            whatsapp: profile?.whatsapp ?? metadata.whatsapp ?? '',
            city: profile?.city ?? metadata.city ?? '',
            state: profile?.state ?? metadata.state ?? '',
            latitude: profile?.latitude ?? null,
            longitude: profile?.longitude ?? null,
          }));

        if (loadedProfile) {
          if (profile?.avatarFile) {
            const avatar = await uploadProfileImage('avatar', profile.avatarFile);
            loadedProfile = { ...loadedProfile, avatar };
          }

          if (profile?.coverFile) {
            const coverImage = await uploadProfileImage('cover', profile.coverFile);
            loadedProfile = { ...loadedProfile, coverImage };
          }

          setArtist(loadedProfile);
          saveStoredArtist(loadedProfile);
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

  const handleBookingComplete = async (appointment: Appointment, proofFile?: File) => {
    if (isSupabaseConfigured) {
      let savedAppointment = await createPublicAppointment(artist, appointment);
      if (!savedAppointment) return null;

      if (proofFile && artist.depositRequired !== false && !appointment.depositCreditUsed) {
        const proofUrl = await uploadAppointmentProof(savedAppointment.id, artist.id, proofFile);
        savedAppointment = { ...savedAppointment, pixProof: proofUrl };
      }

      setArtist((prev) => {
        const nextArtist = {
          ...prev,
          appointments: [savedAppointment, ...prev.appointments],
        };
        saveStoredArtist(nextArtist);
        return nextArtist;
      });

      return savedAppointment;
    }

    setArtist((prev) => {
      const nextArtist = {
        ...prev,
        appointments: [appointment, ...prev.appointments],
      };
      saveStoredArtist(nextArtist);
      return nextArtist;
    });

    return appointment;
  };

  const handleLogout = () => {
    if (isSupabaseConfigured) {
      void signOut();
    }
    setIsLoggedIn(false);
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
          onLogin={() => navigate('login', '/login')}
          onRegister={() => navigate('register', '/register')}
          onOpenLanding={() => navigate('landing', '/landing')}
          onOpenArtist={(slug) => navigate('public-profile', `/${slug}`)}
        />
      );

    case 'landing':
      return (
        <LandingPage
          onLogin={() => navigate('login', '/login')}
          onRegister={() => navigate('register', '/register')}
          onViewDemo={() => navigate('public-profile', `/${artist.slug}`)}
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

      return (
        <Dashboard
          artist={artist}
          onArtistUpdate={persistArtist}
          onViewPublicProfile={() => navigate('public-profile', `/${artist.slug}`)}
          onLogout={handleLogout}
        />
      );

    case 'admin':
      if (isSupabaseConfigured && !isLoggedIn) {
        return (
          <AuthPage
            mode="login"
            onBack={() => navigate('explore', '/')}
            onSuccess={async (profile) => {
              await handleAuthSuccess(profile);
              navigate('admin', '/admin');
            }}
            onSwitchMode={(mode) => navigate(mode, `/${mode}`)}
          />
        );
      }

      return (
        <AdminPanel
          onBack={() => navigate('dashboard', '/dashboard')}
          onLogout={handleLogout}
        />
      );

    case 'public-profile':
      if (publicRouteState === 'loading') {
        return (
          <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-sm text-zinc-400">
            Carregando perfil...
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

      return (
        <PublicProfile
          artist={artist}
          onBack={() => navigate(isLoggedIn ? 'dashboard' : 'explore', isLoggedIn ? '/dashboard' : '/')}
          onBookingComplete={handleBookingComplete}
        />
      );

    default:
      return null;
  }
}
