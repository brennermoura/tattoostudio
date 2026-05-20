import { ArtistProfile } from '../types';

export const mockArtist: ArtistProfile = {
  id: '',
  slug: '',
  artisticName: '',
  realName: '',
  avatar: '',
  coverImage: '',
  bio: '',
  instagram: '',
  whatsapp: '',
  addressStreet: '',
  addressNumber: '',
  addressComplement: '',
  neighborhood: '',
  postalCode: '',
  publicNeighborhood: '',
  publicAddressLabel: '',
  city: '',
  state: '',
  latitude: null,
  longitude: null,
  styles: [],
  portfolio: [],
  pixKey: '',
  pixType: 'phone',
  depositValue: 150,
  depositRequired: true,
  availableDays: [],
  customSlots: {},
  workStart: '10:00',
  workEnd: '19:00',
  lunchStart: '13:00',
  lunchEnd: '14:00',
  blockedDates: [],
  appointments: [],
  accentColor: '#a855f7',
  plan: 'active',
  likeCount: 0,
  viewerLiked: false,
};

export const generateTimeSlots = (
  start: string,
  end: string,
  lunchStart: string,
  lunchEnd: string,
  intervalMinutes = 60
): string[] => {
  const slots: string[] = [];
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const [lunchSH, lunchSM] = lunchStart.split(':').map(Number);
  const [lunchEH, lunchEM] = lunchEnd.split(':').map(Number);

  let current = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  const lunchSTotal = lunchSH * 60 + lunchSM;
  const lunchETotal = lunchEH * 60 + lunchEM;

  while (current < endTotal) {
    if (current < lunchSTotal || current >= lunchETotal) {
      const h = Math.floor(current / 60).toString().padStart(2, '0');
      const m = (current % 60).toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
    }
    current += intervalMinutes;
  }

  return slots;
};

export const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const DAY_NAMES_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
