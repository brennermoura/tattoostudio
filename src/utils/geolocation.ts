import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type GeocodeAddressInput = {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

export type PostalCodeAddress = {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
};

export type ResolvedStudioLocation = PostalCodeAddress &
  Coordinates;

const BRAZILIAN_STATE_NAMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

const apiBaseUrl = (import.meta.env.VITE_UPLOAD_API_URL || '').replace(/\/+$/, '');

async function publicApiRequest(path: string, options: RequestInit = {}) {
  if (!apiBaseUrl) {
    throw new Error('API nao configurada para consultar localizacao.');
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Nao foi possivel consultar localizacao.');
  return payload;
}

async function authenticatedApiRequest(path: string, options: RequestInit = {}) {
  if (!isSupabaseConfigured || !supabase || !apiBaseUrl) {
    throw new Error('API autenticada nao configurada para consultar localizacao.');
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Entre novamente para configurar o endereco.');
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Nao foi possivel consultar localizacao.');
  return payload;
}

export function cleanBrazilianPostalCode(value: string) {
  return value.replace(/\D/g, '').slice(0, 8);
}

export function formatBrazilianPostalCode(value: string) {
  const digits = cleanBrazilianPostalCode(value);
  if (digits.length <= 5) return digits;

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function requestBrowserLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalizacao nao esta disponivel neste navegador.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('Permita a localizacao no navegador para ver tatuadores perto de voce.'));
          return;
        }

        if (error.code === error.TIMEOUT) {
          reject(new Error('A localizacao demorou para responder. Ative a localizacao do celular e tente novamente.'));
          return;
        }

        reject(new Error('Ative a localizacao do celular e tente novamente.'));
      },
      {
        enableHighAccuracy: false,
        maximumAge: 1000 * 60 * 10,
        timeout: 15000,
      }
    );
  });
}

export function distanceInKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const latDistance = degreesToRadians(to.latitude - from.latitude);
  const lonDistance = degreesToRadians(to.longitude - from.longitude);
  const fromLat = degreesToRadians(from.latitude);
  const toLat = degreesToRadians(to.latitude);

  const haversine =
    Math.sin(latDistance / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDistance / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

export async function lookupBrazilianPostalCode(postalCode: string): Promise<PostalCodeAddress> {
  const cleanPostalCode = cleanBrazilianPostalCode(postalCode);

  if (cleanPostalCode.length !== 8) {
    throw new Error('Informe um CEP com 8 digitos.');
  }

  const data = (await publicApiRequest(`/api/public/location/postal-code/${cleanPostalCode}`)) as {
    street?: string;
    neighborhood?: string;
    city?: string;
    stateCode?: string;
    postalCode?: string;
  };
  const uf = data.stateCode?.trim().toUpperCase() ?? '';

  return {
    street: data.street?.trim() ?? '',
    neighborhood: data.neighborhood?.trim() ?? '',
    city: data.city?.trim() ?? '',
    state: BRAZILIAN_STATE_NAMES[uf] ?? uf,
    postalCode: data.postalCode?.trim() || formatBrazilianPostalCode(cleanPostalCode),
  };
}

export async function geocodePublicBrazilianAddress(input: GeocodeAddressInput): Promise<Coordinates> {
  const result = (await publicApiRequest('/api/public/location/geocode', {
    method: 'POST',
    body: JSON.stringify(input),
  })) as Coordinates;
  const latitude = Number(result.latitude);
  const longitude = Number(result.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Nao encontrei esse endereco. Confira o CEP e o numero.');
  }

  return { latitude, longitude };
}

export async function reverseGeocodeBrazilianLocation(
  location: Coordinates
): Promise<ResolvedStudioLocation> {
  const data = (await publicApiRequest('/api/public/location/reverse', {
    method: 'POST',
    body: JSON.stringify(location),
  })) as {
    street?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };
  const uf = data.stateCode?.trim().toUpperCase() ?? '';
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);

  if (!data.city || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Nao foi possivel identificar o endereco da sua localizacao.');
  }

  return {
    street: data.street?.trim() ?? '',
    neighborhood: data.neighborhood?.trim() ?? '',
    city: data.city.trim(),
    state: BRAZILIAN_STATE_NAMES[uf] ?? data.state?.trim() ?? uf,
    postalCode: data.postalCode?.trim() ?? '',
    latitude,
    longitude,
  };
}

export async function geocodeBrazilianAddress(input: GeocodeAddressInput): Promise<Coordinates> {
  const queryParts = [
    [input.street, input.number].filter(Boolean).join(', '),
    input.neighborhood,
    input.city,
    input.state,
    input.postalCode,
    'Brasil',
  ]
    .map((part) => part?.trim())
    .filter(Boolean);

  if (queryParts.length < 4) {
    throw new Error('Preencha rua, numero, bairro, cidade e estado para gerar a localizacao.');
  }

  const result = (await authenticatedApiRequest('/api/me/location/geocode', {
    method: 'POST',
    body: JSON.stringify(input),
  })) as Coordinates;
  const latitude = Number(result.latitude);
  const longitude = Number(result.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Nao encontrei esse endereco. Confira rua, numero, bairro, cidade e estado.');
  }

  return { latitude, longitude };
}
