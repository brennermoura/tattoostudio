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

  const response = await fetch(`https://viacep.com.br/ws/${cleanPostalCode}/json/`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Nao foi possivel consultar esse CEP agora.');
  }

  const data = (await response.json()) as {
    erro?: boolean;
    cep?: string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };

  if (data.erro) {
    throw new Error('CEP nao encontrado. Confira os numeros e tente novamente.');
  }

  const uf = data.uf?.trim().toUpperCase() ?? '';

  return {
    street: data.logradouro?.trim() ?? '',
    neighborhood: data.bairro?.trim() ?? '',
    city: data.localidade?.trim() ?? '',
    state: BRAZILIAN_STATE_NAMES[uf] ?? uf,
    postalCode: data.cep?.trim() || formatBrazilianPostalCode(cleanPostalCode),
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

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'br');
  url.searchParams.set('q', queryParts.join(', '));

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Nao foi possivel consultar esse endereco agora.');
  }

  const results = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  const firstResult = results[0];
  const latitude = firstResult?.lat ? Number(firstResult.lat) : Number.NaN;
  const longitude = firstResult?.lon ? Number(firstResult.lon) : Number.NaN;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Nao encontrei esse endereco. Confira rua, numero, bairro, cidade e estado.');
  }

  return { latitude, longitude };
}
