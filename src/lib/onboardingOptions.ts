export const BUSINESS_TYPES = [
  'Freelance',
  'Studio',
  'Agence',
  'Consultant indépendant',
  'Autre',
] as const

export const COMPANY_SIZES = [
  { value: '1-10', label: '1 à 10 personnes' },
  { value: '11-50', label: '11 à 50 personnes' },
  { value: '51-200', label: '51 à 200 personnes' },
  { value: '201-1000', label: '201 à 1000 personnes' },
  { value: '1000+', label: 'Plus de 1000 personnes' },
] as const

export const BUDGET_RANGES = [
  { value: '<500k', label: 'Moins de 500 000 FCFA' },
  { value: '500k-2M', label: '500 000 – 2 000 000 FCFA' },
  { value: '2M-5M', label: '2 000 000 – 5 000 000 FCFA' },
  { value: '5M-10M', label: '5 000 000 – 10 000 000 FCFA' },
  { value: '10M+', label: 'Plus de 10 000 000 FCFA' },
] as const

export const SECTOR_SUGGESTIONS = [
  'Tech / SaaS',
  'E-commerce',
  'Finance / Banque',
  'Fintech',
  'Immobilier',
  'Éducation',
  'Santé',
  'Média',
  'Restauration',
  'ONG / Associatif',
  'Industrie',
  'Services B2B',
]

export const REGION_SUGGESTIONS = [
  'Sénégal',
  'Côte d’Ivoire',
  'Bénin',
  'Togo',
  'Mali',
  'Burkina Faso',
  'Cameroun',
  'Guinée',
  'Nigeria',
  'France',
  'Autre',
]

export const DECISION_MAKER_ROLES = [
  'Fondateur / CEO',
  'Directeur général',
  'Directeur marketing / CMO',
  'Directeur commercial',
  'Directeur technique / CTO',
  'Chef de projet',
  'Responsable RH',
  'Autre',
]

export const CHANNELS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'referral', label: 'Bouche à oreille' },
  { value: 'website', label: 'Site web / SEO' },
  { value: 'events', label: 'Événements / Networking' },
] as const
