import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { ArtistNotification } from '../types';

type NotificationRow = {
  id: string;
  type: ArtistNotification['type'];
  title: string;
  message: string;
  action: ArtistNotification['action'];
  action_ref: string;
  read_at: string | null;
  created_at: string;
};

const apiBaseUrl = (import.meta.env.VITE_UPLOAD_API_URL || '').replace(/\/+$/, '');

function apiUrl(path: string) {
  if (!apiBaseUrl) throw new Error('API backend nao configurada.');
  return `${apiBaseUrl}${path}`;
}

async function authHeaders() {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase Auth precisa estar configurado.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessao expirada. Entre novamente.');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Nao foi possivel carregar avisos.');
  return data as T;
}

function mapNotification(row: NotificationRow): ArtistNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    action: row.action,
    actionRef: row.action_ref,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function listMyNotifications(): Promise<ArtistNotification[]> {
  const data = await parseResponse<{ notifications: NotificationRow[] }>(
    await fetch(apiUrl('/api/me/notifications'), {
      headers: await authHeaders(),
    })
  );
  return (data.notifications || []).map(mapNotification);
}

export async function markNotificationRead(notificationId: string) {
  await parseResponse(
    await fetch(apiUrl(`/api/me/notifications/${notificationId}/read`), {
      method: 'PATCH',
      headers: await authHeaders(),
    })
  );
}

export async function markAllNotificationsRead() {
  await parseResponse(
    await fetch(apiUrl('/api/me/notifications/read-all'), {
      method: 'POST',
      headers: await authHeaders(),
    })
  );
}
