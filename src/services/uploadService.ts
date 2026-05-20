import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { PortfolioPhoto } from '../types';

const uploadApiUrl = (import.meta.env.VITE_UPLOAD_API_URL || '').replace(/\/+$/, '');

type UploadResponse = {
  url: string;
  filePath: string;
  id?: string;
  alt?: string;
  caption?: string;
};

async function compressImageForUpload(file: File, maxSize = 1600, quality = 0.82) {
  if (!file.type.startsWith('image/')) return file;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));

  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Nao foi possivel processar a imagem.');
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });

  if (!blob) {
    throw new Error('Nao foi possivel compactar a imagem.');
  }

  const safeName = file.name.replace(/\.[^.]+$/, '') || 'imagem';
  return new File([blob], `${safeName}.jpg`, { type: 'image/jpeg' });
}

async function authHeaders() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase precisa estar configurado para upload autenticado.');
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Sessao expirada. Entre novamente.');
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Falha no upload.');
  }

  return data as UploadResponse;
}

function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${uploadApiUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function uploadProfileImage(kind: 'avatar' | 'cover', file: File) {
  const uploadFile = await compressImageForUpload(file, kind === 'avatar' ? 1000 : 1800);
  const formData = new FormData();
  formData.append('file', uploadFile);

  const response = await fetch(apiUrl(`/api/uploads/profile/${kind}`), {
    method: 'POST',
    headers: await authHeaders(),
    body: formData,
  });

  const data = await parseResponse(response);
  return data.url || data.filePath;
}

export async function uploadPortfolioPhoto(file: File): Promise<PortfolioPhoto> {
  const uploadFile = await compressImageForUpload(file, 1600);
  const formData = new FormData();
  formData.append('file', uploadFile);

  const response = await fetch(apiUrl('/api/uploads/portfolio'), {
    method: 'POST',
    headers: await authHeaders(),
    body: formData,
  });

  const data = await parseResponse(response);
  return {
    id: data.id || crypto.randomUUID(),
    url: data.url || data.filePath,
    alt: data.alt || file.name,
    caption: data.caption || '',
  };
}

export async function deletePortfolioPhoto(photoId: string) {
  const response = await fetch(apiUrl(`/api/uploads/portfolio/${photoId}`), {
    method: 'DELETE',
    headers: await authHeaders(),
  });

  await parseResponse(response);
}

export async function uploadAppointmentProof(appointmentId: string, artistId: string, file: File) {
  const uploadFile = await compressImageForUpload(file, 1800);
  const formData = new FormData();
  formData.append('file', uploadFile);
  formData.append('artistId', artistId);

  const response = await fetch(apiUrl(`/api/uploads/appointments/${appointmentId}/proof`), {
    method: 'POST',
    body: formData,
  });

  const data = await parseResponse(response);
  return data.url || data.filePath;
}

export async function openPrivateAppointmentFile(url: string) {
  const response = await fetch(apiUrl(url), {
    headers: await authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Nao foi possivel abrir o comprovante.');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
