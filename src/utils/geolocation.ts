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
