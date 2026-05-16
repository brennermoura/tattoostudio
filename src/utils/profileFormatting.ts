export const PROFILE_BIO_MAX = 500;
export const PROFILE_SLUG_MAX = 40;

export function normalizeProfileBio(value: string, maxLength = PROFILE_BIO_MAX) {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, maxLength);
}

export function normalizeProfileBioForSave(value: string) {
  return normalizeProfileBio(value).trim();
}

export function normalizeProfileSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/[._-]{3,}/g, '-')
    .replace(/^[._-]+/g, '')
    .slice(0, PROFILE_SLUG_MAX);
}
