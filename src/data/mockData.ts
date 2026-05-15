import { ArtistProfile } from '../types';

export const mockArtist: ArtistProfile = {
  id: '1',
  slug: 'brennermoura',
  artisticName: 'Brenner Moura',
  realName: 'Brenner Moura',
  avatar: 'https://images.pexels.com/photos/7908899/pexels-photo-7908899.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=200&w=200',
  coverImage: 'https://images.pexels.com/photos/35742622/pexels-photo-35742622.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
  bio: '🎨 Especialista em Blackwork e Fineline. +8 anos transformando pele em arte. Cada traço com intenção, cada tattoo com história. 📍 São Paulo, SP',
  instagram: '@joaoink.tattoo',
  whatsapp: '11999999999',
  city: 'São Paulo',
  state: 'São Paulo',
  latitude: -23.5505,
  longitude: -46.6333,
  styles: ['Blackwork', 'Fineline', 'Geométrico', 'Minimalista'],
  portfolio: [
    {
      id: '1',
      url: 'https://images.pexels.com/photos/4912590/pexels-photo-4912590.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Blackwork facial tattoo',
    },
    {
      id: '2',
      url: 'https://images.pexels.com/photos/12742814/pexels-photo-12742814.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Blackwork body tattoo',
    },
    {
      id: '3',
      url: 'https://images.pexels.com/photos/3279570/pexels-photo-3279570.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Portrait tattoo art',
    },
    {
      id: '4',
      url: 'https://images.pexels.com/photos/33222631/pexels-photo-33222631.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Traditional blackwork',
    },
    {
      id: '5',
      url: 'https://images.pexels.com/photos/7909089/pexels-photo-7909089.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Fine line tattoo',
    },
    {
      id: '6',
      url: 'https://images.pexels.com/photos/20519275/pexels-photo-20519275.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Tattoo machine work',
    },
  ],
  pixKey: '11999999999',
  pixType: 'phone',
  depositValue: 150,
  depositRequired: true,
  availableDays: [2, 3, 4, 5, 6], // Tue-Sat
  customSlots: {
    2: ['10:00', '15:00'],
    3: ['10:00', '14:00', '17:00'],
    4: ['11:00', '16:00'],
    5: ['10:00', '15:00'],
    6: ['11:00', '14:00'],
  },
  workStart: '10:00',
  workEnd: '19:00',
  lunchStart: '13:00',
  lunchEnd: '14:00',
  blockedDates: [],
  appointments: [
    {
      id: 'a1',
      clientName: 'Maria Fernanda',
      clientPhone: '11988888888',
      clientEmail: 'maria@email.com',
      date: '2025-02-15',
      time: '10:00',
      description: 'Tattoo floral no braço direito, estilo fineline, flores silvestres com folhagens delicadas.',
      status: 'pending',
      createdAt: '2025-02-10T09:30:00',
      depositPaid: true,
      depositRequired: true,
    },
    {
      id: 'a2',
      clientName: 'Pedro Augusto',
      clientPhone: '11977777777',
      clientEmail: 'pedro@email.com',
      date: '2025-02-16',
      time: '14:00',
      description: 'Blackwork geométrico na costela, mandala com traços finos.',
      status: 'approved',
      createdAt: '2025-02-08T14:00:00',
      depositPaid: true,
      depositRequired: true,
    },
    {
      id: 'a3',
      clientName: 'Carla Santos',
      clientPhone: '11966666666',
      clientEmail: 'carla@email.com',
      date: '2025-02-18',
      time: '11:00',
      description: 'Mini tattoo de lua crescente no pulso.',
      status: 'pending',
      createdAt: '2025-02-12T16:00:00',
      depositPaid: false,
      depositRequired: true,
    },
  ],
  accentColor: '#a855f7',
  plan: 'active',
  likeCount: 128,
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
