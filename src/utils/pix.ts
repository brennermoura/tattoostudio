type StaticPixPayloadInput = {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount?: number;
  txid?: string;
  description?: string;
};

function onlyAscii(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

function limit(value: string, maxLength: number) {
  return onlyAscii(value).slice(0, maxLength);
}

function field(id: string, value: string) {
  const size = String(value.length).padStart(2, '0');
  return `${id}${size}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;

  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function normalizeAmount(amount?: number) {
  if (!amount || amount <= 0) return '';
  return amount.toFixed(2);
}

export function buildStaticPixPayload({
  pixKey,
  merchantName,
  merchantCity,
  amount,
  txid = 'TATUAPP',
  description,
}: StaticPixPayloadInput) {
  const cleanPixKey = limit(pixKey, 77);
  if (!cleanPixKey) return '';

  const merchantAccountInfo = [
    field('00', 'br.gov.bcb.pix'),
    field('01', cleanPixKey),
    description ? field('02', limit(description, 72)) : '',
  ].join('');

  const payloadWithoutCrc = [
    field('00', '01'),
    field('26', merchantAccountInfo),
    field('52', '0000'),
    field('53', '986'),
    normalizeAmount(amount) ? field('54', normalizeAmount(amount)) : '',
    field('58', 'BR'),
    field('59', limit(merchantName || 'TATUAPP', 25).toUpperCase()),
    field('60', limit(merchantCity || 'SAO PAULO', 15).toUpperCase()),
    field('62', field('05', limit(txid || 'TATUAPP', 25))),
    '6304',
  ].join('');

  return `${payloadWithoutCrc}${crc16(payloadWithoutCrc)}`;
}

export function parsePixAmount(value: string | number | undefined) {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
