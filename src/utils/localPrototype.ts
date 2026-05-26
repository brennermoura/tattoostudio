import { ArtistProfile } from '../types';

const STORAGE_KEY = 'tatuapp:prototype-artist';
const VISITOR_TOKEN_KEY = 'tatuapp:visitor-token';

export function loadStoredArtist(): ArtistProfile | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as ArtistProfile) : null;
  } catch {
    return null;
  }
}

export function saveStoredArtist(artist: ArtistProfile) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(artist));
}

export function clearStoredArtist() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function getOrCreateVisitorToken() {
  const existing = window.localStorage.getItem(VISITOR_TOKEN_KEY);
  if (existing) return existing;

  const token =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(VISITOR_TOKEN_KEY, token);
  return token;
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export async function compressImageFile(file: File, maxSize = 1400, quality = 0.82) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));

  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Nao foi possivel processar a imagem.');
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}
