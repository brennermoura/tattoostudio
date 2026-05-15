export type BrazilianStateOption = {
  name: string;
  uf: 'RJ' | 'SP';
  region: 'Sudeste';
};

export type BrazilianCityOption = {
  name: string;
  state: string;
  uf: BrazilianStateOption['uf'];
};

export const FEATURED_BRAZILIAN_STATES: BrazilianStateOption[] = [
  { name: 'Rio de Janeiro', uf: 'RJ', region: 'Sudeste' },
  { name: 'São Paulo', uf: 'SP', region: 'Sudeste' },
];

const IBGE_CITY_API_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';

const FALLBACK_CITY_OPTIONS: BrazilianCityOption[] = [
  { name: 'Rio de Janeiro', state: 'Rio de Janeiro', uf: 'RJ' },
  { name: 'Niterói', state: 'Rio de Janeiro', uf: 'RJ' },
  { name: 'Duque de Caxias', state: 'Rio de Janeiro', uf: 'RJ' },
  { name: 'Nova Iguaçu', state: 'Rio de Janeiro', uf: 'RJ' },
  { name: 'São Gonçalo', state: 'Rio de Janeiro', uf: 'RJ' },
  { name: 'São Paulo', state: 'São Paulo', uf: 'SP' },
  { name: 'Campinas', state: 'São Paulo', uf: 'SP' },
  { name: 'Guarulhos', state: 'São Paulo', uf: 'SP' },
  { name: 'Osasco', state: 'São Paulo', uf: 'SP' },
  { name: 'Santos', state: 'São Paulo', uf: 'SP' },
];

let cachedCityOptions: BrazilianCityOption[] | null = null;

export function normalizeLocationTerm(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function stateLabel(state: BrazilianStateOption) {
  return `${state.name} (${state.uf})`;
}

export function cityLabel(city: BrazilianCityOption) {
  return city.name;
}

export function searchBrazilianStates(term: string) {
  const cleanTerm = normalizeLocationTerm(term);
  if (!cleanTerm) return FEATURED_BRAZILIAN_STATES;

  return FEATURED_BRAZILIAN_STATES.filter((state) => {
    const stateName = normalizeLocationTerm(state.name);
    const stateUf = normalizeLocationTerm(state.uf);

    return stateName.includes(cleanTerm) || stateUf.startsWith(cleanTerm);
  });
}

export function inferBrazilianStateFromText(value: string) {
  const cleanValue = normalizeLocationTerm(value);
  if (!cleanValue) return '';

  const tokens = cleanValue.split(/[^a-z]+/).filter(Boolean);
  const match = FEATURED_BRAZILIAN_STATES.find((state) => {
    const stateName = normalizeLocationTerm(state.name);
    const stateUf = normalizeLocationTerm(state.uf);

    return cleanValue.includes(stateName) || tokens.includes(stateUf);
  });

  return match?.name ?? '';
}

export function normalizeBrazilianState(value: string) {
  const cleanValue = normalizeLocationTerm(value);
  if (!cleanValue) return '';

  const match = FEATURED_BRAZILIAN_STATES.find((state) => {
    const stateName = normalizeLocationTerm(state.name);
    const stateUf = normalizeLocationTerm(state.uf);

    return cleanValue === stateName || cleanValue === stateUf;
  });

  return match?.name ?? value.trim();
}

export async function loadFeaturedBrazilianCities() {
  if (cachedCityOptions) return cachedCityOptions;

  try {
    const cityGroups = await Promise.all(
      FEATURED_BRAZILIAN_STATES.map(async (state) => {
        const response = await fetch(`${IBGE_CITY_API_BASE}/${state.uf}/municipios`);

        if (!response.ok) {
          throw new Error(`IBGE city API failed for ${state.uf}`);
        }

        const cities = (await response.json()) as Array<{ nome: string }>;

        return cities.map((city) => ({
          name: city.nome,
          state: state.name,
          uf: state.uf,
        }));
      })
    );

    cachedCityOptions = cityGroups.flat().sort((a, b) => {
      const stateCompare = a.uf.localeCompare(b.uf);
      if (stateCompare !== 0) return stateCompare;

      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.warn('Nao foi possivel carregar cidades do IBGE:', error);
    cachedCityOptions = FALLBACK_CITY_OPTIONS;
  }

  return cachedCityOptions;
}

export function searchBrazilianCities(
  cities: BrazilianCityOption[],
  term: string,
  stateTerm = ''
) {
  const cleanTerm = normalizeLocationTerm(term);
  const cleanStateTerm = normalizeLocationTerm(stateTerm);
  if (!cleanStateTerm) return [];

  const matchedState = cleanStateTerm ? normalizeBrazilianState(stateTerm) : '';
  const cleanMatchedState = normalizeLocationTerm(matchedState);

  return cities.filter((city) => {
    const cityName = normalizeLocationTerm(city.name);
    const cityState = normalizeLocationTerm(city.state);
    const cityUf = normalizeLocationTerm(city.uf);
    const matchesCity =
      !cleanTerm || cityName.includes(cleanTerm) || cityState.includes(cleanTerm);
    const matchesState =
      !cleanStateTerm ||
      cityState.includes(cleanStateTerm) ||
      cityUf.startsWith(cleanStateTerm) ||
      cityState === cleanMatchedState;

    return matchesCity && matchesState;
  });
}
