export type TattooStyle =
  | 'Blackwork'
  | 'Fineline'
  | 'Aquarela'
  | 'Realismo'
  | 'Geométrico'
  | 'Old School'
  | 'New School'
  | 'Tribal'
  | 'Japonês'
  | 'Minimalista'
  | 'Neo-Tradicional'
  | 'Pontilhismo';

export interface PortfolioPhoto {
  id: string;
  url: string;
  alt: string;
}

export interface AvailableSlot {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  available: boolean;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  date: string;
  time: string;
  description: string;
  referenceImage?: string;
  pixProof?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  depositPaid: boolean;
  depositRequired?: boolean;
  depositCreditUsed?: boolean;
}

export interface ArtistProfile {
  id: string;
  userId?: string;
  slug: string;
  artisticName: string;
  realName: string;
  avatar: string;
  coverImage: string;
  bio: string;
  instagram: string;
  whatsapp: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  styles: TattooStyle[];
  portfolio: PortfolioPhoto[];
  pixKey: string;
  pixType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  depositValue: number;
  depositRequired?: boolean;
  availableDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  customSlots?: Record<string, string[]>; // day index -> custom HH:MM slots
  workStart: string; // HH:MM
  workEnd: string; // HH:MM
  lunchStart: string;
  lunchEnd: string;
  blockedDates: string[];
  appointments: Appointment[];
  accentColor: string;
  plan: 'active' | 'blocked';
  likeCount: number;
  viewerLiked?: boolean;
}

export interface ArtistAccessStatus {
  hasAccess: boolean;
  accessUntil: string | null;
  lifetime: boolean;
  source: string;
}

export interface ExploreArtist {
  id: string;
  slug: string;
  artisticName: string;
  avatar: string;
  coverImage: string;
  bio: string;
  instagram: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  styles: TattooStyle[];
  accentColor: string;
  createdAt: string;
  likeCount: number;
  featuredImage?: string;
}

export interface AdminArtistAccount {
  artistId: string;
  userId: string;
  email: string;
  slug: string;
  artisticName: string;
  realName: string;
  instagram: string;
  whatsapp: string;
  city: string;
  state: string;
  planStatus: 'active' | 'blocked';
  createdAt: string;
  accessUntil: string | null;
  accessLifetime: boolean;
  accessSource: string;
  latestGrantNote: string;
}

export type AppView =
  | 'landing'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'profile-edit'
  | 'portfolio-edit'
  | 'schedule-config'
  | 'appointments'
  | 'pix-config'
  | 'public-profile'
  | 'booking';
