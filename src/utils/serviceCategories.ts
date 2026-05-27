import type { ArtistProfile, ProfileType, ServiceCategory } from '../types';

export const PROFILE_TYPES: Array<{ value: ProfileType; label: string; description: string }> = [
  {
    value: 'professional',
    label: 'Profissional',
    description: 'Atendimento individual',
  },
  {
    value: 'studio',
    label: 'Estudio',
    description: 'Espaco com agenda propria',
  },
];

export const SERVICE_CATEGORIES: Array<{ value: ServiceCategory; label: string; shortLabel: string }> = [
  { value: 'tattoo', label: 'Tatuagem', shortLabel: 'Tattoo' },
  { value: 'piercing', label: 'Body piercing', shortLabel: 'Piercing' },
];

export function normalizeProfileType(value: unknown): ProfileType {
  return value === 'studio' ? 'studio' : 'professional';
}

export function normalizeServiceCategories(value: unknown): ServiceCategory[] {
  const values = Array.isArray(value) ? value : [];
  const unique = Array.from(
    new Set(values.filter((item): item is ServiceCategory => item === 'tattoo' || item === 'piercing'))
  );

  return unique.length > 0 ? unique : ['tattoo'];
}

export function hasServiceCategory(
  artist: Pick<ArtistProfile, 'serviceCategories'>,
  category: ServiceCategory
) {
  return normalizeServiceCategories(artist.serviceCategories).includes(category);
}

export function getProfileTypeLabel(type: ProfileType) {
  return type === 'studio' ? 'Estudio' : 'Profissional';
}

export function getServiceCategoryLabel(category: ServiceCategory) {
  return category === 'piercing' ? 'Body piercing' : 'Tatuagem';
}

export function getServiceCategoryShortLabel(category: ServiceCategory) {
  return category === 'piercing' ? 'Piercing' : 'Tattoo';
}

export function getServiceSummaryLabel(artist: Pick<ArtistProfile, 'serviceCategories'>) {
  const categories = normalizeServiceCategories(artist.serviceCategories);
  if (categories.includes('tattoo') && categories.includes('piercing')) return 'Tattoo + Piercing';
  return getServiceCategoryShortLabel(categories[0]);
}

export function getBookingCtaLabel(artist: Pick<ArtistProfile, 'serviceCategories'>) {
  const categories = normalizeServiceCategories(artist.serviceCategories);
  if (categories.includes('tattoo') && categories.includes('piercing')) return 'Agendar procedimento';
  if (categories.includes('piercing')) return 'Agendar piercing';
  return 'Agendar tattoo';
}

export function getNextProcedureLabel(artist: Pick<ArtistProfile, 'serviceCategories'>) {
  const categories = normalizeServiceCategories(artist.serviceCategories);
  if (categories.includes('tattoo') && categories.includes('piercing')) return 'Pronto para seu proximo procedimento?';
  if (categories.includes('piercing')) return 'Pronto para seu proximo piercing?';
  return 'Pronto para sua proxima tattoo?';
}
