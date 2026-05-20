import { useEffect, useState } from 'react';
import {
  MapPin,
  ExternalLink,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Camera,
  Heart,
  Home,
  Loader2,
  Plus,
  Save,
  Search,
  Star,
  User,
} from 'lucide-react';
import { ArtistProfile } from '../types';
import type { Appointment } from '../types';
import BookingFlow from './BookingFlow';
import { toggleArtistLike } from '../services/artistService';
import { uploadProfileImage } from '../services/uploadService';
import { useModalHistory } from '../hooks/useModalHistory';
import {
  normalizeProfileBio,
  normalizeProfileBioForSave,
  PROFILE_BIO_MAX,
} from '../utils/profileFormatting';

interface PublicProfileProps {
  artist: ArtistProfile;
  onBack: () => void;
  canEdit?: boolean;
  onOpenDashboard?: (section?: 'home' | 'portfolio' | 'appointments') => void;
  onOpenExplore?: () => void;
  onArtistUpdate?: (artist: ArtistProfile) => void | Promise<void>;
  onBookingComplete: (
    appointment: Appointment,
    proofFile?: File
  ) => Promise<Appointment | null> | Appointment | null;
}

export default function PublicProfile({
  artist,
  onBack,
  canEdit = false,
  onOpenDashboard,
  onOpenExplore,
  onArtistUpdate,
  onBookingComplete,
}: PublicProfileProps) {
  const [showBooking, setShowBooking] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [likeCount, setLikeCount] = useState(artist.likeCount);
  const [viewerLiked, setViewerLiked] = useState(Boolean(artist.viewerLiked));
  const [liking, setLiking] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState(artist.bio);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [mobilePhotoIndex, setMobilePhotoIndex] = useState(0);

  useEffect(() => {
    setLikeCount(artist.likeCount);
    setViewerLiked(Boolean(artist.viewerLiked));
  }, [artist.id, artist.likeCount, artist.viewerLiked]);

  useEffect(() => {
    setBioDraft(artist.bio);
    setEditingBio(false);
    setProfileError('');
  }, [artist.id, artist.bio]);

  useModalHistory(showBooking, () => setShowBooking(false), 'public-profile-booking');
  useModalHistory(
    selectedPhotoIndex !== null,
    () => {
      setSelectedPhotoIndex(null);
      setMobilePhotoIndex(0);
    },
    'public-profile-photo'
  );

  if (showBooking) {
    return (
      <BookingFlow
        artist={artist}
        onBack={() => setShowBooking(false)}
        onComplete={onBookingComplete}
      />
    );
  }

  const instagramUrl = `https://instagram.com/${artist.instagram.replace('@', '')}`;
  const whatsappUrl = `https://wa.me/55${artist.whatsapp.replace(/\D/g, '')}`;
  const accent = artist.accentColor;
  const selectedPhoto =
    selectedPhotoIndex !== null ? artist.portfolio[selectedPhotoIndex] : null;
  const modalPhotos =
    selectedPhotoIndex !== null
      ? [...artist.portfolio.slice(selectedPhotoIndex), ...artist.portfolio.slice(0, selectedPhotoIndex)]
      : artist.portfolio;
  const mobileActualPhotoIndex =
    selectedPhotoIndex !== null && artist.portfolio.length > 0
      ? (selectedPhotoIndex + mobilePhotoIndex) % artist.portfolio.length
      : mobilePhotoIndex;
  const activeScheduleDays =
    artist.dateSlots && Object.keys(artist.dateSlots).length > 0
      ? Array.from(
          new Set(
            Object.entries(artist.dateSlots)
              .filter(([, slots]) => slots.length > 0)
              .map(([date]) => new Date(`${date}T00:00:00`).getDay())
          )
        ).sort()
      : artist.customSlots
      ? Object.entries(artist.customSlots)
          .filter(([, slots]) => slots.length > 0)
          .map(([day]) => Number(day))
      : artist.availableDays;
  const hasProfileContent = Boolean(
    artist.avatar ||
      artist.coverImage ||
      artist.bio ||
      artist.instagram ||
      artist.styles.length > 0 ||
      artist.portfolio.length > 0 ||
      activeScheduleDays.length > 0
  );

  const applyProfileUpdate = async (nextArtist: ArtistProfile) => {
    if (!onArtistUpdate) return;
    await onArtistUpdate(nextArtist);
  };

  const handleProfileImageUpload = async (file: File | undefined, kind: 'avatar' | 'cover') => {
    if (!file || !canEdit || savingProfile) return;

    setSavingProfile(true);
    setProfileError('');

    try {
      const uploadedUrl = await uploadProfileImage(kind, file);
      await applyProfileUpdate({
        ...artist,
        ...(kind === 'avatar' ? { avatar: uploadedUrl } : { coverImage: uploadedUrl }),
      });
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Nao foi possivel enviar a imagem.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleBioSave = async () => {
    if (!canEdit || savingProfile) return;

    setSavingProfile(true);
    setProfileError('');

    try {
      await applyProfileUpdate({ ...artist, bio: normalizeProfileBioForSave(bioDraft) });
      setEditingBio(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Nao foi possivel salvar a bio.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (!hasProfileContent && !canEdit) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white font-inter">
        <button
          onClick={onBack}
          className="fixed top-4 left-4 z-50 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-3 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
        >
          <Home size={16} />
          Home
        </button>

        <div className="min-h-screen px-5 flex items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl shadow-black/30">
            <div
              className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border bg-white/5"
              style={{ borderColor: `${accent}88` }}
            >
              <User size={34} className="text-zinc-400" />
            </div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-600">
              Perfil em configuração
            </p>
            <h1 className="text-2xl font-black">{artist.artisticName}</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Preencha seus dados, envie suas imagens, configure portfólio e agenda antes de
              compartilhar este link com clientes.
            </p>
            <button
              onClick={onBack}
              className="mt-6 w-full rounded-xl bg-white px-5 py-3 text-sm font-black text-black transition-colors hover:bg-zinc-200"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const goToPreviousPhoto = () => {
    if (selectedPhotoIndex === null || artist.portfolio.length === 0) return;
    setSelectedPhotoIndex(
      selectedPhotoIndex === 0 ? artist.portfolio.length - 1 : selectedPhotoIndex - 1
    );
  };

  const goToNextPhoto = () => {
    if (selectedPhotoIndex === null || artist.portfolio.length === 0) return;
    setSelectedPhotoIndex(
      selectedPhotoIndex === artist.portfolio.length - 1 ? 0 : selectedPhotoIndex + 1
    );
  };

  const handleLike = async () => {
    if (liking) return;

    const nextLiked = !viewerLiked;
    setViewerLiked(nextLiked);
    setLikeCount((current) => Math.max(0, current + (nextLiked ? 1 : -1)));
    setLiking(true);

    try {
      const nextStatus = await toggleArtistLike(artist.id);
      if (nextStatus) {
        setViewerLiked(nextStatus.viewerLiked);
        setLikeCount(nextStatus.likeCount);
      }
    } catch {
      setViewerLiked(!nextLiked);
      setLikeCount((current) => Math.max(0, current + (nextLiked ? -1 : 1)));
    } finally {
      setLiking(false);
    }
  };

  const openExplore = onOpenExplore || onBack;
  const portfolioFull = artist.portfolio.length >= 10;
  const publicLocationLabel =
    artist.publicAddressLabel ||
    (artist.publicNeighborhood ? `Próximo ao ${artist.publicNeighborhood}` : artist.city);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-50 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-3 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
      >
        <Home size={16} />
        Home
      </button>

      {/* Cover */}
      <div className="relative h-52 sm:h-72">
        {artist.coverImage ? (
          <img
            src={artist.coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, ${accent}22, #111 60%, #050505)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0a0a0a]" />
        {canEdit && (
          <label className="absolute bottom-5 right-4 sm:right-6 z-10 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/10">
            {savingProfile ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Camera size={15} />
            )}
            Trocar capa
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={savingProfile}
              onChange={(event) =>
                void handleProfileImageUpload(event.target.files?.[0], "cover")
              }
            />
          </label>
        )}
      </div>

      {/* Profile Section */}
      <div className="px-4 sm:px-6 max-w-2xl mx-auto">
        {/* Avatar + Name */}
        <div className="flex items-end gap-4 -mt-14 mb-5 relative z-10">
          <div
            className="relative w-24 h-24 rounded-3xl overflow-hidden border-4 flex-shrink-0 shadow-xl"
            style={{borderColor: accent}}
          >
            {artist.avatar ? (
              <img
                src={artist.avatar}
                alt={artist.artisticName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-2xl font-black text-zinc-500">
                {artist.artisticName.slice(0, 1).toUpperCase()}
              </div>
            )}
            {canEdit && (
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/45 opacity-0 transition-opacity hover:opacity-100">
                {savingProfile ? (
                  <Loader2 size={20} className="animate-spin text-white" />
                ) : (
                  <Camera size={22} className="text-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={savingProfile}
                  onChange={(event) =>
                    void handleProfileImageUpload(
                      event.target.files?.[0],
                      "avatar",
                    )
                  }
                />
              </label>
            )}
          </div>
          <div className="mb-2 min-w-0">
            <h1 className="text-2xl font-black leading-tight truncate">
              {artist.artisticName}
            </h1>
            <div className="flex items-center gap-1.5 text-zinc-400 text-sm mt-0.5">
              <MapPin size={13} />
              <span>{publicLocationLabel}</span>
            </div>
          </div>
          <button
            onClick={handleLike}
            disabled={liking}
            className="ml-auto mb-2 flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-3 py-2 text-sm font-bold text-zinc-200 hover:bg-white/15 transition-colors disabled:opacity-60"
            aria-label={viewerLiked ? "Remover curtida" : "Curtir profissional"}
          >
            <Heart
              size={17}
              className={viewerLiked ? "text-pink-400" : "text-zinc-400"}
              fill={viewerLiked ? "#f472b6" : "none"}
            />
            {likeCount > 0 ? likeCount : "Curtir"}
          </button>
        </div>

        {/* Bio */}
        {profileError && (
          <div className="mb-4 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-xs text-red-200">
            {profileError}
          </div>
        )}

        {(artist.bio || canEdit) && (
          <div className="mb-5">
            {editingBio ? (
              <div className="space-y-2">
                <textarea
                  value={bioDraft}
                  onChange={(event) =>
                    setBioDraft(normalizeProfileBio(event.target.value))
                  }
                  rows={7}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white placeholder-zinc-600 outline-none transition-colors focus:border-purple-500"
                  placeholder={
                    "Blackwork • Fineline • Autoral\n\nAtendo com hora marcada.\nAgenda aberta para junho."
                  }
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-zinc-600">
                    {bioDraft.length}/{PROFILE_BIO_MAX}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBioDraft(artist.bio);
                        setEditingBio(false);
                      }}
                      className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-300 transition-colors hover:bg-white/10"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleBioSave()}
                      disabled={savingProfile}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-black transition-colors hover:bg-zinc-200 disabled:opacity-60"
                    >
                      {savingProfile ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      Salvar bio
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="group flex items-start gap-3">
                <p className="flex-1 whitespace-pre-line text-zinc-300 text-sm leading-relaxed">
                  {artist.bio ||
                    "Adicione uma bio para apresentar seu trabalho aos clientes."}
                </p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditingBio(true)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {artist.bio ? "Editar" : "Adicionar"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Styles */}
        {artist.styles.length > 0 && (
          <div
            className="mb-5 border-l-2 pl-3"
            style={{borderColor: `${accent}aa`}}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
              Estilos
            </p>

            <p className="mt-1 text-sm font-semibold leading-snug text-zinc-300">
              {artist.styles.join(" · ")}
            </p>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setShowBooking(true)}
            className="flex-1 flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg transition-all hover:opacity-90 active:scale-98"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
              boxShadow: `0 8px 32px ${accent}30`,
            }}
          >
            <Calendar size={18} />
            Agendar tattoo
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-white/10 border border-white/10 text-white font-semibold py-3.5 px-4 rounded-xl text-sm hover:bg-white/15 transition-colors"
          >
            <MessageCircle size={18} />
            WhatsApp
          </a>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 mb-8" />

        {/* Portfolio */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-zinc-400" />
              <h2 className="font-bold text-lg">Portfólio</h2>
            </div>
            {artist.instagram && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Ver mais no Instagram
                <ExternalLink size={13} />
              </a>
            )}
          </div>

          {artist.portfolio.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {artist.portfolio.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => {
                    setSelectedPhotoIndex(index);
                    setMobilePhotoIndex(0);
                  }}
                  className="aspect-square rounded-xl overflow-hidden bg-zinc-800 hover:opacity-90 transition-opacity"
                >
                  <img
                    src={photo.url}
                    alt={photo.alt}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-zinc-600">
              <Camera size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Portfólio em construção</p>
            </div>
          )}

          {artist.instagram && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-white/10 text-zinc-300 font-medium py-3 rounded-xl text-sm hover:bg-white/10 transition-colors"
            >
              <ExternalLink size={16} />
              Ver portfólio completo no Instagram
            </a>
          )}
        </div>

        {/* Info */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8">
          <h3 className="font-bold text-sm mb-3">Informações</h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-zinc-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-zinc-500">Dias disponíveis</p>
                <p className="text-sm text-zinc-200">
                  {activeScheduleDays.length > 0
                    ? (() => {
                        const names = [
                          "Dom",
                          "Seg",
                          "Ter",
                          "Qua",
                          "Qui",
                          "Sex",
                          "Sáb",
                        ];
                        return activeScheduleDays
                          .map((d) => names[d])
                          .join(", ");
                      })()
                    : "A confirmar"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Star size={16} className="text-zinc-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-zinc-500">Modelo de agenda</p>
                <p className="text-sm text-zinc-200">
                  Horários personalizados por dia
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-zinc-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-zinc-500">Localização</p>
                <p className="text-sm text-zinc-200">{publicLocationLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Booking CTA bottom */}
        <div
          className="rounded-2xl p-5 mb-10 text-center"
          style={{
            background: `linear-gradient(135deg, ${accent}20, ${accent}08)`,
            border: `1px solid ${accent}30`,
          }}
        >
          <p className="font-bold text-lg mb-1">
            Pronto para sua próxima tattoo?
          </p>
          <p className="text-zinc-400 text-sm mb-4">
            {artist.depositRequired === false
              ? "Reserve seu horário sem sinal obrigatório · Agenda aberta"
              : "Reserve seu horário com sinal via Pix · Agenda aberta"}
          </p>
          <button
            onClick={() => setShowBooking(true)}
            className="w-full font-bold py-3.5 rounded-xl text-white transition-all hover:opacity-90"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
            }}
          >
            Quero agendar agora
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pb-28 md:pb-8">
          <p className="text-zinc-700 text-xs">
            Powered by{" "}
            <span className="text-zinc-500 font-semibold">TatuApp</span> ·
            tatu.app/{artist.slug}
          </p>
        </div>
      </div>

      <div className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/10 bg-black/80 px-2 py-2 shadow-2xl shadow-black/60 backdrop-blur-xl md:hidden">
        {canEdit ? (
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => onOpenDashboard?.("home")}
              className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Home size={18} />
              <span className="truncate">Painel</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenDashboard?.("appointments")}
              className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Calendar size={18} />
              <span className="truncate">Agenda</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!portfolioFull) onOpenDashboard?.("portfolio");
              }}
              disabled={portfolioFull}
              title={
                portfolioFull
                  ? "Voce ja publicou as 10 fotos do portfolio."
                  : "Publicar foto no portfolio"
              }
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold transition-colors ${
                portfolioFull
                  ? "cursor-not-allowed text-zinc-600"
                  : "text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Camera size={18} />
              <span className="truncate">
                {portfolioFull ? "10/10 fotos" : "Publicar"}
              </span>
            </button>
            <button
              type="button"
              onClick={openExplore}
              className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Search size={18} />
              <span className="truncate">Pesquisa</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setShowBooking(true)}
              className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Calendar size={18} />
              <span className="truncate">Agendar</span>
            </button>
            <button
              type="button"
              onClick={() => void handleLike()}
              disabled={liking}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold transition-colors disabled:opacity-60 ${
                viewerLiked
                  ? "text-pink-300"
                  : "text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Heart size={18} fill={viewerLiked ? "#f9a8d4" : "none"} />
              <span className="truncate">
                {viewerLiked ? "Curtido" : "Curtir"}
              </span>
            </button>
            <button
              type="button"
              onClick={openExplore}
              className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Search size={18} />
              <span className="truncate">Pesquisa</span>
            </button>
          </div>
        )}
      </div>

      <div className="fixed bottom-5 left-5 z-40 hidden rounded-2xl border border-white/10 bg-white/5 px-2 py-2 shadow-2xl shadow-black/50 backdrop-blur-xl md:block">
        {canEdit ? (
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenDashboard?.("home")}
              title="Painel"
              aria-label="Painel"
              className="flex w-14 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[9px] font-bold leading-none text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Home size={23} strokeWidth={2.1} />
              <span className="whitespace-nowrap">Painel</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenDashboard?.("appointments")}
              title="Agenda"
              aria-label="Agenda"
              className="flex w-14 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[9px] font-bold leading-none text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Calendar size={23} strokeWidth={2.1} />
              <span className="whitespace-nowrap">Agenda</span>
            </button>

            <button
              type="button"
              onClick={openExplore}
              title="Pesquisa"
              aria-label="Pesquisa"
              className="flex w-14 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[9px] font-bold leading-none text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Search size={24} strokeWidth={2.05} />
              <span className="whitespace-nowrap">Busca</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!portfolioFull) onOpenDashboard?.("portfolio");
              }}
              disabled={portfolioFull}
              title={
                portfolioFull
                  ? "Voce ja publicou as 10 fotos do portfolio."
                  : "Publicar foto"
              }
              aria-label={
                portfolioFull
                  ? "Voce ja publicou as 10 fotos do portfolio."
                  : "Publicar foto"
              }
              className={`flex w-14 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[9px] font-bold leading-none transition-colors ${
                portfolioFull
                  ? "cursor-not-allowed text-zinc-600"
                  : "text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {portfolioFull ? (
                <Camera size={23} strokeWidth={2.05} />
              ) : (
                <Plus size={28} strokeWidth={2} />
              )}
              <span className="whitespace-nowrap">
                {portfolioFull ? "10/10" : "Foto"}
              </span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowBooking(true)}
              title="Agendar"
              aria-label="Agendar"
              className="flex w-14 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[9px] font-bold leading-none text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Calendar size={23} strokeWidth={2.1} />
              <span className="whitespace-nowrap">Agendar</span>
            </button>

            <button
              type="button"
              onClick={() => void handleLike()}
              disabled={liking}
              title={viewerLiked ? "Curtido" : "Curtir"}
              aria-label={viewerLiked ? "Curtido" : "Curtir"}
              className={`flex w-14 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[9px] font-bold leading-none transition-colors disabled:opacity-60 ${
                viewerLiked
                  ? "text-pink-300"
                  : "text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Heart
                size={24}
                strokeWidth={2.05}
                fill={viewerLiked ? "#f9a8d4" : "none"}
              />
              <span className="whitespace-nowrap">
                {viewerLiked ? "Curtido" : "Curtir"}
              </span>
            </button>

            <button
              type="button"
              onClick={openExplore}
              title="Pesquisa"
              aria-label="Pesquisa"
              className="flex w-14 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[9px] font-bold leading-none text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Search size={24} strokeWidth={2.05} />
              <span className="whitespace-nowrap">Busca</span>
            </button>
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhotoIndex(null)}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedPhotoIndex(null);
            }}
            className="fixed top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar foto"
          >
            <X size={20} />
          </button>

          <div
            className="md:hidden fixed inset-0 pt-16 pb-14"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none]"
              onScroll={(event) => {
                const width = event.currentTarget.clientWidth || 1;
                const index = Math.round(
                  event.currentTarget.scrollLeft / width,
                );
                setMobilePhotoIndex(
                  Math.max(0, Math.min(index, modalPhotos.length - 1)),
                );
              }}
            >
              {modalPhotos.map((photo, index) => (
                <div
                  key={`${photo.id}-${index}`}
                  className="flex h-full w-full shrink-0 snap-center items-center justify-center px-4"
                >
                  <img
                    src={photo.url}
                    alt={photo.alt}
                    className="max-h-full max-w-full rounded-2xl object-contain"
                  />
                </div>
              ))}
            </div>

            {artist.portfolio.length > 1 && (
              <>
                <div className="fixed top-4 left-4 z-10 rounded-full bg-black/60 px-3 py-2 text-xs text-zinc-300 backdrop-blur-sm border border-white/10">
                  {mobileActualPhotoIndex + 1} / {artist.portfolio.length}
                </div>
                <div className="fixed bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 px-3 py-2 backdrop-blur-sm border border-white/10">
                  {modalPhotos.map((photo, index) => (
                    <span
                      key={`${photo.id}-dot`}
                      className={`h-1.5 rounded-full transition-all ${
                        index === mobilePhotoIndex
                          ? "w-5 bg-white"
                          : "w-1.5 bg-white/35"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="hidden max-h-[88vh] max-w-[88vw] items-center justify-center md:flex">
            {artist.portfolio.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goToPreviousPhoto();
                  }}
                  className="fixed left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goToNextPhoto();
                  }}
                  className="fixed right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Próxima foto"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}

            <div
              className="relative max-h-[88vh] max-w-[88vw]"
              onClick={(event) => event.stopPropagation()}
            >
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.alt}
                className="block max-h-[88vh] max-w-[88vw] rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
              />

              {artist.portfolio.length > 1 && selectedPhotoIndex !== null && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur-sm">
                  {selectedPhotoIndex + 1} / {artist.portfolio.length}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
