import { useState } from 'react';
import { Trash2, Plus, ExternalLink } from 'lucide-react';
import { ArtistProfile, PortfolioPhoto } from '../../types';
import { compressImageFile } from '../../utils/localPrototype';
import { isSupabaseConfigured } from '../../lib/supabase';
import { deletePortfolioPhoto, uploadPortfolioPhoto } from '../../services/uploadService';

const MAX_PHOTOS = 10;

interface PortfolioEditorProps {
  artist: ArtistProfile;
  onUpdate: (artist: ArtistProfile) => void;
}

export default function PortfolioEditor({ artist, onUpdate }: PortfolioEditorProps) {
  const [photos, setPhotos] = useState<PortfolioPhoto[]>(artist.portfolio);
  const [saved, setSaved] = useState(false);
  // dragging state placeholder for future drag-to-reorder feature
const dragging: string | null = null;

  const handleDelete = async (id: string) => {
    if (isSupabaseConfigured) {
      try {
        await deletePortfolioPhoto(id);
      } catch (error) {
        console.error('Erro ao remover foto:', error);
        alert(error instanceof Error ? error.message : 'Nao foi possivel remover a foto.');
        return;
      }
    }

    const updated = photos.filter((p) => p.id !== id);
    setPhotos(updated);
    onUpdate({ ...artist, portfolio: updated });
  };

  const handleSave = () => {
    onUpdate({ ...artist, portfolio: photos });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const canAdd = photos.length < MAX_PHOTOS;

  const handleAddPhoto = async (file: File | undefined) => {
    if (!canAdd || !file) return;

    let newPhoto: PortfolioPhoto;
    try {
      newPhoto = isSupabaseConfigured
        ? await uploadPortfolioPhoto(file)
        : {
            id: `p${Date.now()}`,
            url: await compressImageFile(file, 1400, 0.82),
            alt: file.name,
          };
    } catch (error) {
      console.error('Erro ao enviar foto:', error);
      alert(error instanceof Error ? error.message : 'Nao foi possivel enviar a foto.');
      return;
    }

    const updated = [...photos, newPhoto];
    setPhotos(updated);
    onUpdate({ ...artist, portfolio: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Portfólio</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Seus melhores trabalhos em destaque. Máximo {MAX_PHOTOS} fotos.
        </p>
      </div>

      {/* Usage bar */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-300 font-medium">
            {photos.length} de {MAX_PHOTOS} fotos
          </span>
          <span className={`text-xs font-medium ${photos.length >= MAX_PHOTOS ? 'text-red-400' : 'text-zinc-500'}`}>
            {MAX_PHOTOS - photos.length} restantes
          </span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full">
          <div
            className={`h-1.5 rounded-full transition-all ${
              photos.length >= MAX_PHOTOS
                ? 'bg-red-500'
                : photos.length >= 8
                ? 'bg-yellow-500'
                : 'bg-purple-500'
            }`}
            style={{ width: `${(photos.length / MAX_PHOTOS) * 100}%` }}
          />
        </div>
        <p className="text-zinc-600 text-xs mt-2">
          Limite de 10 fotos mantém o site rápido e o visual bonito. Para mais trabalhos, use seu Instagram.
        </p>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className={`relative group aspect-square rounded-2xl overflow-hidden bg-zinc-800 ${
              dragging === photo.id ? 'opacity-50 scale-95' : ''
            } transition-all`}
          >
            <img
              src={photo.url}
              alt={photo.alt}
              className="w-full h-full object-cover"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => handleDelete(photo.id)}
                className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center hover:bg-red-500 transition-colors"
              >
                <Trash2 size={16} className="text-white" />
              </button>
            </div>
            {/* Index */}
            <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-xs font-bold text-white">
              {index + 1}
            </div>
          </div>
        ))}

        {/* Add button */}
        {canAdd && (
          <label
            className="aspect-square rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:border-purple-500/50 hover:text-purple-400 transition-all"
          >
            <Plus size={24} />
            <span className="text-xs font-medium">Adicionar</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleAddPhoto(e.target.files?.[0])}
            />
          </label>
        )}
      </div>

      {/* Tips */}
      <div className="bg-purple-950/20 border border-purple-900/30 rounded-2xl p-4 space-y-2">
        <h3 className="font-semibold text-purple-300 text-sm">💡 Dicas de portfólio</h3>
        <ul className="space-y-1.5">
          {[
            'Use apenas seus melhores trabalhos recentes',
            'Fotos com boa iluminação vendem muito mais',
            'Varie os estilos para mostrar versatilidade',
            'Para mais fotos, direcione para seu Instagram',
          ].map((tip, i) => (
            <li key={i} className="text-zinc-400 text-xs flex items-start gap-2">
              <span className="text-purple-500 flex-shrink-0">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Instagram link */}
      {artist.instagram && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">ig</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200">{artist.instagram}</p>
            <p className="text-xs text-zinc-500">Link para mais trabalhos ativado no perfil</p>
          </div>
          <ExternalLink size={16} className="text-zinc-500 flex-shrink-0" />
        </div>
      )}

      <button
        onClick={handleSave}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
      >
        {saved ? '✓ Portfólio salvo!' : 'Salvar portfólio'}
      </button>
    </div>
  );
}
