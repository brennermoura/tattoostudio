import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { slugify } from '../utils/localPrototype';

export type RegisterArtistInput = {
  email: string;
  password: string;
  artisticName: string;
  whatsapp: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  postalCode?: string;
  publicNeighborhood?: string;
  publicAddressLabel?: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
};

type AuthResult = {
  user: User | null;
  session: Session | null;
};

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase ainda não está configurado.');
  }

  return supabase;
}

function appUrl(path = '') {
  return `${window.location.origin}${path}`;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    user: data.user,
    session: data.session,
  };
}

export async function signUpArtist(input: RegisterArtistInput): Promise<AuthResult> {
  const client = requireSupabase();
  const slug = slugify(input.artisticName);
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: appUrl('/dashboard'),
      data: {
        role: 'artist',
        slug,
        artistic_name: input.artisticName,
        real_name: input.artisticName,
        whatsapp: input.whatsapp,
        address_street: input.addressStreet ?? '',
        address_number: input.addressNumber ?? '',
        address_complement: input.addressComplement ?? '',
        neighborhood: input.neighborhood ?? '',
        postal_code: input.postalCode ?? '',
        public_neighborhood: input.publicNeighborhood ?? '',
        public_address_label: input.publicAddressLabel ?? '',
        city: input.city,
        state: input.state,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    user: data.user,
    session: data.session,
  };
}

export async function sendPasswordResetEmail(email: string) {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: appUrl('/login?recovery=1'),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePassword(password: string) {
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ password });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}
