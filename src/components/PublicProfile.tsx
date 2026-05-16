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
  Loader2,
  Save,
  Star,
  User,
} from 'lucide-react';
import { ArtistProfile } from '../types';
import type { Appointment } from '../types';
import BookingFlow from './BookingFlow';
import { toggleArtistLike } from '../services/artistService';
import { uploadProfileImage } from '../services/uploadService';

interface PublicProfileProps {
  artist: ArtistProfile;
  onBack: () => void;
  canEdit?: boolean;
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

  useEffect(() => {
    setLikeCount(artist.likeCount);
    setViewerLiked(Boolean(artist.viewerLiked));
  }, [artist.id, artist.likeCount, artist.viewerLiked]);

  useEffect(() => {
    setBioDraft(artist.bio);
    setEditingBio(false);
    setProfileError('');
  }, [artist.id, artist.bio]);

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
  const activeScheduleDays =
    artist.customSlots
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
      await applyProfileUpdate({ ...artist, bio: bioDraft.trim() });
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
          <ChevronLeft size={16} />
          Voltar
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
              Voltar ao painel
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-50 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-3 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
      >
        <ChevronLeft size={16} />
        Voltar
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
            {savingProfile ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
            Trocar capa
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={savingProfile}
              onChange={(event) => void handleProfileImageUpload(event.target.files?.[0], 'cover')}
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
            style={{ borderColor: accent }}
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
                  onChange={(event) => void handleProfileImageUpload(event.target.files?.[0], 'avatar')}
                />
              </label>
            )}
          </div>
          <div className="mb-2 min-w-0">
            <h1 className="text-2xl font-black leading-tight truncate">{artist.artisticName}</h1>
            <div className="flex items-center gap-1.5 text-zinc-400 text-sm mt-0.5">
              <MapPin size={13} />
              <span>{artist.city}</span>
            </div>
          </div>
          <button
            onClick={handleLike}
            disabled={liking}
            className="ml-auto mb-2 flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-3 py-2 text-sm font-bold text-zinc-200 hover:bg-white/15 transition-colors disabled:opacity-60"
            aria-label={viewerLiked ? 'Remover curtida' : 'Curtir profissional'}
          >
            <Heart
              size={17}
              className={viewerLiked ? 'text-pink-400' : 'text-zinc-400'}
              fill={viewerLiked ? '#f472b6' : 'none'}
            />
            {likeCount}
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
                  onChange={(event) => setBioDraft(event.target.value.slice(0, 240))}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-white placeholder-zinc-600 outline-none transition-colors focus:border-purple-500"
                  placeholder="Conte em poucas linhas sobre seu estilo, atendimento e proposta."
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-zinc-600">{bioDraft.length}/240</span>
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
                      {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Salvar bio
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="group flex items-start gap-3">
                <p className="flex-1 text-zinc-300 text-sm leading-relaxed">
                  {artist.bio || 'Adicione uma bio para apresentar seu trabalho aos clientes.'}
                </p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditingBio(true)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {artist.bio ? 'Editar' : 'Adicionar'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Styles */}
        {artist.styles.length > 0 && (
          <div className="mb-5 border-l-2 pl-3" style={{ borderColor: `${accent}aa` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
              Estilos
            </p>

            <p className="mt-1 text-sm font-semibold leading-snug text-zinc-300">
              {artist.styles.join(' · ')}
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
                  onClick={() => setSelectedPhotoIndex(index)}
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
                        const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                        return activeScheduleDays.map((d) => names[d]).join(', ');
                      })()
                    : 'A confirmar'}
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
                <p className="text-sm text-zinc-200">{artist.city}</p>
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
          <p className="font-bold text-lg mb-1">Pronto para sua próxima tattoo?</p>
          <p className="text-zinc-400 text-sm mb-4">
            {artist.depositRequired === false
              ? 'Reserve seu horário sem sinal obrigatório · Agenda aberta'
              : 'Reserve seu horário com sinal via Pix · Agenda aberta'}
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
        <div className="text-center pb-8">
          <p className="text-zinc-700 text-xs">
            Powered by{' '}
            <span className="text-zinc-500 font-semibold">TatuApp</span> · tatu.app/{artist.slug}
          </p>
        </div>
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
            className="fixed top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar foto"
          >
            <X size={20} />
          </button>

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

          <img
            src={selectedPhoto.url}
            alt={selectedPhoto.alt}
            className="max-w-full max-h-full rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />

          {artist.portfolio.length > 1 && selectedPhotoIndex !== null && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5 text-xs text-zinc-300">
              {selectedPhotoIndex + 1} / {artist.portfolio.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
